import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getShopFromRequest } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { runInternalLinker, INTERNAL_LINKER_CREDITS } from "@/lib/agents/internal-linker-agent";

// POST /api/shopify/embedded/internal-links — suggest internal links across the store's pages.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { userId, domainId, creditsRemaining } = await getShopBillingState(claims.shop);

  if (creditsRemaining < INTERNAL_LINKER_CREDITS) {
    return NextResponse.json(
      { error: `Internal linking needs ${INTERNAL_LINKER_CREDITS} credits (you have ${creditsRemaining}). Upgrade your plan.` },
      { status: 402 },
    );
  }

  try {
    const output = await runInternalLinker(domainId, { maxSuggestions: 20 });

    db.insert(schema.creditLedger)
      .values({
        userId,
        action: "internal_linker",
        creditsUsed: INTERNAL_LINKER_CREDITS,
        balanceAfter: creditsRemaining - INTERNAL_LINKER_CREDITS,
        agent: "shopify_embedded",
      })
      .run();

    return NextResponse.json({
      stats: output.stats,
      suggestions: output.suggestions.slice(0, 25).map((s) => ({
        sourceTitle: s.sourceTitle,
        targetTitle: s.targetTitle,
        anchorText: s.anchorText,
        reason: s.reason,
        priority: s.priority,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal linking failed" },
      { status: 500 },
    );
  }
}
