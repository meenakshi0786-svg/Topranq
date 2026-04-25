import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { CrawlerAgent } from "./crawler-agent";
import { AuditorAgent } from "./auditor-agent";

const PLAN_LIMITS = {
  free: { credits: 100, pages: 25, articles: 3, domains: 20, model: "sonnet" },
  dollar1: { credits: 100, pages: 25, articles: 10, domains: 5, model: "sonnet" },
  dollar5: { credits: 200, pages: 50, articles: 10, domains: 5, model: "opus" },
  // Legacy plans
  starter: { credits: 25, pages: 100, articles: 10, domains: 1, model: "sonnet" },
  growth: { credits: 75, pages: 500, articles: 30, domains: 3, model: "sonnet" },
  agency: { credits: 250, pages: 2000, articles: 100, domains: 10, model: "opus" },
};

export type PipelineStep = "crawl" | "audit" | "strategy" | "techseo";

interface PipelineStepConfig {
  agent: PipelineStep;
  dependsOn: PipelineStep | null;
  credits: number;
}

// Pipeline: crawler → auditor (→ strategist → techseo in future)
const PIPELINE: PipelineStepConfig[] = [
  { agent: "crawl", dependsOn: null, credits: 0 },
  { agent: "audit", dependsOn: "crawl", credits: 1 },
  // { agent: "strategy", dependsOn: "audit", credits: 2 },
  // { agent: "techseo", dependsOn: "audit", credits: 0.5 },
];

export async function runPipeline(domainId: string, auditRunId: string) {
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, domainId),
  });
  if (!domain) throw new Error("Domain not found");

  // Get user's plan limits
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, domain.userId),
  });
  const plan = user?.plan || "free";
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

  // Get audit run for max pages
  const auditRun = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.id, auditRunId),
  });
  const maxPages = Math.min(auditRun?.maxPages || 25, limits.pages);

  try {
    // Step 1: Crawl
    const crawler = new CrawlerAgent();
    const crawlResult = await crawler.run(domainId, { auditRunId, maxPages });

    if (crawlResult.status !== "success") {
      db.update(schema.auditRuns)
        .set({ status: "failed", errorMessage: crawlResult.errors?.join("; ") || "Crawl failed" })
        .where(eq(schema.auditRuns.id, auditRunId))
        .run();
      return;
    }

    // Step 2: Audit
    const auditor = new AuditorAgent();
    const auditResult = await auditor.run(domainId, {
      auditRunId,
      crawlOutput: crawlResult.output,
    });

    if (auditResult.status !== "success") {
      // Retry once with feedback
      const retryResult = await auditor.run(domainId, {
        auditRunId,
        crawlOutput: crawlResult.output,
      });

      if (retryResult.status !== "success") {
        db.update(schema.auditRuns)
          .set({ status: "failed", errorMessage: retryResult.errors?.join("; ") || "Audit failed" })
          .where(eq(schema.auditRuns.id, auditRunId))
          .run();
      }
    }

    // Log orchestrator action
    db.insert(schema.agentActions)
      .values({
        domainId,
        agentName: "orchestrator",
        actionType: "pipeline_run",
        inputSummary: `Audit run ${auditRunId}`,
        outputSummary: `Pipeline complete. Crawled ${(crawlResult.output as Record<string, unknown>)?.pagesCrawled || 0} pages.`,
        qualityGatePassed: true,
        creditsUsed: (crawlResult.creditsUsed || 0) + (auditResult.creditsUsed || 0),
      })
      .run();
  } catch (error) {
    db.update(schema.auditRuns)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Pipeline failed",
      })
      .where(eq(schema.auditRuns.id, auditRunId))
      .run();
  }
}

export { PLAN_LIMITS };
