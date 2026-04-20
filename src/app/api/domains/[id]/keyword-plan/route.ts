import { NextRequest, NextResponse } from "next/server";
import { generateKeywordPlan } from "@/lib/keyword-planner";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const plan = await generateKeywordPlan(id);
    return NextResponse.json(plan);
  } catch (err) {
    console.error("[keyword-plan] failed:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to generate keyword plan" },
      { status: 500 },
    );
  }
}
