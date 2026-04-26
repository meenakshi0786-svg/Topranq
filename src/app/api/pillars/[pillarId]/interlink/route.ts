import { NextRequest, NextResponse } from "next/server";
import { getInterlinkSuggestions, applyInterlinkSuggestions } from "@/lib/interlinker";
import { getOrCreateUser, isPaidUser } from "@/lib/auth";

// GET /api/pillars/:pillarId/interlink — get suggestions without applying
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pillarId: string }> },
) {
  const user = await getOrCreateUser();
  if (!isPaidUser(user)) {
    return NextResponse.json({ error: "Please purchase a plan." }, { status: 403 });
  }
  const { pillarId } = await params;
  try {
    const suggestions = await getInterlinkSuggestions(pillarId);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[interlink] suggestions failed:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to get suggestions" },
      { status: 500 },
    );
  }
}

// POST /api/pillars/:pillarId/interlink — apply selected suggestions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pillarId: string }> },
) {
  const { pillarId: _pillarId } = await params;
  const body = await request.json();
  const { suggestions } = body as {
    suggestions: Array<{ articleId: string; find: string; replace: string }>;
  };

  if (!suggestions || suggestions.length === 0) {
    return NextResponse.json({ error: "No suggestions provided" }, { status: 400 });
  }

  try {
    const result = await applyInterlinkSuggestions(suggestions);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[interlink] apply failed:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to apply links" },
      { status: 500 },
    );
  }
}
