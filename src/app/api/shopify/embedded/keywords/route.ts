import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { discoverKeywords, discoverCompetitorKeywords } from "@/lib/keyword-discovery";

const KEYWORD_DISCOVERY_CREDITS = 2;

// GET /api/shopify/embedded/keywords — most recent discovered keywords for the shop.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);

  const saved = db
    .select()
    .from(schema.discoveredKeywords)
    .where(eq(schema.discoveredKeywords.domainId, domainId))
    .orderBy(desc(schema.discoveredKeywords.createdAt))
    .all();

  const latestRunId = saved[0]?.runId || null;
  const keywords = saved
    .filter((k) => k.runId === latestRunId)
    .slice(0, 40)
    .map((k) => ({
      keyword: k.keyword,
      difficulty: k.difficulty,
      intent: k.intent,
      relevancyScore: k.relevancyScore,
    }));

  return NextResponse.json({ keywords, cost: KEYWORD_DISCOVERY_CREDITS });
}

// POST /api/shopify/embedded/keywords — discover keyword opportunities for the store.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { userId, domainId, creditsRemaining } = await getShopBillingState(claims.shop);

  if (creditsRemaining < KEYWORD_DISCOVERY_CREDITS) {
    return NextResponse.json(
      { error: `Keyword discovery needs ${KEYWORD_DISCOVERY_CREDITS} credits (you have ${creditsRemaining}). Upgrade your plan.` },
      { status: 402 },
    );
  }

  // Optional: mine a specific competitor domain instead of general discovery.
  const body = await request.json().catch(() => ({}));
  const competitorDomain = (body.competitorDomain || "").trim();

  try {
    const keywords = competitorDomain
      ? await discoverCompetitorKeywords(domainId, competitorDomain)
      : await discoverKeywords(domainId);
    const runId = `run_${crypto.randomUUID()}`;

    for (const kw of keywords) {
      db.insert(schema.discoveredKeywords)
        .values({
          domainId,
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

    db.insert(schema.creditLedger)
      .values({
        userId,
        action: "keyword_discovery",
        creditsUsed: KEYWORD_DISCOVERY_CREDITS,
        balanceAfter: creditsRemaining - KEYWORD_DISCOVERY_CREDITS,
        agent: "shopify_embedded",
      })
      .run();

    return NextResponse.json({
      keywords: keywords.slice(0, 40).map((k) => ({
        keyword: k.keyword,
        difficulty: k.difficulty,
        intent: k.intent,
        relevancyScore: k.relevancyScore,
      })),
      saved: keywords.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Keyword discovery failed" },
      { status: 500 },
    );
  }
}
