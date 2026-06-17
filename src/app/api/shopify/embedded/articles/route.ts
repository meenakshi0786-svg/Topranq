import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";

// GET /api/shopify/embedded/articles — recent articles for the shop's domain
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);

  const rows = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, domainId))
    .orderBy(desc(schema.articles.createdAt))
    .limit(20)
    .all();

  return NextResponse.json(
    rows.map((a) => ({
      id: a.id,
      title: a.h1 || a.metaTitle || "Untitled",
      status: a.status,
      publishedUrl: a.publishedUrl,
      createdAt: a.createdAt,
    })),
  );
}
