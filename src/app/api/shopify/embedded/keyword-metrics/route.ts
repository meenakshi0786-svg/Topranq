import { NextRequest, NextResponse } from "next/server";
import { getShopFromRequest } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { keywordMetrics } from "@/lib/dataforseo";

const KEYWORD_METRICS_CREDITS = 3;

// POST /api/shopify/embedded/keyword-metrics
// Body: { keywords: string[], location?: string, language?: string }
// Returns real volume / difficulty / CPC / top competitor + People Also Ask.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const keywords: string[] = Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === "string") : [];
  if (!keywords.length) return NextResponse.json({ error: "No keywords provided" }, { status: 400 });

  const { userId, creditsRemaining } = await getShopBillingState(claims.shop);
  if (creditsRemaining < KEYWORD_METRICS_CREDITS) {
    return NextResponse.json(
      { error: `Fetching keyword metrics needs ${KEYWORD_METRICS_CREDITS} credits (you have ${creditsRemaining}). Upgrade your plan.` },
      { status: 402 },
    );
  }

  try {
    const result = await keywordMetrics(
      keywords.slice(0, 100),
      typeof body.location === "string" ? body.location : "United States",
      typeof body.language === "string" ? body.language : "English",
    );

    const { db, schema } = await import("@/lib/db");
    db.insert(schema.creditLedger)
      .values({
        userId,
        action: "keyword_metrics",
        creditsUsed: KEYWORD_METRICS_CREDITS,
        balanceAfter: creditsRemaining - KEYWORD_METRICS_CREDITS,
        agent: "shopify_embedded",
      })
      .run();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Keyword metrics failed" },
      { status: 500 },
    );
  }
}
