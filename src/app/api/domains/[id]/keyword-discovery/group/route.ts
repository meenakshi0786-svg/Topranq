import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { groupKeywordsIntoPillars, type DiscoveredKeyword } from "@/lib/keyword-discovery";

// POST /api/domains/:id/keyword-discovery/group — group selected keywords into pillars
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
