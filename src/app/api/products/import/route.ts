import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";

/**
 * POST /api/products/import — Import products from CSV data
 * Body: { domainId, products: Array<{ name, url, price, description, category }> }
 */
export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const { domainId, products } = body;

  if (!domainId || !products || !Array.isArray(products)) {
    return NextResponse.json({ error: "Missing domainId or products array" }, { status: 400 });
  }

  // Verify domain ownership
  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, domainId),
  });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Clear existing products for this domain
  db.delete(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, domainId))
    .run();

  // Insert new products
  let imported = 0;
  for (const p of products) {
    if (!p.name) continue;
    db.insert(schema.storeProducts)
      .values({
        domainId,
        name: p.name,
        url: p.url || null,
        price: p.price || null,
        description: p.description || null,
        category: p.category || null,
      })
      .run();
    imported++;
  }

  return NextResponse.json({ imported, total: products.length });
}

/**
 * GET /api/products/import?domainId=xxx — Get stored products for a domain
 */
export async function GET(request: NextRequest) {
  const user = await getOrCreateUser();
  const domainId = request.nextUrl.searchParams.get("domainId");

  if (!domainId) {
    return NextResponse.json({ error: "Missing domainId" }, { status: 400 });
  }

  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, domainId),
  });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const products = db
    .select()
    .from(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, domainId))
    .all();

  return NextResponse.json(products);
}
