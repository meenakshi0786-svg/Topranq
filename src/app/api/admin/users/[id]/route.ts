import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser, isAdmin } from "@/lib/auth";

const VALID_PLANS = ["free", "dollar1", "dollar5"] as const;
type Plan = typeof VALID_PLANS[number];

// PATCH /api/admin/users/:id — change plan (manual override). Admin-only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getOrCreateUser();
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { plan } = body as { plan?: string };

  if (!plan || !VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: "Invalid plan. Use: free, dollar1, dollar5" }, { status: 400 });
  }

  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // For paid plans, set planPurchasedAt to now (starts the 30-day window).
  // For free plan, clear it.
  const planPurchasedAt = plan === "free" ? null : new Date().toISOString();

  db.update(schema.users)
    .set({ plan, planPurchasedAt })
    .where(eq(schema.users.id, id))
    .run();

  return NextResponse.json({ success: true, userId: id, plan, planPurchasedAt });
}

// DELETE /api/admin/users/:id — delete user and all their data. Admin-only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getOrCreateUser();
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Refuse to delete yourself or another admin (safety)
  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (isAdmin(target.email)) {
    return NextResponse.json({ error: "Cannot delete admin users via this endpoint" }, { status: 400 });
  }
  if (target.email === "demo@ranqapex.com") {
    return NextResponse.json({ error: "Cannot delete the demo user" }, { status: 400 });
  }

  // Cascade delete: domains -> dependent rows are removed via FK ON DELETE CASCADE
  db.delete(schema.users).where(eq(schema.users.id, id)).run();

  return NextResponse.json({ success: true, deletedUserId: id });
}
