import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// GET /api/domains/:id/history — full action log
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const actions = db
    .select()
    .from(schema.agentActions)
    .where(eq(schema.agentActions.domainId, id))
    .orderBy(desc(schema.agentActions.timestamp))
    .limit(100)
    .all();

  return NextResponse.json(actions);
}
