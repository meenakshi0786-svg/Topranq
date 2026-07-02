import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { runVisibilityScan, VISIBILITY_SCAN_CREDITS } from "@/lib/visibility/run";

// GET /api/shopify/embedded/visibility — latest completed scan score for the shop.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);

  const latest = db
    .select()
    .from(schema.visibilityRuns)
    .where(eq(schema.visibilityRuns.domainId, domainId))
    .orderBy(desc(schema.visibilityRuns.startedAt))
    .all()
    .find((r) => r.status === "complete");

  if (!latest) return NextResponse.json({ status: "none", cost: VISIBILITY_SCAN_CREDITS });

  return NextResponse.json({
    status: "complete",
    overallScore: latest.overallScore,
    promptCount: latest.promptCount,
    engines: latest.engines ? JSON.parse(latest.engines) : [],
    completedAt: latest.completedAt,
    cost: VISIBILITY_SCAN_CREDITS,
  });
}

// POST /api/shopify/embedded/visibility — run a credit-metered AI visibility scan.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { userId, domainId, creditsRemaining } = await getShopBillingState(claims.shop);

  if (creditsRemaining < VISIBILITY_SCAN_CREDITS) {
    return NextResponse.json(
      { error: `An AI visibility scan needs ${VISIBILITY_SCAN_CREDITS} credits (you have ${creditsRemaining}). Upgrade your plan to run it.` },
      { status: 402 },
    );
  }

  // Guard against concurrent scans.
  const inFlight = db
    .select()
    .from(schema.visibilityRuns)
    .where(eq(schema.visibilityRuns.domainId, domainId))
    .all()
    .find((r) => r.status === "running");
  if (inFlight) {
    return NextResponse.json({ error: "A scan is already running. Please wait for it to finish." }, { status: 409 });
  }

  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
  if (!domain) return NextResponse.json({ error: "Store not provisioned" }, { status: 404 });

  try {
    const summary = await runVisibilityScan(domainId, domain.domainUrl);

    // Deduct credits only after a successful scan.
    db.insert(schema.creditLedger)
      .values({
        userId,
        action: "visibility_scan",
        creditsUsed: VISIBILITY_SCAN_CREDITS,
        balanceAfter: creditsRemaining - VISIBILITY_SCAN_CREDITS,
        agent: "shopify_embedded",
      })
      .run();

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visibility scan failed" },
      { status: 500 },
    );
  }
}
