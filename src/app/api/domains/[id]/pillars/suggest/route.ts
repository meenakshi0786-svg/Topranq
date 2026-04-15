import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { suggestPillarsFromGSC } from "@/lib/pillars";

/**
 * GET /api/domains/:id/pillars/suggest
 * Returns 3 Claude-generated pillar-topic suggestions based on the domain's GSC queries.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, id)).get();
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const rows = db
    .select()
    .from(schema.searchConsoleData)
    .where(eq(schema.searchConsoleData.domainId, id))
    .all();

  const products = db
    .select({ name: schema.storeProducts.name, category: schema.storeProducts.category })
    .from(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, id))
    .all();

  if (rows.length === 0 && products.length === 0) {
    return NextResponse.json(
      { error: "Connect Google Search Console or import a product catalog first" },
      { status: 400 },
    );
  }

  // Aggregate GSC rows by query (they're stored per-day)
  const byQuery = new Map<
    string,
    { query: string; impressions: number; clicks: number; position: number; n: number }
  >();
  for (const r of rows) {
    if (!r.query) continue;
    const prev = byQuery.get(r.query);
    if (prev) {
      prev.impressions += r.impressions || 0;
      prev.clicks += r.clicks || 0;
      prev.position = (prev.position * prev.n + (r.avgPosition || 0)) / (prev.n + 1);
      prev.n += 1;
    } else {
      byQuery.set(r.query, {
        query: r.query,
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        position: r.avgPosition || 0,
        n: 1,
      });
    }
  }
  const queries = Array.from(byQuery.values());

  try {
    const suggestions = await suggestPillarsFromGSC(domain.domainUrl, queries, products);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[pillars/suggest] failed:", err);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
