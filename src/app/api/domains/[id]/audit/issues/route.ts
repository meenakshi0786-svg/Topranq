import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

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
    issues.map((issue) => ({
      ...issue,
      affectedUrls: issue.affectedUrls ? JSON.parse(issue.affectedUrls) : [],
    }))
  );
}
