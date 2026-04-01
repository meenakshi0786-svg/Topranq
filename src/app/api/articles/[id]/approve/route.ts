import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/articles/:id/approve
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, id)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  db.update(schema.articles)
    .set({ status: "approved" })
    .where(eq(schema.articles.id, id))
    .run();

  return NextResponse.json({ success: true, status: "approved" });
}
