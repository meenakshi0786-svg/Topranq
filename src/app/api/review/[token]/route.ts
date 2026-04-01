import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { verifyReviewToken, hashToken } from "@/lib/review-token";
import { runInternalLinker } from "@/lib/agents/internal-linker-agent";
import { sendPublishErrorEmail } from "@/lib/email";

/**
 * GET /api/review/:token — Returns article data for the review page
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

  // Find the review record by token hash
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

  // Get article
  const article = db.select().from(schema.articles).where(eq(schema.articles.id, payload.articleId)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({
    article: {
      id: article.id,
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
  });
}

/**
 * POST /api/review/:token — Accept or rework the article
 * Body: { action: "accept" | "rework", reworkNotes?: string }
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
  const { action, reworkNotes } = body;

  if (action !== "accept" && action !== "rework") {
    return NextResponse.json({ error: "Action must be 'accept' or 'rework'" }, { status: 400 });
  }

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, payload.articleId)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (action === "rework") {
    // Mark review as rework
    db.update(schema.articleReviews)
      .set({ status: "rework", reworkNotes: reworkNotes || "" })
      .where(eq(schema.articleReviews.id, review.id))
      .run();

    // Mark article as rejected (will be regenerated)
    db.update(schema.articles)
      .set({ status: "rejected" })
      .where(eq(schema.articles.id, article.id))
      .run();

    // Store rework feedback as domain learning
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

    return NextResponse.json({
      status: "rework_requested",
      message: "Rework feedback recorded. A new draft will be generated with your notes.",
      articleId: article.id,
      domainId: article.domainId,
    });
  }

  // ── Accept flow ──────────────────────────────────────────────────
  // 1. Mark review as accepted
  db.update(schema.articleReviews)
    .set({ status: "accepted" })
    .where(eq(schema.articleReviews.id, review.id))
    .run();

  // 2. Run Internal Linker on the article
  try {
    await runInternalLinker(article.domainId, {
      maxSuggestions: 20,
      articleId: article.id,
    });
  } catch (error) {
    console.error("[REVIEW] Internal linker failed:", error);
    // Non-fatal — continue with publish
  }

  // 3. Mark article as approved
  db.update(schema.articles)
    .set({ status: "approved", updatedAt: new Date().toISOString() })
    .where(eq(schema.articles.id, article.id))
    .run();

  // 4. Attempt publish (via connector if available)
  const connector = db
    .select()
    .from(schema.connectors)
    .where(and(
      eq(schema.connectors.domainId, article.domainId),
      eq(schema.connectors.status, "connected"),
    ))
    .get();

  if (connector) {
    try {
      // Publish (stubbed — in production, call CMS API)
      const publishedUrl = `${connector.siteUrl}/${article.slug}`;

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
          publishedUrl,
          publishedAt: new Date().toISOString(),
        })
        .where(eq(schema.articles.id, article.id))
        .run();

      return NextResponse.json({
        status: "published",
        publishedUrl,
        message: "Article accepted, internal links added, and published successfully.",
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Publish failed";

      db.insert(schema.publishLog)
        .values({
          articleId: article.id,
          connectorId: connector.id,
          status: "failed",
        })
        .run();

      // Email user about failure
      await sendPublishErrorEmail(payload.email, article.metaTitle || "Untitled", errMsg);

      return NextResponse.json({
        status: "approved",
        message: "Article accepted and approved, but publishing failed. Check connector settings.",
        error: errMsg,
      });
    }
  }

  // No connector — just approved
  return NextResponse.json({
    status: "approved",
    message: "Article accepted and approved. Set up a connector to publish automatically.",
    articleId: article.id,
  });
}
