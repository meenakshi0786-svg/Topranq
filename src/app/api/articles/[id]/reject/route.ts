import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/articles/:id/reject — reject with feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, id)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  db.update(schema.articles)
    .set({ status: "rejected" })
    .where(eq(schema.articles.id, id))
    .run();

  // Log rejection feedback as a domain learning
  if (body.feedback) {
    db.insert(schema.domainLearnings).values({
      domainId: article.domainId,
      learningType: "article_rejection",
      insight: `Article "${article.metaTitle}" rejected: ${body.feedback}`,
      dataSource: "user_feedback",
      confidence: 1.0,
    }).run();
  }

  return NextResponse.json({ success: true, status: "rejected" });
}
