import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";
import { runBlogWriter, BLOG_WRITER_CREDITS, type BlogWriterConfig } from "@/lib/agents/blog-writer-agent";
import { runInternalLinker, INTERNAL_LINKER_CREDITS, type InternalLinkerConfig } from "@/lib/agents/internal-linker-agent";
import { runProductInfuser, PRODUCT_INFUSER_CREDITS, type ProductInfuserConfig } from "@/lib/agents/product-infuser-agent";
import { createReviewToken } from "@/lib/review-token";
import { sendReviewEmail } from "@/lib/email";

const AGENT_CREDITS: Record<string, number> = {
  blog_writer: BLOG_WRITER_CREDITS,
  internal_linker: INTERNAL_LINKER_CREDITS,
  product_infuser: PRODUCT_INFUSER_CREDITS,
};

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const { domainId, agentType, config } = body;

  if (!domainId || !agentType || !config) {
    return NextResponse.json({ error: "Missing domainId, agentType, or config" }, { status: 400 });
  }

  // Validate agent type
  const creditCost = AGENT_CREDITS[agentType];
  if (creditCost === undefined) {
    return NextResponse.json({ error: `Unknown agent type: ${agentType}` }, { status: 400 });
  }

  // Check domain ownership
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, domainId),
  });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Check credit balance
  const plan = user.plan as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const usedCredits = db
    .select({ total: sql<number>`COALESCE(SUM(credits_used), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, user.id))
    .get();
  const remaining = limits.credits - (usedCredits?.total || 0);

  if (remaining < creditCost) {
    return NextResponse.json(
      { error: `Insufficient credits. Need ${creditCost}, have ${Math.max(0, Math.floor(remaining))}.` },
      { status: 402 }
    );
  }

  // Create job record
  const jobId = crypto.randomUUID();
  db.insert(schema.agentJobs)
    .values({
      id: jobId,
      domainId,
      userId: user.id,
      agentType,
      status: "running",
      configJson: JSON.stringify(config),
    })
    .run();

  try {
    let output: unknown;

    // ── Blog Writer: generate → review email flow ─────────────────
    if (agentType === "blog_writer") {
      const blogConfig = config as BlogWriterConfig;
      const blogOutput = await runBlogWriter(domainId, blogConfig);

      // Update article to "review" status
      db.update(schema.articles)
        .set({ status: "review" })
        .where(eq(schema.articles.id, blogOutput.articleId))
        .run();

      // Create review token
      const { token, tokenHash, expiresAt } = createReviewToken(
        blogOutput.articleId,
        blogOutput.qualityChecks ? 0 : 0,
        user.email,
      );

      // Store review record
      db.insert(schema.articleReviews)
        .values({
          articleId: blogOutput.articleId,
          revision: 0,
          status: "pending",
          reviewerEmail: user.email,
          tokenHash,
          expiresAt,
        })
        .run();

      // Send review email
      const previewText = blogOutput.bodyMarkdown
        .replace(/^#.+$/gm, "")
        .replace(/[*_`]/g, "")
        .trim()
        .slice(0, 300);

      await sendReviewEmail({
        to: user.email,
        articleTitle: blogOutput.title,
        targetKeyword: blogConfig.keywords[0] || blogConfig.topic,
        intent: blogConfig.intent || "informational",
        wordCount: blogOutput.estimatedWordCount,
        qualityScore: blogOutput.qualityChecks.overallScore,
        previewText,
        reviewToken: token,
      });

      output = {
        ...blogOutput,
        reviewEmailSent: true,
        reviewUrl: `/review/${token}`,
      };
    }
    // ── Internal Linker ───────────────────────────────────────────
    else if (agentType === "internal_linker") {
      output = await runInternalLinker(domainId, config as InternalLinkerConfig);
    }
    // ── Product Infuser ───────────────────────────────────────────
    else if (agentType === "product_infuser") {
      output = await runProductInfuser(domainId, config as ProductInfuserConfig);
    }

    // Deduct credits
    db.insert(schema.creditLedger)
      .values({
        userId: user.id,
        action: agentType,
        creditsUsed: creditCost,
        balanceAfter: remaining - creditCost,
        agent: agentType,
      })
      .run();

    // Log agent action
    db.insert(schema.agentActions)
      .values({
        domainId,
        agentName: agentType,
        actionType: "deploy",
        inputSummary: JSON.stringify(config).slice(0, 500),
        outputSummary: JSON.stringify(output).slice(0, 1000),
        qualityGatePassed: true,
        creditsUsed: creditCost,
      })
      .run();

    // Update job
    db.update(schema.agentJobs)
      .set({
        status: "complete",
        outputJson: JSON.stringify(output),
        creditsUsed: creditCost,
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.agentJobs.id, jobId))
      .run();

    return NextResponse.json({ jobId, status: "complete", output, creditsUsed: creditCost });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Agent execution failed";

    db.update(schema.agentJobs)
      .set({ status: "failed", errorMessage: errorMsg })
      .where(eq(schema.agentJobs.id, jobId))
      .run();

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
