import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";

// GET /api/domains/:id — overview + knowledge graph summary
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, id),
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Latest audit
  const latestAudit = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, id),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  // Page count
  const pageCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.pages)
    .where(eq(schema.pages.domainId, id))
    .get();

  // Issue counts by severity
  const issueCounts = latestAudit
    ? db
        .select({
          severity: schema.auditIssues.severity,
          count: sql<number>`count(*)`,
        })
        .from(schema.auditIssues)
        .where(eq(schema.auditIssues.auditRunId, latestAudit.id))
        .groupBy(schema.auditIssues.severity)
        .all()
    : [];

  // Recent agent actions
  const recentActions = db
    .select()
    .from(schema.agentActions)
    .where(eq(schema.agentActions.domainId, id))
    .orderBy(desc(schema.agentActions.timestamp))
    .limit(10)
    .all();

  // Keyword clusters count
  const clusterCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.keywordClusters)
    .where(eq(schema.keywordClusters.domainId, id))
    .get();

  // Article counts
  const articleCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.articles)
    .where(eq(schema.articles.domainId, id))
    .get();

  const severityMap: Record<string, number> = {};
  for (const row of issueCounts) {
    severityMap[row.severity] = row.count;
  }

  return NextResponse.json({
    domain,
    latestAudit: latestAudit
      ? {
          ...latestAudit,
          scoresJson: latestAudit.scoresJson ? JSON.parse(latestAudit.scoresJson) : null,
        }
      : null,
    stats: {
      pages: pageCount?.count || 0,
      issues: {
        critical: severityMap["critical"] || 0,
        high: severityMap["high"] || 0,
        medium: severityMap["medium"] || 0,
        low: severityMap["low"] || 0,
        total: Object.values(severityMap).reduce((a, b) => a + b, 0),
      },
      keywordClusters: clusterCount?.count || 0,
      articles: articleCount?.count || 0,
    },
    recentActions,
  });
}

// PATCH /api/domains/:id — update domain settings (e.g. language)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, id),
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.language !== undefined) updates.language = body.language;

  if (Object.keys(updates).length > 0) {
    db.update(schema.domains).set(updates).where(eq(schema.domains.id, id)).run();
  }

  const updated = await db.query.domains.findFirst({ where: eq(schema.domains.id, id) });
  return NextResponse.json(updated);
}
