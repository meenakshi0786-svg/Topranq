import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";

// GET /api/domains/:id/analytics — rankings, traffic by page, content ROI
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get search console data for rankings
  const gscData = db
    .select()
    .from(schema.searchConsoleData)
    .where(eq(schema.searchConsoleData.domainId, id))
    .all();

  if (gscData.length === 0) {
    return NextResponse.json(null);
  }

  // Rankings: aggregate by query
  const queryMap = new Map<string, { clicks: number; impressions: number; positionSum: number; count: number; page: string }>();
  for (const row of gscData) {
    if (!row.query) continue;
    const existing = queryMap.get(row.query) || { clicks: 0, impressions: 0, positionSum: 0, count: 0, page: "" };
    existing.clicks += row.clicks || 0;
    existing.impressions += row.impressions || 0;
    existing.positionSum += (row.avgPosition || 0);
    existing.count += 1;
    if (!existing.page && row.pageUrl) existing.page = row.pageUrl;
    queryMap.set(row.query, existing);
  }

  const rankings = Array.from(queryMap.entries())
    .map(([query, d]) => ({
      query,
      position: d.count > 0 ? d.positionSum / d.count : 0,
      clicks: d.clicks,
      impressions: d.impressions,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
      page: d.page,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 100);

  // Traffic by page: aggregate by URL
  const pageMap = new Map<string, { clicks: number; impressions: number; positionSum: number; count: number }>();
  for (const row of gscData) {
    if (!row.pageUrl) continue;
    const existing = pageMap.get(row.pageUrl) || { clicks: 0, impressions: 0, positionSum: 0, count: 0 };
    existing.clicks += row.clicks || 0;
    existing.impressions += row.impressions || 0;
    existing.positionSum += (row.avgPosition || 0);
    existing.count += 1;
    pageMap.set(row.pageUrl, existing);
  }

  const trafficByPage = Array.from(pageMap.entries())
    .map(([url, d]) => ({
      url,
      clicks: d.clicks,
      impressions: d.impressions,
      position: d.count > 0 ? d.positionSum / d.count : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);

  // Content ROI: match articles to GSC data
  const articles = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, id))
    .orderBy(desc(schema.articles.createdAt))
    .all();

  const articleROI = articles.map((article) => {
    // Find matching GSC data by slug
    const slug = article.slug || "";
    const matchingPages = trafficByPage.filter((p) =>
      p.url.includes(slug) && slug.length > 0
    );
    const totalClicks = matchingPages.reduce((s, p) => s + p.clicks, 0);
    const totalImpressions = matchingPages.reduce((s, p) => s + p.impressions, 0);
    const avgPos = matchingPages.length > 0
      ? matchingPages.reduce((s, p) => s + p.position, 0) / matchingPages.length
      : 0;

    return {
      title: article.metaTitle || article.h1 || "Untitled",
      slug: article.slug || "",
      status: article.status,
      clicks: totalClicks,
      impressions: totalImpressions,
      position: avgPos,
      createdAt: article.createdAt,
    };
  });

  // Trends
  const totalClicks = gscData.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalImpressions = gscData.reduce((s, r) => s + (r.impressions || 0), 0);
  const avgPosition = gscData.length > 0
    ? gscData.reduce((s, r) => s + (r.avgPosition || 0), 0) / gscData.length
    : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return NextResponse.json({
    rankings,
    trafficByPage,
    articleROI,
    trends: {
      totalClicks,
      totalImpressions,
      avgPosition,
      avgCtr,
      pagesRanking: pageMap.size,
      queriesTracked: queryMap.size,
    },
  });
}
