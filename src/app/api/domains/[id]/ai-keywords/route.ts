import { NextRequest, NextResponse } from "next/server";
import { runAIKeywordResearch } from "@/lib/ai-keyword-research";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const research = await runAIKeywordResearch(id);
    return NextResponse.json(research);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI keyword research failed" },
      { status: 500 }
    );
  }
}
