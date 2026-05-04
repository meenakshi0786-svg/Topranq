import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { groupKeywordsIntoPillars, type DiscoveredKeyword } from "@/lib/keyword-discovery";
import { getOrCreateUser, isRealUser, isAdmin, isPaidUser } from "@/lib/auth";

// POST /api/domains/:id/keyword-discovery/group — group selected keywords into pillars
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!isRealUser(user.email)) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const keywords = body.keywords as DiscoveredKeyword[];

  if (!keywords || keywords.length === 0) {
    return NextResponse.json({ error: "No keywords provided" }, { status: 400 });
  }

  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, id)).get();
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Free users get only 1 content plan per domain. Paid users + admins are unlimited.
  if (!isAdmin(user.email) && !isPaidUser(user)) {
    const existingPillars = db.select().from(schema.pillars).where(eq(schema.pillars.domainId, id)).all();
    if (existingPillars.length > 0) {
      return NextResponse.json(
        { error: "Free plan allows 1 content plan per domain. Upgrade to generate new plans." },
        { status: 403 }
      );
    }
  }

  try {
    const pillars = await groupKeywordsIntoPillars(
      domain.domainUrl,
      keywords,
      domain.language || "English"
    );
    return NextResponse.json({ pillars });
  } catch (error) {
    console.error("[keyword-discovery/group] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Grouping failed" },
      { status: 500 }
    );
  }
}
