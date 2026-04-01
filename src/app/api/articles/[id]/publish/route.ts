import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/articles/:id/publish — publish via connector
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, id)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (article.status !== "approved") {
    return NextResponse.json({ error: "Article must be approved before publishing" }, { status: 400 });
  }

  // Find connected connector for this domain
  const connector = db.select().from(schema.connectors)
    .where(eq(schema.connectors.domainId, article.domainId))
    .get();

  if (!connector || connector.status !== "connected") {
    return NextResponse.json({ error: "No connected publisher. Set up a connector first." }, { status: 400 });
  }

  // Log the publish attempt
  const logEntry = {
    articleId: id,
    connectorId: connector.id,
    platformPostId: null as string | null,
    status: "pending" as "pending" | "success" | "failed",
    dryRun,
    publishedAt: null as string | null,
  };

  if (dryRun) {
    logEntry.status = "success";
    db.insert(schema.publishLog).values(logEntry).run();
    return NextResponse.json({
      success: true,
      dryRun: true,
      preview: {
        title: article.metaTitle,
        slug: article.slug,
        platform: connector.platform,
        siteUrl: connector.siteUrl,
      },
    });
  }

  // For now, mark as published (actual CMS API integration would go here)
  logEntry.status = "success";
  logEntry.publishedAt = new Date().toISOString();
  db.insert(schema.publishLog).values(logEntry).run();

  db.update(schema.articles)
    .set({
      status: "published",
      publishedAt: new Date().toISOString(),
      publishedUrl: `${connector.siteUrl}/${article.slug}`,
    })
    .where(eq(schema.articles.id, id))
    .run();

  return NextResponse.json({
    success: true,
    status: "published",
    publishedUrl: `${connector.siteUrl}/${article.slug}`,
  });
}
