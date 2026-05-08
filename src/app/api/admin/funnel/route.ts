import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, gte } from "drizzle-orm";
import { getOrCreateUser, isAdmin } from "@/lib/auth";

// GET /api/admin/funnel — conversion funnel metrics. Admin-only.
export async function GET() {
  const me = await getOrCreateUser();
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const isoFromMsAgo = (ms: number) => new Date(now - ms).toISOString().replace("T", " ").slice(0, 19);
  const last30d = isoFromMsAgo(30 * 24 * 60 * 60 * 1000);

  // Total visitors (last 30d, distinct visitor_id or session_id)
  const visitors = db.select({ c: sql<number>`count(distinct coalesce(visitor_id, session_id))` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, last30d))
    .get()?.c || 0;

  // Total signups (real users, not demo) — all-time
  const allUsers = db.select().from(schema.users).all();
  const realUsers = allUsers.filter(u => u.email !== "demo@ranqapex.com");
  const signups = realUsers.length;

  // Signups in last 30d
  const signupsRecent = realUsers.filter(u => u.createdAt && u.createdAt >= last30d).length;

  // Users who added at least 1 domain
  const usersWithDomain = db.select({ userId: schema.domains.userId })
    .from(schema.domains)
    .groupBy(schema.domains.userId)
    .all();
  const realUserIds = new Set(realUsers.map(u => u.id));
  const withDomain = usersWithDomain.filter(d => realUserIds.has(d.userId)).length;

  // Users who generated at least 1 article
  const usersWithArticle = db.select({ userId: schema.domains.userId })
    .from(schema.articles)
    .innerJoin(schema.domains, sql`${schema.articles.domainId} = ${schema.domains.id}`)
    .groupBy(schema.domains.userId)
    .all();
  const withArticle = usersWithArticle.filter(d => realUserIds.has(d.userId)).length;

  // Paid users
  const paid = realUsers.filter(u => u.plan === "dollar1" || u.plan === "dollar5").length;
  const dollar1 = realUsers.filter(u => u.plan === "dollar1").length;
  const dollar5 = realUsers.filter(u => u.plan === "dollar5").length;

  // Today's funnel (subset)
  const startOfToday = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString().replace("T", " ").slice(0, 19);
  })();

  const visitorsToday = db.select({ c: sql<number>`count(distinct coalesce(visitor_id, session_id))` })
    .from(schema.visitorLogs)
    .where(gte(schema.visitorLogs.createdAt, startOfToday))
    .get()?.c || 0;
  const signupsToday = realUsers.filter(u => u.createdAt && u.createdAt >= startOfToday).length;

  function pct(n: number, d: number) {
    if (d === 0) return 0;
    return Math.round((n / d) * 1000) / 10;
  }

  return NextResponse.json({
    today: {
      visitors: visitorsToday,
      signups: signupsToday,
      conversionRate: pct(signupsToday, visitorsToday),
    },
    overall: {
      visitors30d: visitors,
      signups: signups,
      signups30d: signupsRecent,
      withDomain,
      withArticle,
      paid,
      dollar1,
      dollar5,
      revenue: dollar1 * 1 + dollar5 * 5,
    },
    funnel: [
      { stage: "Visitors (30d)", count: visitors, fromPrev: null },
      { stage: "Signed up", count: signups, fromPrev: pct(signups, visitors) },
      { stage: "Added a domain", count: withDomain, fromPrev: pct(withDomain, signups) },
      { stage: "Generated article", count: withArticle, fromPrev: pct(withArticle, withDomain) },
      { stage: "Upgraded to paid", count: paid, fromPrev: pct(paid, signups) },
    ],
  });
}
