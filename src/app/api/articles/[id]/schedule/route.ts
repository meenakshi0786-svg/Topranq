import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/articles/:id/schedule
// Body: { scheduledFor: ISO string, connectorId: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { scheduledFor, connectorId } = body as { scheduledFor?: string; connectorId?: string };

  if (!scheduledFor || !connectorId) {
    return NextResponse.json({ error: "Missing scheduledFor or connectorId" }, { status: 400 });
  }

  const when = new Date(scheduledFor);
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledFor datetime" }, { status: 400 });
  }
  if (when.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  const article = db.select().from(schema.articles).where(eq(schema.articles.id, id)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const connector = db.select().from(schema.connectors).where(eq(schema.connectors.id, connectorId)).get();
  if (!connector || connector.domainId !== article.domainId) {
    return NextResponse.json({ error: "Connector not found for this domain" }, { status: 404 });
  }

  db.update(schema.articles)
    .set({
      status: "scheduled",
      scheduledFor: when.toISOString(),
      publishConnectorId: connectorId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.articles.id, id))
    .run();

  return NextResponse.json({
    id,
    status: "scheduled",
    scheduledFor: when.toISOString(),
    connectorId,
  });
}

// DELETE /api/articles/:id/schedule — cancel schedule
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = db.select().from(schema.articles).where(eq(schema.articles.id, id)).get();
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  if (article.status !== "scheduled") {
    return NextResponse.json({ error: "Article is not scheduled" }, { status: 400 });
  }

  db.update(schema.articles)
    .set({
      status: "approved",
      scheduledFor: null,
      publishConnectorId: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.articles.id, id))
    .run();

  return NextResponse.json({ id, status: "approved", message: "Schedule cancelled" });
}
