import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { computeScore } from "@/lib/visibility/score";

// GET /api/domains/:id/visibility — latest run score, per-prompt detail, history, prompts
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();

  const domain = await db.query.domains.findFirst({ where: eq(schema.domains.id, id) });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const prompts = db
    .select()
    .from(schema.visibilityPrompts)
    .where(eq(schema.visibilityPrompts.domainId, id))
    .all();

  const runs = db
    .select()
    .from(schema.visibilityRuns)
    .where(eq(schema.visibilityRuns.domainId, id))
    .orderBy(desc(schema.visibilityRuns.startedAt))
    .all();

  const latestComplete = runs.find((r) => r.status === "complete");

  let latest = null;
  if (latestComplete) {
    const rows = db
      .select()
      .from(schema.visibilityResults)
      .where(eq(schema.visibilityResults.runId, latestComplete.id))
      .all();

    const parsed = rows.map((r) => ({
      engine: r.engine,
      mentioned: r.mentioned,
      cited: r.cited,
      competitors: r.competitors ? (JSON.parse(r.competitors) as string[]) : [],
    }));
    const score = computeScore(parsed, latestComplete.promptCount || prompts.length);

    // Per-prompt matrix: prompt → { engine: {mentioned,cited} }
    const byPrompt = new Map<string, { promptText: string; engines: Record<string, { mentioned: boolean; cited: boolean }> }>();
    for (const r of rows) {
      if (!byPrompt.has(r.promptId)) byPrompt.set(r.promptId, { promptText: r.promptText, engines: {} });
      byPrompt.get(r.promptId)!.engines[r.engine] = { mentioned: r.mentioned, cited: r.cited };
    }

    latest = {
      runId: latestComplete.id,
      startedAt: latestComplete.startedAt,
      ...score,
      perPrompt: [...byPrompt.values()],
    };
  }

  const history = runs
    .filter((r) => r.status === "complete")
    .map((r) => ({ runId: r.id, startedAt: r.startedAt, overallScore: r.overallScore }))
    .reverse();

  return NextResponse.json({
    prompts: prompts.map((p) => ({ id: p.id, text: p.text, source: p.source, active: p.active })),
    latest,
    history,
    runningRun: runs.find((r) => r.status === "running") || null,
  });
}
