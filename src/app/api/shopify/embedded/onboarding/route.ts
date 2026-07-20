import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getRawSessionToken, getOrCreateShopAccount, resolveOfflineToken } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { syncShopCatalog } from "@/app/api/shopify/embedded/sync/route";

// Free: the wizard is the acquisition funnel. With a 5-credit free tier, charging
// here would kill the flow before the plan reveal — the paywall lives at Execute
// (article generation) instead, after the merchant has seen the full value.
const ONBOARDING_KEYWORDS_CREDITS = 0;

// ── Step 1: sync ──────────────────────────────────────────────────────
// POST /api/shopify/embedded/onboarding?step=sync
// Pulls products + collections so later steps have a catalog to reason about.
async function stepSync(request: NextRequest, shop: string, domainId: string) {
  const token = await resolveOfflineToken(shop, getRawSessionToken(request));
  if (!token) return NextResponse.json({ error: "Store not connected — reinstall the app." }, { status: 400 });
  const counts = await syncShopCatalog(shop, domainId, token);
  return NextResponse.json(counts);
}

// ── Step 2: competitors ───────────────────────────────────────────────
// Finds who ranks for the store's own catalog themes, via Serper SERPs.
async function stepCompetitors(domainId: string) {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return NextResponse.json({ error: "SERPER_API_KEY is not set" }, { status: 500 });

  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
  if (!domain) return NextResponse.json({ error: "Store not provisioned" }, { status: 404 });

  const products = db.select().from(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).all();
  const collections = db.select().from(schema.storeCollections).where(eq(schema.storeCollections.domainId, domainId)).all();

  // Seed queries from the catalog; fall back to the store name if empty.
  const seeds = [
    ...collections.slice(0, 4).map((c) => c.title),
    ...products.slice(0, 4).map((p) => p.name),
  ].filter(Boolean).slice(0, 6);

  // No catalog = nothing meaningful to research. Searching the store's own
  // handle just surfaces unrelated sites (news, gov, etc.) and would poison the
  // keyword step, so bail out honestly instead.
  if (!seeds.length) {
    return NextResponse.json({
      competitors: [],
      seedsUsed: [],
      emptyCatalog: true,
      message: "Add products or collections to your store so we can find your real competitors.",
    });
  }

  const ownHost = new URL(domain.domainUrl).hostname.replace("www.", "");
  const tally = new Map<string, { domain: string; hits: number; titles: string[] }>();

  await Promise.all(
    seeds.map(async (q) => {
      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q, num: 10 }),
        });
        if (!res.ok) return;
        const serp = await res.json();
        for (const o of (serp.organic || []) as Array<{ title: string; link: string }>) {
          try {
            const host = new URL(o.link).hostname.replace("www.", "");
            if (host === ownHost || host.endsWith("myshopify.com")) continue;
            // Skip marketplaces/aggregators — not useful as SEO competitors.
            if (/amazon\.|ebay\.|walmart\.|etsy\.|pinterest\.|youtube\.|reddit\.|wikipedia\./.test(host)) continue;
            const cur = tally.get(host) || { domain: host, hits: 0, titles: [] };
            cur.hits++;
            if (cur.titles.length < 3) cur.titles.push(o.title);
            tally.set(host, cur);
          } catch { /* bad url */ }
        }
      } catch { /* best effort per seed */ }
    }),
  );

  const competitors = [...tally.values()].sort((a, b) => b.hits - a.hits).slice(0, 6);
  return NextResponse.json({ competitors, seedsUsed: seeds });
}

