import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, lte } from "drizzle-orm";
import { publishToCMS } from "@/lib/publish";

// POST /api/cron/publish-due?secret=xxx
// Scans for articles with status=scheduled and scheduledFor <= now, publishes them.
// Run via external cron every 5 minutes.
export async function POST(request: NextRequest) {
  const providedSecret = request.nextUrl.searchParams.get("secret") ||
    request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  const dueArticles = db
    .select()
    .from(schema.articles)
    .where(
      and(
        eq(schema.articles.status, "scheduled"),
        lte(schema.articles.scheduledFor, nowIso)
      )
    )
    .all();

  const results: Array<{ articleId: string; status: "published" | "failed"; message?: string; publishedUrl?: string }> = [];

  for (const article of dueArticles) {
    if (!article.publishConnectorId) {
      results.push({ articleId: article.id, status: "failed", message: "No connector configured" });
      continue;
    }

    const connector = db
      .select()
      .from(schema.connectors)
      .where(eq(schema.connectors.id, article.publishConnectorId))
      .get();

    if (!connector) {
      results.push({ articleId: article.id, status: "failed", message: "Connector not found" });
      continue;
    }

    try {
      const result = await publishToCMS(connector, article);

      db.update(schema.articles)
        .set({
          status: "published",
          publishedUrl: result.url,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.articles.id, article.id))
        .run();

      db.insert(schema.publishLog)
        .values({
          articleId: article.id,
          connectorId: connector.id,
          status: "success",
          publishedAt: new Date().toISOString(),
        })
        .run();

      results.push({ articleId: article.id, status: "published", publishedUrl: result.url });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Publish failed";
      db.insert(schema.publishLog)
        .values({
          articleId: article.id,
          connectorId: connector.id,
          status: "failed",
        })
        .run();
      results.push({ articleId: article.id, status: "failed", message: msg });
    }
  }

  return NextResponse.json({
    ranAt: nowIso,
    dueCount: dueArticles.length,
    results,
  });
}

// Also allow GET for easier cron debugging
export async function GET(request: NextRequest) {
  return POST(request);
}
