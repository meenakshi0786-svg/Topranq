import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, gte, desc } from "drizzle-orm";
import { getOrCreateUser, isAdmin } from "@/lib/auth";

// GET /api/admin/visitors — visitor analytics. Admin-only.
export async function GET() {
  const me = await getOrCreateUser();
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Time windows
  const now = Date.now();
  const isoFromMsAgo = (ms: number) => new Date(now - ms).toISOString().replace("T", " ").slice(0, 19);
  const last24h = isoFromMsAgo(24 * 60 * 60 * 1000);
  const last7d = isoFromMsAgo(7 * 24 * 60 * 60 * 1000);
  const last30d = isoFromMsAgo(30 * 24 * 60 * 60 * 1000);
  const last5min = isoFromMsAgo(5 * 60 * 1000);

  // Page views
  const pageViewsToday = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last24h))
    .get()?.c || 0;

  const pageViews7d = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last7d))
    .get()?.c || 0;

  const pageViews30d = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .get()?.c || 0;

  // Unique visitors (distinct sessionId)
  const uniqueToday = db
    .select({ c: sql<number>`count(distinct session_id)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last24h))
    .get()?.c || 0;

  const unique7d = db
    .select({ c: sql<number>`count(distinct session_id)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last7d))
    .get()?.c || 0;

  const unique30d = db
    .select({ c: sql<number>`count(distinct session_id)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .get()?.c || 0;

  // Real-time (active in last 5 min)
  const liveNow = db
    .select({ c: sql<number>`count(distinct session_id)` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last5min))
    .get()?.c || 0;

  // Top countries (last 30d)
  const topCountries = db
    .select({
      country: schema.visitorLogs.country,
      count: sql<number>`count(distinct session_id)`,
    })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.country)
    .orderBy(desc(sql`count(distinct session_id)`))
    .limit(10)
    .all()
    .filter(r => r.country && r.country !== "Local");

  // Top pages (last 30d)
  const topPages = db
    .select({
      path: schema.visitorLogs.path,
      count: sql<number>`count(*)`,
    })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10)
    .all();

  // Top referrers (last 30d), excluding empty
  const topReferers = db
    .select({
      referer: schema.visitorLogs.referer,
      count: sql<number>`count(distinct session_id)`,
    })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.referer)
    .orderBy(desc(sql`count(distinct session_id)`))
    .limit(10)
    .all()
    .filter(r => r.referer && r.referer.length > 0)
    .map(r => ({
      ...r,
      referer: (() => {
        try { return new URL(r.referer!).hostname; } catch { return r.referer!; }
      })(),
    }));

  // Daily trend (last 14 days)
  const dailyTrend = db
    .select({
      day: sql<string>`substr(created_at, 1, 10)`,
      pageviews: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct session_id)`,
    })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, isoFromMsAgo(14 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`substr(created_at, 1, 10)`)
    .orderBy(sql`substr(created_at, 1, 10) asc`)
    .all();

  return NextResponse.json({
    summary: {
      liveNow,
      pageViewsToday,
      pageViews7d,
      pageViews30d,
      uniqueToday,
      unique7d,
      unique30d,
    },
    topCountries,
    topPages,
    topReferers,
    dailyTrend,
  });
}
