import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { getOrCreateUser, isAdmin } from "@/lib/auth";

// GET /api/admin/users — list all users with stats. Admin-only.
export async function GET() {
  const me = await getOrCreateUser();
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pull all users
  const users = db.select().from(schema.users).all();

  // Aggregate counts in batch
  const domainsByUser = new Map<string, number>();
  for (const row of db
    .select({ userId: schema.domains.userId, count: sql<number>`count(*)` })
    .from(schema.domains)
    .groupBy(schema.domains.userId)
    .all()) {
    domainsByUser.set(row.userId, Number(row.count));
  }

  const articlesByUser = new Map<string, number>();
  for (const row of db
    .select({
      userId: schema.domains.userId,
      count: sql<number>`count(*)`,
    })
    .from(schema.articles)
    .innerJoin(schema.domains, eq(schema.articles.domainId, schema.domains.id))
    .groupBy(schema.domains.userId)
    .all()) {
    articlesByUser.set(row.userId, Number(row.count));
  }

  const enriched = users.map((u) => {
    const planPurchasedAt = u.planPurchasedAt;
    const daysRemaining = planPurchasedAt
      ? Math.max(0, 30 - Math.floor((Date.now() - new Date(planPurchasedAt).getTime()) / (1000 * 60 * 60 * 24)))
      : null;
    return {
      id: u.id,
      email: u.email,
      name: u.name || "",
      plan: u.plan || "free",
      planPurchasedAt,
      daysRemaining,
      planExpired: planPurchasedAt && daysRemaining === 0,
      createdAt: u.createdAt,
      domainCount: domainsByUser.get(u.id) || 0,
      articleCount: articlesByUser.get(u.id) || 0,
      isDemo: u.email === "demo@ranqapex.com",
      isAdmin: isAdmin(u.email),
    };
  });

  // Sort: paid plans first, then by creation date desc
  enriched.sort((a, b) => {
    const planRank: Record<string, number> = { dollar5: 0, dollar1: 1, free: 2 };
    const ra = planRank[a.plan] ?? 3;
    const rb = planRank[b.plan] ?? 3;
    if (ra !== rb) return ra - rb;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  // Summary
  const summary = {
    total: enriched.length,
    free: enriched.filter((u) => u.plan === "free").length,
    dollar1: enriched.filter((u) => u.plan === "dollar1").length,
    dollar5: enriched.filter((u) => u.plan === "dollar5").length,
    activePaid: enriched.filter((u) => u.plan !== "free" && (u.daysRemaining || 0) > 0).length,
    totalRevenue: enriched.filter((u) => u.plan === "dollar1").length * 1
      + enriched.filter((u) => u.plan === "dollar5").length * 5,
    totalDomains: enriched.reduce((s, u) => s + u.domainCount, 0),
    totalArticles: enriched.reduce((s, u) => s + u.articleCount, 0),
  };

  return NextResponse.json({ users: enriched, summary });
}

// Sort imports were unused; suppress lint by referencing
void desc;
