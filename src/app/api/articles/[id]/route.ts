import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/articles/:id — full article content
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const article = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, id))
    .get();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...article,
    faqSchema: article.faqSchemaJson ? JSON.parse(article.faqSchemaJson) : null,
    internalLinks: article.internalLinksJson ? JSON.parse(article.internalLinksJson) : null,
    faqSchemaJson: undefined,
    internalLinksJson: undefined,
  });
}

// PATCH /api/articles/:id — user edits
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const article = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.id, id))
    .get();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.metaTitle !== undefined) updates.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) updates.metaDescription = body.metaDescription;
  if (body.h1 !== undefined) updates.h1 = body.h1;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.bodyMarkdown !== undefined) updates.bodyMarkdown = body.bodyMarkdown;
  if (body.faqSchema !== undefined) updates.faqSchemaJson = JSON.stringify(body.faqSchema);
  if (body.internalLinks !== undefined) updates.internalLinksJson = JSON.stringify(body.internalLinks);
  if (body.status !== undefined) updates.status = body.status;

  if (Object.keys(updates).length > 0) {
    updates.revisionCount = (article.revisionCount || 0) + 1;
    db.update(schema.articles).set(updates).where(eq(schema.articles.id, id)).run();
  }

  const updated = db.select().from(schema.articles).where(eq(schema.articles.id, id)).get();
  return NextResponse.json({
    ...updated,
    faqSchema: updated?.faqSchemaJson ? JSON.parse(updated.faqSchemaJson) : null,
    internalLinks: updated?.internalLinksJson ? JSON.parse(updated.internalLinksJson) : null,
  });
}
