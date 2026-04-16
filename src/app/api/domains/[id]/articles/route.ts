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

  // Build lookup: which articles are pillars vs clusters
  const pillarArticleIds = new Set(
    db.select({ id: schema.pillars.pillarArticleId }).from(schema.pillars)
      .where(eq(schema.pillars.domainId, id)).all()
      .map((p) => p.id).filter(Boolean)
  );
  const clusterArticleIds = new Set(
    db.select({ id: schema.pillarClusters.articleId }).from(schema.pillarClusters).all()
      .map((c) => c.id).filter(Boolean)
  );

  // Parse JSON fields + add articleType
  const parsed = articles.map((a) => ({
    ...a,
    articleType: pillarArticleIds.has(a.id) ? "pillar" : clusterArticleIds.has(a.id) ? "cluster" : null,
    faqSchema: a.faqSchemaJson ? JSON.parse(a.faqSchemaJson) : null,
    internalLinks: a.internalLinksJson ? JSON.parse(a.internalLinksJson) : null,
    faqSchemaJson: undefined,
    internalLinksJson: undefined,
  }));

  return NextResponse.json(parsed);
}