// ── Step 3: keywords ──────────────────────────────────────────────────
// Opus proposes ~50 high-intent commercial keywords from catalog + competitors.
async function stepKeywords(shop: string, domainId: string, competitors: string[]) {
  const { userId, creditsRemaining } = await getShopBillingState(shop);
  if (ONBOARDING_KEYWORDS_CREDITS > 0 && creditsRemaining < ONBOARDING_KEYWORDS_CREDITS) {
    return NextResponse.json(
      { error: `Keyword research needs ${ONBOARDING_KEYWORDS_CREDITS} credits (you have ${creditsRemaining}). Upgrade your plan.` },
      { status: 402 },
    );
  }

  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
  if (!domain) return NextResponse.json({ error: "Store not provisioned" }, { status: 404 });

  const products = db.select().from(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).all();
  const collections = db.select().from(schema.storeCollections).where(eq(schema.storeCollections.domainId, domainId)).all();

  // Guard: with no catalog the model has nothing to ground on and will invent a
  // fictional store. Refuse rather than return confidently wrong keywords.
  if (!products.length && !collections.length) {
    return NextResponse.json(
      {
        error: "Add some products or collections to your store first — we build your keyword plan from your real catalog.",
        emptyCatalog: true,
      },
      { status: 400 },
    );
  }

  const productList = products.slice(0, 40).map((p) => `- ${p.name}${p.price ? ` ($${p.price})` : ""}`).join("\n") || "(none synced)";
  const collectionList = collections.slice(0, 20).map((c) => `- ${c.title}`).join("\n") || "(none synced)";
  const compList = competitors.length ? competitors.map((c) => `- ${c}`).join("\n") : "(none identified)";

  const prompt = `You are an expert e-commerce SEO strategist. Propose the keyword targets for a Shopify store.

STORE: ${domain.domainUrl}

PRODUCT CATALOG:
${productList}

COLLECTIONS:
${collectionList}

TOP ORGANIC COMPETITORS:
${compList}

TASK: Produce exactly 50 HIGH-INTENT COMMERCIAL keywords this store should target to win page-1 rankings and drive sales. Base them on the actual catalog, collections, and what these competitors compete on.

REQUIREMENTS:
- Commercial/transactional intent dominant (buying-oriented), with some high-intent informational (buying guides, comparisons, "best X for Y")
- Realistic search demand in the market — no invented or zero-demand phrases
- Specific long-tail over vague head terms
- NO competitor brand names, NO this store's own brand name
- Each keyword must plausibly map to a product or collection above

Return STRICT JSON array only (no markdown, no fences, no prose):
[
  { "keyword": "phrase", "intent": "commercial", "rationale": "maps to <product/collection>" }
]

RULES:
- Exactly 50 objects
- intent is one of: commercial, transactional, informational
- rationale is max 60 chars, naming the product/collection it targets`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 500 });

  const models = [
    process.env.OPENROUTER_MODEL_OPUS,
    process.env.OPENROUTER_MODEL_SONNET,
    "anthropic/claude-sonnet-4.5",
    "google/gemini-2.5-flash",
  ].filter(Boolean) as string[];

  let content = "";
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text.length > 100) { content = text; break; }
    } catch { /* try next model */ }
  }
  if (!content) return NextResponse.json({ error: "Keyword research failed — AI unavailable" }, { status: 500 });

  // Tolerant JSON extraction (models sometimes wrap in fences/prose).
  let parsed: Array<{ keyword?: string; intent?: string; rationale?: string }> = [];
  try {
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    parsed = JSON.parse(start >= 0 && end > start ? content.slice(start, end + 1) : content);
  } catch {
    return NextResponse.json({ error: "Keyword research returned an unreadable response" }, { status: 500 });
  }

  const seen = new Set<string>();
  const keywords = (Array.isArray(parsed) ? parsed : [])
    .filter((k) => typeof k.keyword === "string" && k.keyword.trim().length > 2)
    .map((k) => ({
      keyword: k.keyword!.trim(),
      intent: ["commercial", "transactional", "informational"].includes(String(k.intent)) ? String(k.intent) : "commercial",
      rationale: typeof k.rationale === "string" ? k.rationale.slice(0, 60) : "",
    }))
    .filter((k) => { const key = k.keyword.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, 50);

  if (ONBOARDING_KEYWORDS_CREDITS > 0) {
    db.insert(schema.creditLedger)
      .values({
        userId,
        action: "onboarding_keywords",
        creditsUsed: ONBOARDING_KEYWORDS_CREDITS,
        balanceAfter: creditsRemaining - ONBOARDING_KEYWORDS_CREDITS,
        agent: "shopify_embedded",
      })
      .run();
  }

  return NextResponse.json({ keywords, productCount: products.length, collectionCount: collections.length });
}

// POST /api/shopify/embedded/onboarding?step=sync|competitors|keywords
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);
  const step = request.nextUrl.searchParams.get("step") || "sync";

  try {
    if (step === "sync") return await stepSync(request, claims.shop, domainId);
    if (step === "competitors") return await stepCompetitors(domainId);
    if (step === "keywords") {
      const body = await request.json().catch(() => ({}));
      const competitors: string[] = Array.isArray(body.competitors)
        ? body.competitors.filter((c: unknown) => typeof c === "string")
        : [];
      return await stepKeywords(claims.shop, domainId, competitors);
    }
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding step failed" },
      { status: 500 },
    );
  }
}
