import { NextRequest, NextResponse } from "next/server";
import { discoverKeywords } from "@/lib/keyword-discovery";
import { getOrCreateUser, isPaidUser } from "@/lib/auth";

// GET /api/domains/:id/keyword-discovery — discover keyword opportunities
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!isPaidUser(user)) {
    return NextResponse.json({ error: "Please purchase a plan to use the Keyword Planner." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const keywords = await discoverKeywords(id);
    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("[keyword-discovery] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
