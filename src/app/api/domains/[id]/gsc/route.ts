import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { fetchSearchAnalytics, fetchSiteList } from "@/lib/gsc";

// GET /api/domains/:id/gsc — Get GSC data (or connection status)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const action = request.nextUrl.searchParams.get("action");

  // Find GSC connection
  const connection = db
    .select()
    .from(schema.domainLearnings)
    .where(
      and(
        eq(schema.domainLearnings.domainId, id),
        eq(schema.domainLearnings.learningType, "gsc_connection")
      )
    )
    .orderBy(desc(schema.domainLearnings.createdAt))
    .get();

  if (!connection) {
    return NextResponse.json({ connected: false, data: null });
  }

  let connectionData: { refreshToken: string; sites: string[]; connectedAt: string };
  try {
    connectionData = JSON.parse(connection.insight);
  } catch {
    return NextResponse.json({ connected: false, data: null });
  }

  // Just return connection status
  if (action === "status") {
    return NextResponse.json({
      connected: true,
      sites: connectionData.sites,
      connectedAt: connectionData.connectedAt,
    });
  }

  // Fetch fresh data from GSC
  if (action === "fetch") {
    const siteUrl = request.nextUrl.searchParams.get("siteUrl");
    const days = parseInt(request.nextUrl.searchParams.get("days") || "28");

    if (!siteUrl) {
      return NextResponse.json({ error: "Missing siteUrl parameter" }, { status: 400 });
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      // Fetch query-level data
      const queryData = await fetchSearchAnalytics(
        connectionData.refreshToken,
        siteUrl,
        {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["query", "page"],
          rowLimit: 1000,
        }
      );

      // Store in database
      for (const row of queryData) {
        db.insert(schema.searchConsoleData)
          .values({
            domainId: id,
            pageUrl: row.page,
            query: row.query,
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: row.ctr,
            avgPosition: row.position,
            date: formatDate(endDate),
          })
          .run();
      }

      // Compute aggregates
      const totalClicks = queryData.reduce((s, r) => s + r.clicks, 0);
      const totalImpressions = queryData.reduce((s, r) => s + r.impressions, 0);
      const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const avgPosition = queryData.length > 0
        ? queryData.reduce((s, r) => s + r.position, 0) / queryData.length
        : 0;

      // Top queries by clicks
      const queryMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
      for (const row of queryData) {
        const existing = queryMap.get(row.query);
        if (existing) {
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
          existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
          existing.position = (existing.position + row.position) / 2;
        } else {
          queryMap.set(row.query, {
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          });
        }
      }

      const topQueries = Array.from(queryMap.entries())
        .map(([query, data]) => ({ query, ...data }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 50);

      // Top pages by clicks
      const pageMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; queries: number }>();
      for (const row of queryData) {
        const existing = pageMap.get(row.page);
        if (existing) {
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
          existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
          existing.position = (existing.position + row.position) / 2;
          existing.queries++;
        } else {
          pageMap.set(row.page, {
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
            queries: 1,
          });
        }
      }

      const topPages = Array.from(pageMap.entries())
        .map(([page, data]) => ({ page, ...data }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 30);

      // Quick wins: queries ranking 4-20 with decent impressions
      const quickWins = topQueries
        .filter((q) => q.position >= 4 && q.position <= 20 && q.impressions >= 10)
        .sort((a, b) => a.position - b.position)
        .slice(0, 20);

      return NextResponse.json({
        connected: true,
        period: { startDate: formatDate(startDate), endDate: formatDate(endDate), days },
        summary: {
          totalClicks,
          totalImpressions,
          avgCtr: Math.round(avgCtr * 10000) / 100,
          avgPosition: Math.round(avgPosition * 10) / 10,
          totalQueries: queryMap.size,
          totalPages: pageMap.size,
        },
        topQueries,
        topPages,
        quickWins,
      });
    } catch (err) {
      console.error("GSC fetch error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to fetch GSC data" },
        { status: 500 }
      );
    }
  }

  // Return cached data from DB
  const cachedData = db
    .select()
    .from(schema.searchConsoleData)
    .where(eq(schema.searchConsoleData.domainId, id))
    .orderBy(desc(schema.searchConsoleData.date))
    .limit(200)
    .all();

  if (cachedData.length === 0) {
    return NextResponse.json({
      connected: true,
      sites: connectionData.sites,
      connectedAt: connectionData.connectedAt,
      data: null,
      message: "Connected but no data fetched yet. Use ?action=fetch&siteUrl=... to pull data.",
    });
  }

  // Aggregate cached data
  const queryMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  for (const row of cachedData) {
    const key = row.query || "";
    const existing = queryMap.get(key);
    if (existing) {
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.position = (existing.position + (row.avgPosition || 0)) / 2;
    } else {
      queryMap.set(key, {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.avgPosition || 0,
      });
    }
  }

  const topQueries = Array.from(queryMap.entries())
    .map(([query, data]) => ({ query, ...data }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);

  return NextResponse.json({
    connected: true,
    sites: connectionData.sites,
    topQueries,
    cachedRows: cachedData.length,
  });
}

// DELETE /api/domains/:id/gsc — Disconnect GSC
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Remove GSC connection
  db.delete(schema.domainLearnings)
    .where(
      and(
        eq(schema.domainLearnings.domainId, id),
        eq(schema.domainLearnings.learningType, "gsc_connection")
      )
    )
    .run();

  return NextResponse.json({ disconnected: true });
}
