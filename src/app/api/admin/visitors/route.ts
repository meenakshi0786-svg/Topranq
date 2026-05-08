import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, gte, desc } from "drizzle-orm";
import { getOrCreateUser, isAdmin } from "@/lib/auth";

const SITE_HOST = "ranqapex.com";

export async function GET() {
  const me = await getOrCreateUser();
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const isoFromMsAgo = (ms: number) => new Date(now - ms).toISOString().replace("T", " ").slice(0, 19);
  const startOfToday = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString().replace("T", " ").slice(0, 19);
  })();
  const last7d = isoFromMsAgo(7 * 24 * 60 * 60 * 1000);
  const last30d = isoFromMsAgo(30 * 24 * 60 * 60 * 1000);
  const last5min = isoFromMsAgo(5 * 60 * 1000);

  // ── Page views ──────────────────────────────────────────
  const pageViewsToday = db.select({ c: sql<number>`count(*)` })
    .from(schema.visitorLogs).where(gte(schema.visitorLogs.createdAt, startOfToday)).get()?.c || 0;
  const pageViews7d = db.select({ c: sql<number>`count(*)` })
    .from(schema.visitorLogs).where(gte(schema.visitorLogs.createdAt, last7d)).get()?.c || 0;
  const pageViews30d = db.select({ c: sql<number>`count(*)` })
    .from(schema.visitorLogs).where(gte(schema.visitorLogs.createdAt, last30d)).get()?.c || 0;

  // ── Unique visitors (by visitor_id when available, else session_id) ──
  const uniqExpr = sql<number>`count(distinct coalesce(visitor_id, session_id))`;
  const uniqueToday = db.select({ c: uniqExpr }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, startOfToday)).get()?.c || 0;
  const unique7d = db.select({ c: uniqExpr }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last7d)).get()?.c || 0;
  const unique30d = db.select({ c: uniqExpr }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d)).get()?.c || 0;

  const liveNow = db.select({ c: sql<number>`count(distinct session_id)` })
    .from(schema.visitorLogs).where(gte(schema.visitorLogs.createdAt, last5min)).get()?.c || 0;

  // ── New vs Returning visitors today ─────────────────────
  // A visitor is "returning" if their visitor_id was first seen BEFORE today.
  const newReturning = db.all<{ first_seen: string; visitor_id: string | null }>(sql`
    SELECT visitor_id, MIN(created_at) as first_seen
    FROM visitor_logs
    WHERE visitor_id IS NOT NULL
      AND created_at >= ${startOfToday}
    GROUP BY visitor_id
  `);
  let newVisitorsToday = 0;
  let returningVisitorsToday = 0;
  for (const row of newReturning) {
    // For each visitor seen today, find their first_seen ever
    const firstEver = db.select({ first: sql<string>`min(created_at)` })
      .from(schema.visitorLogs)
      .where(sql`visitor_id = ${row.visitor_id}`)
      .get()?.first;
    if (firstEver && firstEver < startOfToday) returningVisitorsToday++;
    else newVisitorsToday++;
  }

  // ── Bounce rate (last 30d) ──────────────────────────────
  // Bounce = session with exactly 1 page view
  const sessionsLast30d = db.all<{ session_id: string; views: number }>(sql`
    SELECT session_id, count(*) as views
    FROM visitor_logs
    WHERE created_at >= ${last30d}
    GROUP BY session_id
  `);
  const totalSessions = sessionsLast30d.length;
  const bouncedSessions = sessionsLast30d.filter(s => s.views === 1).length;
  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;
  const avgPagesPerSession = totalSessions > 0
    ? +(sessionsLast30d.reduce((s, r) => s + r.views, 0) / totalSessions).toFixed(1)
    : 0;

  // ── Visit frequency distribution (visitors by # of distinct days visited in 30d) ──
  const visitDays = db.all<{ visitor_id: string; days: number }>(sql`
    SELECT visitor_id, count(distinct substr(created_at, 1, 10)) as days
    FROM visitor_logs
    WHERE created_at >= ${last30d}
      AND visitor_id IS NOT NULL
    GROUP BY visitor_id
  `);
  const frequency = { once: 0, two_three: 0, four_seven: 0, eight_plus: 0 };
  for (const v of visitDays) {
    if (v.days === 1) frequency.once++;
    else if (v.days <= 3) frequency.two_three++;
    else if (v.days <= 7) frequency.four_seven++;
    else frequency.eight_plus++;
  }

  // ── Top exit pages (last 30d) ──────────────────────────
  // For each session, find the LAST path. Group by path.
  const exitPages = db.all<{ path: string; count: number }>(sql`
    SELECT path, count(*) as count
    FROM (
      SELECT session_id, path,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at DESC) as rn
      FROM visitor_logs
      WHERE created_at >= ${last30d}
    )
    WHERE rn = 1
    GROUP BY path
    ORDER BY count DESC
    LIMIT 10
  `);

  // ── Top countries ──────────────────────────────────────
  const topCountries = db.select({
    country: schema.visitorLogs.country,
    count: sql<number>`count(distinct coalesce(visitor_id, session_id))`,
  }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.country)
    .orderBy(desc(sql`count(distinct coalesce(visitor_id, session_id))`))
    .limit(10).all()
    .filter(r => r.country && r.country !== "Local");

  // ── Top pages ──────────────────────────────────────────
  const topPages = db.select({
    path: schema.visitorLogs.path,
    count: sql<number>`count(*)`,
  }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10).all();

  // ── Top referrers (filter out internal) ─────────────────
  const topReferers = db.select({
    referer: schema.visitorLogs.referer,
    count: sql<number>`count(distinct coalesce(visitor_id, session_id))`,
  }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.referer)
    .orderBy(desc(sql`count(distinct coalesce(visitor_id, session_id))`))
    .limit(15).all()
    .filter(r => r.referer && r.referer.length > 0)
    .map(r => {
      try {
        const host = new URL(r.referer!).hostname.replace(/^www\./, "");
        return { ...r, host };
      } catch { return { ...r, host: r.referer! }; }
    })
    .filter(r => !r.host.includes(SITE_HOST))
    .slice(0, 10)
    .map(r => ({ referer: r.host, count: r.count }));

  // ── Top UTM sources (last 30d) ─────────────────────────
  const topUtmSources = db.select({
    utmSource: schema.visitorLogs.utmSource,
    count: sql<number>`count(distinct coalesce(visitor_id, session_id))`,
  }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .groupBy(schema.visitorLogs.utmSource)
    .orderBy(desc(sql`count(distinct coalesce(visitor_id, session_id))`))
    .all()
    .filter(r => r.utmSource && r.utmSource.length > 0)
    .slice(0, 10)
    .map(r => ({ source: r.utmSource as string, count: r.count }));

  // ── Newsletter signups count ───────────────────────────
  const newsletterTotal = db.select({ c: sql<number>`count(*)` })
    .from(schema.newsletterSubscribers)
    .get()?.c || 0;
  const newsletter30d = db.select({ c: sql<number>`count(*)` })
    .from(schema.newsletterSubscribers)
    .where(gte(schema.newsletterSubscribers.createdAt, last30d))
    .get()?.c || 0;

  // ── Daily trend (last 14 days) ─────────────────────────
  const dailyTrend = db.select({
    day: sql<string>`substr(created_at, 1, 10)`,
    pageviews: sql<number>`count(*)`,
    visitors: sql<number>`count(distinct coalesce(visitor_id, session_id))`,
  }).from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, isoFromMsAgo(14 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`substr(created_at, 1, 10)`)
    .orderBy(sql`substr(created_at, 1, 10) asc`)
    .all();

  return NextResponse.json({
    summary: {
      liveNow,
      pageViewsToday, pageViews7d, pageViews30d,
      uniqueToday, unique7d, unique30d,
      newVisitorsToday, returningVisitorsToday,
      bounceRate, avgPagesPerSession, totalSessions30d: totalSessions,
    },
    frequency,
    exitPages,
    topCountries,
    topPages,
    topReferers,
    topUtmSources,
    newsletter: { total: newsletterTotal, recent30d: newsletter30d },
    dailyTrend,
  });
}
