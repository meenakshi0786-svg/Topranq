import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";
import { runBlogWriter, BLOG_WRITER_CREDITS, type BlogWriterConfig } from "@/lib/agents/blog-writer-agent";
import { createReviewToken } from "@/lib/review-token";
import { sendReviewEmail } from "@/lib/email";

/**
 * POST /api/articles/generate
 * Creates a blog draft, stores it, creates a review record, and sends a review email.
 */
export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const { domainId, topic, keywords, tone, wordCount, intent, audience, competitorUrls, productContext, reworkNotes, previousArticleId } = body;

  if (!domainId || !topic) {
    return NextResponse.json({ error: "Missing domainId or topic" }, { status: 400 });
  }

  // Check domain ownership
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, domainId),
  });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Check credits
  const plan = user.plan as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const usedCredits = db
    .select({ total: sql<number>`COALESCE(SUM(credits_used), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, user.id))
    .get();
  const remaining = limits.credits - (usedCredits?.total || 0);

  if (remaining < BLOG_WRITER_CREDITS) {
    return NextResponse.json(
      { error: `Insufficient credits. Need ${BLOG_WRITER_CREDITS}, have ${Math.max(0, Math.floor(remaining))}.` },
      { status: 402 },
    );
  }

  // Build config
  const config: BlogWriterConfig = {
    topic,
    keywords: Array.isArray(keywords) ? keywords : (keywords || topic).split(",").map((k: string) => k.trim()).filter(Boolean),
    tone: tone || "professional",
    wordCount: wordCount || 1500,
    intent: intent || "informational",
    audience: audience || "general",
    competitorUrls: competitorUrls || [],
    productContext: productContext || undefined,
    reworkNotes: reworkNotes || undefined,
  };

  try {
    // If rework, mark previous article as rejected
    if (previousArticleId && reworkNotes) {
      db.update(schema.articles)
        .set({ status: "rejected" })
        .where(eq(schema.articles.id, previousArticleId))
        .run();
    }

    // Generate the article
    const output = await runBlogWriter(domainId, config);

    // Update article status to review
    db.update(schema.articles)
      .set({ status: "review" })
      .where(eq(schema.articles.id, output.articleId))
      .run();

    // Deduct credits
    db.insert(schema.creditLedger)
      .values({
        userId: user.id,
        action: "blog_writer",
        creditsUsed: BLOG_WRITER_CREDITS,
        balanceAfter: remaining - BLOG_WRITER_CREDITS,
        agent: "blog_writer",
      })
      .run();

    // Create review token
    const revision = reworkNotes ? (output.qualityChecks.overallScore > 0 ? 1 : 0) : 0;
    const { token, tokenHash, expiresAt } = createReviewToken(
      output.articleId,
      revision,
      user.email,
    );

    // Store review record
    db.insert(schema.articleReviews)
      .values({
        articleId: output.articleId,
        revision,
        status: "pending",
        reviewerEmail: user.email,
        tokenHash,
        expiresAt,
      })
      .run();

    // Send review email
    const previewText = output.bodyMarkdown
      .replace(/^#.+$/gm, "")
      .replace(/[*_`]/g, "")
      .trim()
      .slice(0, 300);

    await sendReviewEmail({
      to: user.email,
      articleTitle: output.title,
      targetKeyword: config.keywords[0] || topic,
      intent: config.intent || "informational",
      wordCount: output.estimatedWordCount,
      qualityScore: output.qualityChecks.overallScore,
      previewText,
      reviewToken: token,
    });

    // Log agent action
    db.insert(schema.agentActions)
      .values({
        domainId,
        agentName: "blog_writer",
        actionType: reworkNotes ? "rework" : "generate",
        inputSummary: JSON.stringify({ topic, keywords: config.keywords, tone }).slice(0, 500),
        outputSummary: `Article "${output.title}" (${output.estimatedWordCount} words, score ${output.qualityChecks.overallScore})`,
        qualityGatePassed: true,
        creditsUsed: BLOG_WRITER_CREDITS,
      })
      .run();

    // Create agent job record for tracking
    const jobId = crypto.randomUUID();
    db.insert(schema.agentJobs)
      .values({
        id: jobId,
        domainId,
        userId: user.id,
        agentType: "blog_writer",
        status: "complete",
        configJson: JSON.stringify(config),
        outputJson: JSON.stringify(output),
        creditsUsed: BLOG_WRITER_CREDITS,
        completedAt: new Date().toISOString(),
      })
      .run();

    return NextResponse.json({
      articleId: output.articleId,
      title: output.title,
      slug: output.slug,
      qualityScore: output.qualityChecks.overallScore,
      wordCount: output.estimatedWordCount,
      reviewEmailSent: true,
      reviewUrl: `/review/${token}`,
      jobId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
