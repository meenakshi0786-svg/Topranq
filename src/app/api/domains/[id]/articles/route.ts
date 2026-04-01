import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET /api/domains/:id/articles
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const articles = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, id))
    .orderBy(desc(schema.articles.createdAt))
    .all();

  // Parse JSON fields
  const parsed = articles.map((a) => ({
    ...a,
    faqSchema: a.faqSchemaJson ? JSON.parse(a.faqSchemaJson) : null,
    internalLinks: a.internalLinksJson ? JSON.parse(a.internalLinksJson) : null,
    faqSchemaJson: undefined,
    internalLinksJson: undefined,
  }));

  return NextResponse.json(parsed);
}
