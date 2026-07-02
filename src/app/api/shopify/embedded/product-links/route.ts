import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getShopFromRequest, getRawSessionToken, resolveOfflineToken } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { fetchStoreProducts } from "@/lib/shopify";
import { runProductInfuser, PRODUCT_INFUSER_CREDITS } from "@/lib/agents/product-infuser-agent";

// POST /api/shopify/embedded/product-links — weave real store products into existing articles.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { userId, domainId, creditsRemaining } = await getShopBillingState(claims.shop);

  if (creditsRemaining < PRODUCT_INFUSER_CREDITS) {
    return NextResponse.json(
      { error: `Product infusion needs ${PRODUCT_INFUSER_CREDITS} credits (you have ${creditsRemaining}). Upgrade your plan.` },
      { status: 402 },
    );
  }

  // Pull the store's products via the Admin API.
  const token = await resolveOfflineToken(claims.shop, getRawSessionToken(request));
  if (!token) return NextResponse.json({ error: "Store not connected — reinstall the app." }, { status: 400 });

  const raw = await fetchStoreProducts(claims.shop, token, 30);
  if (!raw.length) {
    return NextResponse.json({ error: "No products found in your store to link to." }, { status: 400 });
  }
  const products = raw.map((p) => ({
    name: p.title,
    url: p.url,
    price: p.price || "",
    description: p.description || "",
    category: "",
  }));

  try {
    const output = await runProductInfuser(domainId, { products });

    db.insert(schema.creditLedger)
      .values({
        userId,
        action: "product_infuser",
        creditsUsed: PRODUCT_INFUSER_CREDITS,
        balanceAfter: creditsRemaining - PRODUCT_INFUSER_CREDITS,
        agent: "shopify_embedded",
      })
      .run();

    return NextResponse.json({ stats: output.stats, articleDetails: output.articleDetails.slice(0, 25) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product infusion failed" },
      { status: 500 },
    );
  }
}
