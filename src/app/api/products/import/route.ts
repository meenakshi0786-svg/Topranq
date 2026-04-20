import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";

/**
 * POST /api/products/import — Import products from CSV data
 * Body: { domainId, products: Array<{ name, url, price, description, category, imageUrl }> }
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

  // Insert new products — skip entries without a name or with broken data
  let imported = 0;
  let skipped = 0;
  for (const p of products) {
    if (!p.name || p.name.length < 3) { skipped++; continue; }
    // Validate URL — skip products with null/empty URLs (they cause broken links in articles)
    const url = p.url && p.url.length > 3 ? p.url : null;
    db.insert(schema.storeProducts)
      .values({
        domainId,
        name: p.name.slice(0, 200),
        url,
        price: p.price || null,
        description: p.description ? p.description.slice(0, 500) : null,
        category: p.category || null,
        imageUrl: p.imageUrl || null,
      })
      .run();
    imported++;
  }

  return NextResponse.json({ imported, skipped, total: products.length });
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
