import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";
import { runVisibilityScan, VISIBILITY_SCAN_CREDITS } from "@/lib/visibility/run";

// POST /api/domains/:id/visibility/run — run a credit-metered visibility scan
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();

  const domain = await db.query.domains.findFirst({ where: eq(schema.domains.id, id) });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Credit check (same pattern as article generation)
  const plan = user.plan as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const usedCredits = db
    .select({ total: sql<number>`COALESCE(SUM(credits_used), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, user.id))
    .get();
  const remaining = limits.credits - (usedCredits?.total || 0);

  if (remaining < VISIBILITY_SCAN_CREDITS) {
    return NextResponse.json(
      { error: `Insufficient credits. Need ${VISIBILITY_SCAN_CREDITS}, have ${Math.max(0, Math.floor(remaining))}.` },
      { status: 402 },
    );
  }

  // Guard against concurrent scans for the same domain.
  const inFlight = db
    .select()
    .from(schema.visibilityRuns)
    .where(eq(schema.visibilityRuns.domainId, id))
    .all()
    .find((r) => r.status === "running");
  if (inFlight) {
    return NextResponse.json({ error: "A scan is already running for this domain." }, { status: 409 });
  }

  try {
    const summary = await runVisibilityScan(id, domain.domainUrl);

    // Deduct credits only after a successful scan.
    db.insert(schema.creditLedger)
      .values({
        userId: user.id,
        action: "visibility_scan",
        creditsUsed: VISIBILITY_SCAN_CREDITS,
        balanceAfter: remaining - VISIBILITY_SCAN_CREDITS,
        agent: "visibility",
      })
      .run();

    db.insert(schema.agentActions)
      .values({
        domainId: id,
        agentName: "visibility",
        actionType: "scan",
        inputSummary: `${summary.promptCount} prompts × ${summary.engines.length} engines`,
        outputSummary: `AI Visibility Score ${summary.overallScore} (mention ${summary.mentionRate}%, citation ${summary.citationRate}%)`,
        qualityGatePassed: true,
        creditsUsed: VISIBILITY_SCAN_CREDITS,
      })
      .run();

    return NextResponse.json(summary);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Visibility scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
