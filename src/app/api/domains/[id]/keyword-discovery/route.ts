import { NextRequest, NextResponse } from "next/server";
import { discoverKeywords } from "@/lib/keyword-discovery";

// GET /api/domains/:id/keyword-discovery — discover keyword opportunities
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
