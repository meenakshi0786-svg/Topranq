import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/agents/orchestrator";

const CREDIT_PACKS = [
  { id: "pack_10", credits: 10, price: 5, label: "10 Credits" },
  { id: "pack_25", credits: 25, price: 10, label: "25 Credits" },
  { id: "pack_50", credits: 50, price: 18, label: "50 Credits" },
  { id: "pack_100", credits: 100, price: 30, label: "100 Credits" },
];

export async function GET() {
  return NextResponse.json({ packs: CREDIT_PACKS });
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const { packId } = body;

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
  }

  // For MVP: simulate purchase by adding credits as a negative deduction
  // (creditsUsed is negative = credit topup)
  const currentUsed = db
    .select({ total: sql<number>`COALESCE(SUM(credits_used), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, user.id))
    .get();

  const plan = user.plan as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const currentBalance = limits.credits - (currentUsed?.total || 0);

  db.insert(schema.creditLedger)
    .values({
      userId: user.id,
      action: "credit_purchase",
      creditsUsed: -pack.credits, // Negative = adding credits
      balanceAfter: currentBalance + pack.credits,
      agent: "billing",
    })
    .run();

  return NextResponse.json({
    success: true,
    creditsAdded: pack.credits,
    newBalance: currentBalance + pack.credits,
  });
}
