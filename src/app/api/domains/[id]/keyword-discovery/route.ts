import { NextRequest, NextResponse } from "next/server";
import { discoverKeywords } from "@/lib/keyword-discovery";
import { getOrCreateUser, isRealUser, isAdmin, isPaidUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET /api/domains/:id/keyword-discovery — get saved keywords from previous runs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!isRealUser(user.email)) {
    return NextResponse.json({ error: "Please sign in to use the Keyword Planner." }, { status: 401 });
  }

  const { id } = await params;

  // Load all saved keywords for this domain, grouped by run
  const saved = db.select().from(schema.discoveredKeywords)
    .where(eq(schema.discoveredKeywords.domainId, id))
    .orderBy(desc(schema.discoveredKeywords.createdAt))
    .all();

  // Group by runId
  const runs = new Map<string, typeof saved>();
  for (const kw of saved) {
    const list = runs.get(kw.runId) || [];
    list.push(kw);
    runs.set(kw.runId, list);
  }

  const runIds = [...runs.keys()];
  const latestRunId = runIds[0] || null;

  // Format for frontend
  const keywords = saved.map(kw => ({
    keyword: kw.keyword,
    difficulty: kw.difficulty as "Low" | "Medium" | "High",
    intent: kw.intent,
    relevancyScore: kw.relevancyScore,
    source: kw.source,
    sourceDetail: kw.sourceDetail,
    competitorUrl: kw.competitorUrl,
    runId: kw.runId,
    isLatestRun: kw.runId === latestRunId,
  }));

  return NextResponse.json({ keywords, latestRunId, totalRuns: runIds.length });
}

// POST /api/domains/:id/keyword-discovery — run new discovery, save results
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!isRealUser(user.email)) {
    return NextResponse.json({ error: "Please sign in to use the Keyword Planner." }, { status: 401 });
  }

  const { id } = await params;

  // Free users get only 1 discovery run per domain. Paid users + admins are unlimited.
  if (!isAdmin(user.email) && !isPaidUser(user)) {
    const existingRuns = db
      .select({ runId: schema.discoveredKeywords.runId })
      .from(schema.discoveredKeywords)
      .where(eq(schema.discoveredKeywords.domainId, id))
      .all();
    const uniqueRuns = new Set(existingRuns.map(r => r.runId));
    if (uniqueRuns.size >= 1) {
      return NextResponse.json(
        { error: "Free plan allows 1 keyword discovery run per domain. Upgrade to rediscover keywords." },
        { status: 403 }
      );
    }
  }

  try {
    const keywords = await discoverKeywords(id);
    const runId = `run_${Date.now()}`;

    // Save to DB
    for (const kw of keywords) {
      db.insert(schema.discoveredKeywords)
        .values({
          domainId: id,
          keyword: kw.keyword,
          difficulty: kw.difficulty,
          intent: kw.intent,
          relevancyScore: kw.relevancyScore,
          source: kw.source,
          sourceDetail: kw.sourceDetail || null,
          competitorUrl: kw.competitorUrl || null,
          runId,
        })
        .run();
    }

    return NextResponse.json({
      keywords: keywords.map(kw => ({
        ...kw,
        runId,
        isLatestRun: true,
      })),
      runId,
      saved: keywords.length,
    });
  } catch (error) {
    console.error("[keyword-discovery] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
