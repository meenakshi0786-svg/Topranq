import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { publishArticleToShopify } from "@/lib/shopify";
import { getOrCreateUser, isRealUser } from "@/lib/auth";

// POST /api/shopify/publish-article
// Body: { articleId: string }
// Publishes a Ranqapex article to the connected Shopify store.
export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  if (!isRealUser(user.email)) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await request.json();
  const articleId = body.articleId as string;
  if (!articleId) {
    return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
  }

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, articleId)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Verify the user owns this article's domain
  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, article.domainId)).get();
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Find the connected Shopify connector for this domain
  const connector = db.select().from(schema.connectors)
    .where(
      and(
        eq(schema.connectors.domainId, article.domainId),
        eq(schema.connectors.platform, "shopify"),
        eq(schema.connectors.status, "connected"),
      )
    )
    .get();
  if (!connector || !connector.authCredentialsEncrypted || !connector.siteUrl) {
    return NextResponse.json(
      { error: "No connected Shopify store for this domain. Connect Shopify first." },
      { status: 400 }
    );
  }

  const shop = connector.siteUrl.replace(/^https?:\/\//, "");
  const accessToken = connector.authCredentialsEncrypted;

  try {
    const result = await publishArticleToShopify(shop, accessToken, {
      title: article.h1 || article.metaTitle || "Untitled",
      bodyHtml: article.bodyHtml || (article.bodyMarkdown || "").replace(/\n/g, "<br>"),
      tags: article.targetKeyword || "",
      featuredImageUrl: article.featuredImageUrl,
    });

    // Log the publish
    db.insert(schema.publishLog).values({
      articleId,
      connectorId: connector.id,
      platformPostId: String(result.id),
      status: "success",
      dryRun: false,
      publishedAt: new Date().toISOString(),
    }).run();

    // Update article status
    db.update(schema.articles)
      .set({ status: "published", publishedUrl: result.url, publishedAt: new Date().toISOString() })
      .where(eq(schema.articles.id, articleId))
      .run();

    return NextResponse.json({ success: true, url: result.url, id: result.id });
  } catch (error) {
    console.error("Shopify publish failed:", error);

    db.insert(schema.publishLog).values({
      articleId,
      connectorId: connector.id,
      platformPostId: null,
      status: "failed",
      dryRun: false,
      publishedAt: null,
    }).run();

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish" },
      { status: 500 }
    );
  }
}
