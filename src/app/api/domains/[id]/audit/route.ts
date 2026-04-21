import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";

// GET /api/domains/:id/audit — results
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const latestRun = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, id),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  if (!latestRun) {
    return NextResponse.json({ error: "No audit found" }, { status: 404 });
  }

  // Get issue counts
  const issueCounts = db
    .select({
      severity: schema.auditIssues.severity,
      count: sql<number>`count(*)`,
    })
    .from(schema.auditIssues)
    .where(eq(schema.auditIssues.auditRunId, latestRun.id))
    .groupBy(schema.auditIssues.severity)
    .all();

  const severityMap: Record<string, number> = {};
  for (const row of issueCounts) {
    severityMap[row.severity] = row.count;
  }

  return NextResponse.json({
    ...latestRun,
    scoresJson: latestRun.scoresJson ? JSON.parse(latestRun.scoresJson) : null,
    issueCounts: {
      critical: severityMap["critical"] || 0,
      high: severityMap["high"] || 0,
      medium: severityMap["medium"] || 0,
      low: severityMap["low"] || 0,
      total: Object.values(severityMap).reduce((a, b) => a + b, 0),
    },
  });
}

// POST /api/domains/:id/audit — trigger new audit
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { runPipeline } = await import("@/lib/agents/orchestrator");

  const auditRunId = crypto.randomUUID();
  db.insert(schema.auditRuns)
    .values({
      id: auditRunId,
      domainId: id,
      status: "queued",
      maxPages: 50,
      agentVersion: "1.0.0",
    })
    .run();

  runPipeline(id, auditRunId).catch(console.error);

  return NextResponse.json({ auditRunId, status: "queued" });
}
