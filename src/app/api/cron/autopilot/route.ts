import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, lte, desc } from "drizzle-orm";
import { getFreshAdminToken, fetchStoreProducts, publishArticleToShopify } from "@/lib/shopify";
import { runBlogWriter, BLOG_WRITER_CREDITS } from "@/lib/agents/blog-writer-agent";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";
import { getShopSettings, computeNextRunAt } from "@/app/api/shopify/embedded/settings/route";

export const maxDuration = 300;

// POST /api/cron/autopilot?secret=xxx
// The Autopilot Agent: for every shop whose schedule is due, pick a topic from
// its knowledge base, generate an article, and publish it (or leave a draft).
// Run hourly via crontab.
export async function POST(request: NextRequest) {
  const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (provided !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nowIso = new Date().toISOString();
  const due = db
    .select()
    .from(schema.storeSettings)
    .where(and(eq(schema.storeSettings.autopilotEnabled, true), lte(schema.storeSettings.nextRunAt, nowIso)))
    .all();

  const results: Array<Record<string, unknown>> = [];

  for (const row of due) {
    const domainId = row.domainId;
    const outcome: Record<string, unknown> = { domainId };
    try {
      const settings = getShopSettings(domainId);
      const connector = db
        .select()
        .from(schema.connectors)
        .where(and(eq(schema.connectors.platform, "shopify"), eq(schema.connectors.domainId, domainId)))
        .get();
      const shop = connector?.siteUrl ? new URL(connector.siteUrl).hostname : null;
      if (!shop) throw new Error("no shopify connector");
      outcome.shop = shop;

      // Credit gate — approximate 30-day window; deliberately avoids live
      // subscription sync (no session token in cron, and a failed sync must
      // never downgrade a paying merchant).
      const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
      const user = domain ? db.select().from(schema.users).where(eq(schema.users.id, domain.userId)).get() : null;
      if (!user) throw new Error("no user");
      const plan = (user.plan || "free") as keyof typeof PLAN_LIMITS;
      const allowance = plan === "free" ? 5 : (PLAN_LIMITS[plan]?.credits ?? 5);
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const used = db
        .select()
        .from(schema.creditLedger)
        .where(eq(schema.creditLedger.userId, user.id))
        .all()
        .filter((l) => (l.timestamp || "") >= since && (l.creditsUsed || 0) > 0)
        .reduce((s, l) => s + (l.creditsUsed || 0), 0);
      if (allowance - used < BLOG_WRITER_CREDITS) {
        outcome.skipped = "out of credits";
        results.push(outcome);
        // Still push the schedule forward so we don't retry hourly forever.
        advanceSchedule(row.id, settings);
        continue;
      }

      // Topic: unused custom keyword → unused discovered keyword → product guide.
      const articles = db.select().from(schema.articles).where(eq(schema.articles.domainId, domainId)).all();
      const usedKw = new Set(articles.map((a) => (a.targetKeyword || "").toLowerCase()).filter(Boolean));
      let topic = settings.customKeywords.find((k) => !usedKw.has(k.toLowerCase())) || null;
      if (!topic) {
        const discovered = db
          .select()
          .from(schema.discoveredKeywords)
          .where(eq(schema.discoveredKeywords.domainId, domainId))
          .orderBy(desc(schema.discoveredKeywords.relevancyScore))
          .all()
          .find((k) => !usedKw.has(k.keyword.toLowerCase()));
        if (discovered) topic = discovered.keyword;
      }
      if (!topic) {
        const product = db.select().from(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).all()[0];
        if (product) topic = `The complete guide to ${product.name}`;
      }
      if (!topic) {
        outcome.skipped = "no topic source (add custom keywords or run keyword discovery)";
        results.push(outcome);
        advanceSchedule(row.id, settings);
        continue;
      }
      outcome.topic = topic;

      // Admin token (background): needed for product context + publishing.
      const token = await getFreshAdminToken(shop);

      let productContext: string | undefined;
      if (token && settings.promoteProducts) {
        const products = await fetchStoreProducts(shop, token);
        if (products.length) {
          productContext = "Reference these store products naturally where relevant:\n" +
            products.map((p) => `- ${p.title}${p.price ? ` ($${p.price})` : ""} — ${p.url}`).join("\n");
        }
      }

      const knowledge = [
        settings.brandInfo ? `BRAND CONTEXT: ${settings.brandInfo}` : "",
        settings.avoidInfo ? `AVOID: ${settings.avoidInfo}` : "",
      ].filter(Boolean).join("\n");

      const output = await runBlogWriter(domainId, {
        topic: knowledge ? `${topic}\n\n${knowledge}` : topic,
        keywords: [topic],
        tone: settings.tone,
        wordCount: 1500,
        intent: "informational",
        audience: settings.audience,
        productContext,
        preferredModel: plan === "growth" ? "opus" : "sonnet",
      });

      db.insert(schema.creditLedger)
        .values({
          userId: user.id,
          action: "autopilot_article",
          creditsUsed: BLOG_WRITER_CREDITS,
          balanceAfter: allowance - used - BLOG_WRITER_CREDITS,
          agent: "autopilot",
        })
        .run();

      if (settings.autoPublish && token) {
        const article = db.select().from(schema.articles).where(eq(schema.articles.id, output.articleId)).get();
        const result = await publishArticleToShopify(shop, token, {
          title: article?.h1 || article?.metaTitle || topic,
          bodyHtml: article?.bodyHtml || (article?.bodyMarkdown || "").replace(/\n/g, "<br>"),
          tags: article?.targetKeyword || "",
          featuredImageUrl: article?.featuredImageUrl,
          author: settings.authorName || null,
        });
        db.update(schema.articles)
          .set({ status: "published", publishedUrl: result.url, publishedAt: new Date().toISOString() })
          .where(eq(schema.articles.id, output.articleId))
          .run();
        outcome.published = result.url;
      } else {
        db.update(schema.articles).set({ status: "draft" }).where(eq(schema.articles.id, output.articleId)).run();
        outcome.draft = true;
        if (settings.autoPublish && !token) outcome.note = "no background token — saved as draft; opens app to re-auth";
      }

      advanceSchedule(row.id, settings);
      results.push(outcome);
    } catch (error) {
      outcome.error = error instanceof Error ? error.message : String(error);
      try { advanceSchedule(row.id, getShopSettings(domainId)); } catch { /* keep going */ }
      results.push(outcome);
    }
  }

  return NextResponse.json({ ran: results.length, results });
}

function advanceSchedule(settingsId: string, s: ReturnType<typeof getShopSettings>) {
  let next = computeNextRunAt(s.autopilotFrequency, s.autopilotDay, s.autopilotHour);
  if (s.autopilotFrequency === "biweekly") {
    next = new Date(Date.parse(next) + 7 * 24 * 3600 * 1000).toISOString();
  }
  db.update(schema.storeSettings)
    .set({ lastRunAt: new Date().toISOString(), nextRunAt: next })
    .where(eq(schema.storeSettings.id, settingsId))
    .run();
}
