import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import { suggestPillarsFromGSC } from "@/lib/pillars";
import { fetchSearchAnalytics, fetchSiteList } from "@/lib/gsc";

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

  let rows = db
    .select()
    .from(schema.searchConsoleData)
    .where(eq(schema.searchConsoleData.domainId, id))
    .all();

  const products = db
    .select({ name: schema.storeProducts.name, category: schema.storeProducts.category })
    .from(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, id))
    .all();

  // If GSC is connected but we haven't pulled data yet (or it was emptied),
  // fetch it now from Google so the Generate button "just works".
  if (rows.length === 0) {
    rows = await tryFetchGscOnDemand(id, domain.domainUrl);
  }

  if (rows.length === 0 && products.length === 0) {
    // Distinguish "no connection" from "connected but no accessible property"
    const hasConnection = !!db
      .select()
      .from(schema.domainLearnings)
      .where(
        and(
          eq(schema.domainLearnings.domainId, id),
          eq(schema.domainLearnings.learningType, "gsc_connection"),
        ),
      )
      .get();
    const msg = hasConnection
      ? "The connected Google account has no Search Console property matching this domain (or lacks access to query it). Reconnect with an account that owns the property, or import a product catalog."
      : "Connect Google Search Console or import a product catalog first";
    return NextResponse.json({ error: msg }, { status: 400 });
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

/**
 * Fetch GSC search analytics live and persist rows for this domain.
 * Returns the freshly-inserted rows (or empty if no connection / fetch fails).
 *
 * Strategy: GSC exposes multiple property types per site (domain property,
 * https://, https://www., http://). The saved `sites` array may include
 * properties the Google user can't actually query; we re-pull the live list
 * (which is filtered to queryable permission levels) and try candidates
 * that match the target hostname until one succeeds.
 */
async function tryFetchGscOnDemand(domainId: string, domainUrl: string) {
  const connection = db
    .select()
    .from(schema.domainLearnings)
    .where(
      and(
        eq(schema.domainLearnings.domainId, domainId),
        eq(schema.domainLearnings.learningType, "gsc_connection"),
      ),
    )
    .orderBy(desc(schema.domainLearnings.createdAt))
    .get();
  if (!connection?.insight) return [];

  let conn: { refreshToken: string };
  try { conn = JSON.parse(connection.insight); } catch { return []; }
  if (!conn.refreshToken) return [];

  let liveSites: string[] = [];
  try { liveSites = await fetchSiteList(conn.refreshToken); } catch { /* fall through */ }
  if (liveSites.length === 0) return [];

  const host = (() => { try { return new URL(domainUrl).hostname.replace(/^www\./, ""); } catch { return domainUrl; } })();
  // Rank candidates: domain properties first (widest coverage), then host-prefix matches.
  const candidates = liveSites
    .filter((s) => s.includes(host))
    .sort((a, b) => {
      const aDomain = a.startsWith("sc-domain:");
      const bDomain = b.startsWith("sc-domain:");
      if (aDomain !== bDomain) return aDomain ? -1 : 1;
      return 0;
    });
  if (candidates.length === 0) return [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  for (const siteUrl of candidates) {
    try {
      const queryData = await fetchSearchAnalytics(conn.refreshToken, siteUrl, {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["query", "page"],
        rowLimit: 1000,
      });
      for (const row of queryData) {
        db.insert(schema.searchConsoleData)
          .values({
            domainId,
            pageUrl: row.page,
            query: row.query,
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: row.ctr,
            avgPosition: row.position,
            date: fmt(endDate),
          })
          .run();
      }
      return db
        .select()
        .from(schema.searchConsoleData)
        .where(eq(schema.searchConsoleData.domainId, domainId))
        .all();
    } catch (err) {
      console.warn(`[pillars/suggest] site ${siteUrl} failed, trying next:`, (err as Error).message);
      continue;
    }
  }
  return [];
}
