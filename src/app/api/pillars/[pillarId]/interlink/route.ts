import { NextRequest, NextResponse } from "next/server";
import { interlinkPillarCluster } from "@/lib/interlinker";

/**
 * POST /api/pillars/:pillarId/interlink
 * Runs AI-powered interlinking between a pillar article and its cluster articles.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pillarId: string }> },
) {
  const { pillarId } = await params;

  try {
    const result = await interlinkPillarCluster(pillarId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[interlink] failed:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Interlinking failed" },
      { status: 500 },
    );
  }
}
