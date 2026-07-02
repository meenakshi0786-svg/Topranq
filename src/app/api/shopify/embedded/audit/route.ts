import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";

// GET /api/shopify/embedded/audit — latest audit run + issue counts for the shop.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);

  const latestRun = db
    .select()
    .from(schema.auditRuns)
    .where(eq(schema.auditRuns.domainId, domainId))
    .orderBy(desc(schema.auditRuns.createdAt))
    .get();

  if (!latestRun) return NextResponse.json({ status: "none" });

  const issueCounts = db
    .select({ severity: schema.auditIssues.severity, count: sql<number>`count(*)` })
    .from(schema.auditIssues)
    .where(eq(schema.auditIssues.auditRunId, latestRun.id))
    .groupBy(schema.auditIssues.severity)
    .all();
  const sev: Record<string, number> = {};
  for (const row of issueCounts) sev[row.severity] = row.count;

  // Top issues to show inline (most severe first).
  const topIssues = db
    .select({
      issueType: schema.auditIssues.issueType,
      severity: schema.auditIssues.severity,
      description: schema.auditIssues.description,
      recommendation: schema.auditIssues.recommendation,
    })
    .from(schema.auditIssues)
    .where(eq(schema.auditIssues.auditRunId, latestRun.id))
    .all()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 8);

  return NextResponse.json({
    status: latestRun.status,
    overallScore: latestRun.overallScore,
    scores: latestRun.scoresJson ? JSON.parse(latestRun.scoresJson) : null,
    pagesCrawled: latestRun.pagesCrawled,
    pagesFound: latestRun.pagesFound,
    completedAt: latestRun.completedAt,
    errorMessage: latestRun.errorMessage,
    issueCounts: {
      critical: sev["critical"] || 0,
      high: sev["high"] || 0,
      medium: sev["medium"] || 0,
      low: sev["low"] || 0,
      total: Object.values(sev).reduce((a, b) => a + b, 0),
    },
    topIssues,
  });
}

// POST /api/shopify/embedded/audit — trigger a new SEO audit of the store.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId, plan } = await getShopBillingState(claims.shop);

  // Don't stack audits: if one is already running, just report it.
  const running = db
    .select()
    .from(schema.auditRuns)
    .where(eq(schema.auditRuns.domainId, domainId))
    .orderBy(desc(schema.auditRuns.createdAt))
    .get();
  if (running && ["queued", "crawling", "analyzing"].includes(running.status)) {
    return NextResponse.json({ auditRunId: running.id, status: running.status });
  }

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const auditRunId = crypto.randomUUID();
  db.insert(schema.auditRuns)
    .values({ id: auditRunId, domainId, status: "queued", maxPages: limits.pages, agentVersion: "1.0.0" })
    .run();

  const { runPipeline } = await import("@/lib/agents/orchestrator");
  runPipeline(domainId, auditRunId).catch(console.error);

  return NextResponse.json({ auditRunId, status: "queued" });
}

function severityRank(s: string): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s] ?? 0;
}
