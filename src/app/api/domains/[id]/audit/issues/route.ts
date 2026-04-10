import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getRecommendation } from "@/lib/recommender";

// GET /api/domains/:id/audit/issues — issue list, severity filter, fix status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const severity = searchParams.get("severity");
  const status = searchParams.get("status");

  // Get latest audit run for this domain
  const latestRun = await db.query.auditRuns.findFirst({
    where: eq(schema.auditRuns.domainId, id),
    orderBy: desc(schema.auditRuns.createdAt),
  });

  if (!latestRun) {
    return NextResponse.json([]);
  }

  const conditions = [eq(schema.auditIssues.auditRunId, latestRun.id)];

  if (severity) {
    conditions.push(
      eq(schema.auditIssues.severity, severity as "critical" | "high" | "medium" | "low")
    );
  }
  if (status) {
    conditions.push(
      eq(schema.auditIssues.status, status as "open" | "fixed" | "ignored")
    );
  }

  const issues = db
    .select()
    .from(schema.auditIssues)
    .where(and(...conditions))
    .all();

  return NextResponse.json(
    issues.map((issue) => {
      const rec = getRecommendation(issue.issueType || "");
      return {
        ...issue,
        affectedUrls: issue.affectedUrls ? JSON.parse(issue.affectedUrls) : [],
        whyItMatters: rec?.whyItMatters || null,
        howToFixDetailed: rec?.howToFix || null,
        learnMoreUrl: rec?.learnMoreUrl || null,
      };
    })
  );
}

// PATCH /api/domains/:id/audit/issues — Update issue status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // consume params
  const { issueId, status } = await request.json();

  if (!issueId || !status || !["open", "fixed", "ignored"].includes(status)) {
    return NextResponse.json({ error: "issueId and valid status (open/fixed/ignored) required" }, { status: 400 });
  }

  db.update(schema.auditIssues)
    .set({
      status,
      resolvedAt: status === "fixed" ? new Date().toISOString() : null,
    })
    .where(eq(schema.auditIssues.id, issueId))
    .run();

  return NextResponse.json({ success: true, issueId, status });
}
