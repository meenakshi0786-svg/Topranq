import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getRawSessionToken, resolveOfflineToken } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";
import { fetchShopName } from "@/lib/shopify";

// GET /api/shopify/embedded/me
// Authenticated by the App Bridge session token (Authorization: Bearer <jwt>).
// Returns the shop's provisioned account + current billing state so the embedded
// UI can render plan, remaining credits, trial, and the upgrade link.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) {
    return NextResponse.json({ error: "Invalid or missing session token" }, { status: 401 });
  }

  // Syncs the plan from Shopify (managed pricing) and computes period-scoped credits.
  const billing = await getShopBillingState(claims.shop);

  // Store display name: cached on users.name after the first lookup. The account
  // is provisioned with the domain as the name, so "still looks like a domain"
  // means we haven't fetched the real name yet.
  const user = db.select().from(schema.users).where(eq(schema.users.id, billing.userId)).get();
  let storeName = user?.name || null;
  if (!storeName || storeName.includes(".myshopify.com")) {
    const token = await resolveOfflineToken(claims.shop, getRawSessionToken(request));
    const real = token ? await fetchShopName(claims.shop, token) : null;
    if (real) {
      db.update(schema.users).set({ name: real }).where(eq(schema.users.id, billing.userId)).run();
      storeName = real;
    }
  }
  if (!storeName || storeName.includes(".myshopify.com")) {
    // Fallback: prettify the domain handle (Title Case, no dashes).
    storeName = claims.shop
      .replace(".myshopify.com", "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Article count for this shop's domain (used by the UI).
  const articleCount = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, billing.domainId))
    .all().length;

  return NextResponse.json({
    shop: claims.shop,
    storeName,
    domainId: billing.domainId,
    plan: billing.plan,
    articleCount,
    creditsRemaining: billing.creditsRemaining,
    creditsAllowance: billing.creditsAllowance,
    trialDaysRemaining: billing.trialDaysRemaining,
    upgradeUrl: billing.upgradeUrl,
    periodEnd: billing.periodEnd,
  });
}
