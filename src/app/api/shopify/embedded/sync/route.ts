import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getRawSessionToken, getOrCreateShopAccount, resolveOfflineToken } from "@/lib/shopify-embedded";
import { fetchStoreProducts, fetchStoreCollections } from "@/lib/shopify";

// GET /api/shopify/embedded/sync — current sync status (counts).
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);
  const products = db.select().from(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).all().length;
  const collections = db.select().from(schema.storeCollections).where(eq(schema.storeCollections.domainId, domainId)).all().length;
  return NextResponse.json({ products, collections });
}

// POST /api/shopify/embedded/sync — pull products + collections from Shopify into Ranqapex.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const { domainId } = getOrCreateShopAccount(claims.shop);
  const token = await resolveOfflineToken(claims.shop, getRawSessionToken(request));
  if (!token) return NextResponse.json({ error: "Store not connected — reinstall the app." }, { status: 400 });

  const result = await syncShopCatalog(claims.shop, domainId, token);
  return NextResponse.json(result);
}

/**
 * Sync a shop's products + collections into the storeProducts/storeCollections
 * tables. Idempotent — replaces prior rows. Safe to call on install or on demand.
 */
export async function syncShopCatalog(
  shop: string,
  domainId: string,
  token: string,
): Promise<{ products: number; collections: number }> {
  const [products, collections] = await Promise.all([
    fetchStoreProducts(shop, token, 100),
    fetchStoreCollections(shop, token, 100),
  ]);

  db.delete(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).run();
  for (const p of products) {
    if (!p.title || p.title.length < 2) continue;
    db.insert(schema.storeProducts)
      .values({
        domainId,
        name: p.title.slice(0, 200),
        url: p.url && p.url.length > 3 ? p.url : null,
        price: p.price || null,
        description: p.description ? p.description.slice(0, 500) : null,
      })
      .run();
  }

  db.delete(schema.storeCollections).where(eq(schema.storeCollections.domainId, domainId)).run();
  for (const c of collections) {
    if (!c.title) continue;
    db.insert(schema.storeCollections)
      .values({
        domainId,
        title: c.title.slice(0, 200),
        handle: c.handle || null,
        url: c.url || null,
        description: c.description || null,
        productCount: c.productCount,
      })
      .run();
  }

  return { products: products.length, collections: collections.length };
}
