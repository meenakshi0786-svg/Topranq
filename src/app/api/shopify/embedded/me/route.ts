import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";

// GET /api/shopify/embedded/me
// Authenticated by the App Bridge session token (Authorization: Bearer <jwt>).
// Returns the shop's provisioned account so the embedded UI can render.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) {
    return NextResponse.json({ error: "Invalid or missing session token" }, { status: 401 });
  }

  const { userId, domainId } = getOrCreateShopAccount(claims.shop);
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

  // Article count for this shop's domain (used by the UI).
  const articleCount = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, domainId))
    .all().length;

  return NextResponse.json({
    shop: claims.shop,
    domainId,
    plan: user?.plan || "free",
    articleCount,
  });
}
