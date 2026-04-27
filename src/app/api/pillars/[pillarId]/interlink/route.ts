import { NextRequest, NextResponse } from "next/server";
import { getInterlinkSuggestions, applyInterlinkSuggestions } from "@/lib/interlinker";
import { getOrCreateUser, isPaidUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// GET /api/pillars/:pillarId/interlink — get saved suggestions or generate new ones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pillarId: string }> },
) {
  const user = await getOrCreateUser();
  if (!isPaidUser(user)) {
    return NextResponse.json({ error: "Please purchase a plan." }, { status: 403 });
  }
  const { pillarId } = await params;
  const action = request.nextUrl.searchParams.get("action");

  // If action=generate, run AI and save to DB
  if (action === "generate") {
    try {
      const aiSuggestions = await getInterlinkSuggestions(pillarId);

      // Clear old suggestions for this pillar
      db.delete(schema.interlinkSuggestions)
        .where(eq(schema.interlinkSuggestions.pillarId, pillarId))
        .run();

      // Save new suggestions
      for (const s of aiSuggestions) {
        db.insert(schema.interlinkSuggestions)
          .values({
            pillarId,
            articleId: s.articleId,
            articleTitle: s.articleTitle,
            find: s.find,
            replace: s.replace,
            targetSlug: s.targetSlug,
            targetTitle: s.targetTitle,
            direction: s.direction,
            status: "pending",
          })
          .run();
      }

      // Return saved suggestions
      const saved = db.select().from(schema.interlinkSuggestions)
        .where(eq(schema.interlinkSuggestions.pillarId, pillarId))
        .all();
      return NextResponse.json({ suggestions: saved });
    } catch (err) {
      console.error("[interlink] generate failed:", err);
      return NextResponse.json(
        { error: (err as Error).message || "Failed to get suggestions" },
        { status: 500 },
      );
    }
  }

  // Default: return saved suggestions from DB
  const saved = db.select().from(schema.interlinkSuggestions)
    .where(eq(schema.interlinkSuggestions.pillarId, pillarId))
    .all();
  return NextResponse.json({ suggestions: saved });
}

// POST /api/pillars/:pillarId/interlink — accept or reject a single suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pillarId: string }> },
) {
  const { pillarId: _pillarId } = await params;
  const body = await request.json();
  const { suggestionId, action } = body as { suggestionId: string; action: "accept" | "reject" };

  if (!suggestionId || !action) {
    return NextResponse.json({ error: "Missing suggestionId or action" }, { status: 400 });
  }

  const suggestion = db.select().from(schema.interlinkSuggestions)
    .where(eq(schema.interlinkSuggestions.id, suggestionId))
    .get();

  if (!suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  if (action === "accept") {
    // Apply this single suggestion to the article
    const result = await applyInterlinkSuggestions([{
      articleId: suggestion.articleId,
      find: suggestion.find,
      replace: suggestion.replace,
    }]);

    // Update status
    db.update(schema.interlinkSuggestions)
      .set({ status: "applied" })
      .where(eq(schema.interlinkSuggestions.id, suggestionId))
      .run();

    return NextResponse.json({ success: true, applied: result.applied, status: "applied" });
  }

  if (action === "reject") {
    db.update(schema.interlinkSuggestions)
      .set({ status: "rejected" })
      .where(eq(schema.interlinkSuggestions.id, suggestionId))
      .run();
    return NextResponse.json({ success: true, status: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
