import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";
import { getShopAccessToken, publishArticleToShopify } from "@/lib/shopify";

// POST /api/shopify/embedded/publish
// Body: { articleId: string } — publishes the article to the shop's store blog.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const articleId = (body.articleId || "").trim();
  if (!articleId) return NextResponse.json({ error: "Missing articleId" }, { status: 400 });

  const { domainId } = getOrCreateShopAccount(claims.shop);

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, articleId)).get();
  if (!article || article.domainId !== domainId) {
    return NextResponse.json({ error: "Article not found for this store" }, { status: 404 });
  }

  const connected = await getShopAccessToken(claims.shop);
  if (!connected) {
    return NextResponse.json({ error: "Store access token missing — reinstall the app." }, { status: 400 });
  }

  // Find the connector to log against.
  const connector = db
    .select()
    .from(schema.connectors)
    .where(eq(schema.connectors.siteUrl, `https://${claims.shop}`))
    .get();

  try {
    const result = await publishArticleToShopify(claims.shop, connected.token, {
      title: article.h1 || article.metaTitle || "Untitled",
      bodyHtml: article.bodyHtml || (article.bodyMarkdown || "").replace(/\n/g, "<br>"),
      tags: article.targetKeyword || "",
      featuredImageUrl: article.featuredImageUrl,
    });

    db.update(schema.articles)
      .set({ status: "published", publishedUrl: result.url, publishedAt: new Date().toISOString() })
      .where(eq(schema.articles.id, articleId))
      .run();

    if (connector) {
      db.insert(schema.publishLog)
        .values({
          articleId,
          connectorId: connector.id,
          platformPostId: String(result.id),
          status: "success",
          dryRun: false,
          publishedAt: new Date().toISOString(),
        })
        .run();
    }

    return NextResponse.json({ success: true, url: result.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 },
    );
  }
}
