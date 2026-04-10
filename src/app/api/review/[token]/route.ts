import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { verifyReviewToken, hashToken } from "@/lib/review-token";
import { runInternalLinker } from "@/lib/agents/internal-linker-agent";
import { runBlogWriter } from "@/lib/agents/blog-writer-agent";
import { sendPublishErrorEmail, sendReviewEmail } from "@/lib/email";
import { createReviewToken } from "@/lib/review-token";

/**
 * GET /api/review/:token — Returns article data + available connectors
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = verifyReviewToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired review link" }, { status: 401 });
  }

  const tokenH = hashToken(token);
  const review = db
    .select()
    .from(schema.articleReviews)
    .where(and(
      eq(schema.articleReviews.tokenHash, tokenH),
      eq(schema.articleReviews.articleId, payload.articleId),
    ))
    .get();

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.status !== "pending") {
    return NextResponse.json({ error: `This review has already been ${review.status}` }, { status: 410 });
  }

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, payload.articleId)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Get available connectors for this domain
  const connectors = db
    .select()
    .from(schema.connectors)
    .where(eq(schema.connectors.domainId, article.domainId))
    .all()
    .map((c) => ({ id: c.id, platform: c.platform, siteUrl: c.siteUrl, status: c.status }));

  return NextResponse.json({
    article: {
      id: article.id,
      domainId: article.domainId,
      title: article.metaTitle,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      slug: article.slug,
      h1: article.h1,
      bodyMarkdown: article.bodyMarkdown,
      bodyHtml: article.bodyHtml,
      targetKeyword: article.targetKeyword,
      intent: article.intent,
      audience: article.audience,
      tone: article.tone,
      qualityScore: article.qualityScore,
      readabilityScore: article.readabilityScore,
      wordCount: article.bodyMarkdown?.split(/\s+/).length || 0,
      faqSchema: article.faqSchemaJson ? JSON.parse(article.faqSchemaJson) : null,
      imageSuggestions: article.imageSuggestionsJson ? JSON.parse(article.imageSuggestionsJson) : null,
      internalLinks: article.internalLinksJson ? JSON.parse(article.internalLinksJson) : null,
      schemaJsonLd: article.schemaJsonLd ? JSON.parse(article.schemaJsonLd) : null,
      revisionCount: article.revisionCount,
      status: article.status,
    },
    review: {
      id: review.id,
      revision: review.revision,
      status: review.status,
      expiresAt: review.expiresAt,
    },
    connectors,
  });
}

/**
 * POST /api/review/:token — Accept, rework, or publish
 * Body: { action: "accept" | "rework", reworkNotes?: string, publishTo?: string (connector ID), publishPlatform?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = verifyReviewToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired review link" }, { status: 401 });
  }

  const tokenH = hashToken(token);
  const review = db
    .select()
    .from(schema.articleReviews)
    .where(and(
      eq(schema.articleReviews.tokenHash, tokenH),
      eq(schema.articleReviews.articleId, payload.articleId),
    ))
    .get();

  if (!review || review.status !== "pending") {
    return NextResponse.json({ error: "Review already used or not found" }, { status: 410 });
  }

  const body = await request.json();
  const { action, reworkNotes, publishTo } = body;

  if (action !== "accept" && action !== "rework") {
    return NextResponse.json({ error: "Action must be 'accept' or 'rework'" }, { status: 400 });
  }

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, payload.articleId)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // ══════════════════════════════════════════════════════════════════
  // REWORK: Regenerate article with Claude using feedback
  // ══════════════════════════════════════════════════════════════════
  if (action === "rework") {
    db.update(schema.articleReviews)
      .set({ status: "rework", reworkNotes: reworkNotes || "" })
      .where(eq(schema.articleReviews.id, review.id))
      .run();

    db.update(schema.articles)
      .set({ status: "rejected" })
      .where(eq(schema.articles.id, article.id))
      .run();

    if (reworkNotes) {
      db.insert(schema.domainLearnings)
        .values({
          domainId: article.domainId,
          learningType: "article_rework",
          insight: `Rework requested for "${article.metaTitle}": ${reworkNotes}`,
          dataSource: "reviewer",
          confidence: 1.0,
        })
        .run();
    }

    // Auto-regenerate with Claude using the rework feedback
    try {
      const newOutput = await runBlogWriter(article.domainId, {
        topic: article.targetKeyword || article.metaTitle || "article",
        keywords: article.targetKeyword ? [article.targetKeyword] : [],
        tone: (article.tone as "professional" | "casual" | "technical") || "professional",
        wordCount: article.bodyMarkdown?.split(/\s+/).length || 1500,
        intent: article.intent || "informational",
        audience: article.audience || "general",
        reworkNotes: reworkNotes || "",
      });

      // Update article status to review
      db.update(schema.articles)
        .set({ status: "review" })
        .where(eq(schema.articles.id, newOutput.articleId))
        .run();

      // Create new review token
      const { token: newToken, tokenHash: newHash, expiresAt } = createReviewToken(
        newOutput.articleId, (article.revisionCount || 0) + 1, payload.email,
      );

      db.insert(schema.articleReviews)
        .values({
          articleId: newOutput.articleId,
          revision: (article.revisionCount || 0) + 1,
          status: "pending",
          reviewerEmail: payload.email,
          tokenHash: newHash,
          expiresAt,
        })
        .run();

      // Send new review email
      await sendReviewEmail({
        to: payload.email,
        articleTitle: newOutput.title,
        targetKeyword: article.targetKeyword || "",
        intent: article.intent || "informational",
        wordCount: newOutput.estimatedWordCount,
        qualityScore: newOutput.qualityChecks.overallScore,
        previewText: newOutput.bodyMarkdown.replace(/^#.+$/gm, "").replace(/[*_`]/g, "").trim().slice(0, 300),
        reviewToken: newToken,
      });

      return NextResponse.json({
        status: "rework_regenerated",
        message: `Article regenerated with your feedback. A new review email has been sent to ${payload.email}.`,
        newArticleId: newOutput.articleId,
      });
    } catch (err) {
      return NextResponse.json({
        status: "rework_requested",
        message: `Rework feedback saved. Auto-regeneration failed: ${err instanceof Error ? err.message : "unknown error"}. You can regenerate manually from the Blog Writer.`,
        articleId: article.id,
        domainId: article.domainId,
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // ACCEPT: Approve + publish to selected CMS
  // ══════════════════════════════════════════════════════════════════

  // Mark review as accepted
  db.update(schema.articleReviews)
    .set({ status: "accepted" })
    .where(eq(schema.articleReviews.id, review.id))
    .run();

  // Run Internal Linker on the article
  try {
    await runInternalLinker(article.domainId, {
      maxSuggestions: 20,
      articleId: article.id,
    });
  } catch (error) {
    console.error("[REVIEW] Internal linker failed:", error);
  }

  // Mark article as approved
  db.update(schema.articles)
    .set({ status: "approved", updatedAt: new Date().toISOString() })
    .where(eq(schema.articles.id, article.id))
    .run();

  // Re-read article (may have been updated by internal linker)
  const updatedArticle = db.select().from(schema.articles).where(eq(schema.articles.id, article.id)).get();

  // Find connector to publish to
  let connector;
  if (publishTo) {
    connector = db.select().from(schema.connectors).where(eq(schema.connectors.id, publishTo)).get();
  }
  if (!connector) {
    connector = db.select().from(schema.connectors)
      .where(and(eq(schema.connectors.domainId, article.domainId), eq(schema.connectors.status, "connected")))
      .get();
  }

  if (!connector) {
    return NextResponse.json({
      status: "approved",
      message: "Article approved! No CMS connector found — connect WordPress, Shopify, or Webflow from Connectors page to publish automatically.",
      articleId: article.id,
    });
  }

  // Publish to CMS
  try {
    const publishResult = await publishToCMS(connector, updatedArticle || article);

    db.insert(schema.publishLog)
      .values({
        articleId: article.id,
        connectorId: connector.id,
        status: "success",
        publishedAt: new Date().toISOString(),
      })
      .run();

    db.update(schema.articles)
      .set({
        status: "published",
        publishedUrl: publishResult.url,
        publishedAt: new Date().toISOString(),
      })
      .where(eq(schema.articles.id, article.id))
      .run();

    return NextResponse.json({
      status: "published",
      publishedUrl: publishResult.url,
      platform: connector.platform,
      message: `Article published to ${connector.platform} successfully!`,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Publish failed";

    db.insert(schema.publishLog)
      .values({ articleId: article.id, connectorId: connector.id, status: "failed" })
      .run();

    await sendPublishErrorEmail(payload.email, article.metaTitle || "Untitled", errMsg);

    return NextResponse.json({
      status: "approved",
      message: `Article approved but publishing to ${connector.platform} failed: ${errMsg}`,
      error: errMsg,
    });
  }
}

// ── CMS Publishing ───────────────────────────────────────────────────

interface PublishResult { url: string; id?: string }

async function publishToCMS(
  connector: { platform: string | null; siteUrl: string | null; authCredentialsEncrypted: string | null },
  article: { slug: string | null; metaTitle: string | null; bodyHtml: string | null; bodyMarkdown: string | null; metaDescription: string | null; faqSchemaJson: string | null; targetKeyword: string | null },
): Promise<PublishResult> {
  const siteUrl = (connector.siteUrl || "").replace(/\/$/, "");
  const slug = article.slug || "untitled";

  switch (connector.platform) {
    case "shopify": {
      const token = connector.authCredentialsEncrypted;
      if (!token) throw new Error("Shopify API token not configured. Go to Connectors to add your token.");

      // Get the store domain for API calls
      const storeDomain = siteUrl.includes("myshopify.com")
        ? siteUrl.replace(/^https?:\/\//, "")
        : siteUrl.replace(/^https?:\/\//, "") + ".myshopify.com";

      // 1. Get blog ID (use first blog)
      const blogsRes = await fetch(`https://${storeDomain}/admin/api/2024-01/blogs.json`, {
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      });

      if (!blogsRes.ok) throw new Error(`Shopify API error: ${blogsRes.status}. Check your API token.`);

      const blogsData = await blogsRes.json();
      const blogId = blogsData.blogs?.[0]?.id;
      if (!blogId) throw new Error("No blog found in your Shopify store. Create a blog first in Shopify admin.");

      // 2. Create the article
      const articleRes = await fetch(`https://${storeDomain}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            title: article.metaTitle || "Untitled",
            body_html: article.bodyHtml || article.bodyMarkdown || "",
            author: "Ranqapex",
            tags: article.targetKeyword || "seo",
            published: true,
            summary_html: article.metaDescription || "",
            handle: slug,
          },
        }),
      });

      if (!articleRes.ok) {
        const errData = await articleRes.text();
        throw new Error(`Shopify publish failed: ${articleRes.status} ${errData}`);
      }

      const articleData = await articleRes.json();
      const handle = articleData.article?.handle || slug;
      const blogHandle = blogsData.blogs[0]?.handle || "news";
      return {
        url: `https://${storeDomain}/blogs/${blogHandle}/${handle}`,
        id: String(articleData.article?.id || ""),
      };
    }

    case "wordpress": {
      const wpApiUrl = `${siteUrl}/wp-json/wp/v2/posts`;
      const res = await fetch(wpApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.metaTitle || "Untitled",
          content: article.bodyHtml || article.bodyMarkdown || "",
          slug,
          status: "draft",
          excerpt: article.metaDescription || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { url: data.link || `${siteUrl}/${slug}`, id: String(data.id) };
      }
      return { url: `${siteUrl}/${slug}` };
    }

    case "webhook": {
      const res = await fetch(siteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "article_publish",
          title: article.metaTitle,
          slug,
          content: article.bodyHtml || article.bodyMarkdown,
          markdown: article.bodyMarkdown,
          metaDescription: article.metaDescription,
          faqSchema: article.faqSchemaJson ? JSON.parse(article.faqSchemaJson) : null,
          publishedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      return { url: `${siteUrl}/${slug}` };
    }

    default:
      return { url: `${siteUrl}/blog/${slug}` };
  }
}
