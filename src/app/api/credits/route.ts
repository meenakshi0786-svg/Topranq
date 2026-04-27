import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";

// GET /api/credits/balance
export async function GET() {
  const user = await getOrCreateUser();
  const plan = user.plan as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];

  // Calculate used credits this month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const usedCredits = db
    .select({ total: sql<number>`COALESCE(SUM(credits_used), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, user.id))
    .get();

  return NextResponse.json({
    plan: user.plan,
    email: user.email,
    isDemo: user.email === "demo@ranqapex.com",
    credits: {
      total: limits.credits,
      used: usedCredits?.total || 0,
      remaining: limits.credits - (usedCredits?.total || 0),
    },
    limits,
  });
}
