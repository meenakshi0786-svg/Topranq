import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { runPipeline, PLAN_LIMITS } from "@/lib/agents/orchestrator";

// POST /api/domains/:id/crawl — trigger crawl
export async function POST(
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

  // Use the domain owner's plan to set the page limit
  const owner = await db.query.users.findFirst({ where: eq(schema.users.id, domain.userId) });
  const plan = (owner?.plan || "free") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const auditRunId = crypto.randomUUID();
  db.insert(schema.auditRuns)
    .values({
      id: auditRunId,
      domainId: id,
      status: "queued",
      maxPages: limits.pages,
      agentVersion: "1.0.0",
    })
    .run();

  runPipeline(id, auditRunId).catch((err) => {
    console.error(`Pipeline failed for domain ${id}:`, err);
  });

  return NextResponse.json({ auditRunId, status: "queued" });
}

// GET /api/domains/:id/crawl/status — progress
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
    return NextResponse.json({ error: "No crawl found" }, { status: 404 });
  }

  return NextResponse.json({
    status: latestRun.status,
    pagesFound: latestRun.pagesFound,
    pagesCrawled: latestRun.pagesCrawled,
  });
}
