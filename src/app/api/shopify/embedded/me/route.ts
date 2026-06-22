import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest } from "@/lib/shopify-embedded";
import { getShopBillingState } from "@/lib/shopify-billing";

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

  // Article count for this shop's domain (used by the UI).
  const articleCount = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, billing.domainId))
    .all().length;

  return NextResponse.json({
    shop: claims.shop,
    domainId: billing.domainId,
    plan: billing.plan,
    articleCount,
    creditsRemaining: billing.creditsRemaining,
    creditsAllowance: billing.creditsAllowance,
    trialDaysRemaining: billing.trialDaysRemaining,
    upgradeUrl: billing.upgradeUrl,
  });
}
