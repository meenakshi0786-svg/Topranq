import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { buildGEOReport, generateLlmsTxt } from "@/lib/geo/score";

async function fetchRobotsTxt(domainUrl: string): Promise<string | null> {
  try {
    const base = new URL(domainUrl).origin;
    const res = await fetch(`${base}/robots.txt`, {
      headers: { "User-Agent": "RanqapexBot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// GET /api/domains/:id/geo — GEO report + llms.txt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const action = request.nextUrl.searchParams.get("action");

  const domain = await db.query.domains.findFirst({
    where: eq(schema.domains.id, id),
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const pages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, id))
    .all();

  if (pages.length === 0) {
    return NextResponse.json({
      error: "No pages crawled yet. Run an audit first.",
    }, { status: 400 });
  }

  // ── llms.txt download ──
  if (action === "llms-txt") {
    const content = generateLlmsTxt(domain.domainUrl, pages);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="llms.txt"`,
      },
    });
  }

  // ── Full GEO report ──
  const robotsTxt = await fetchRobotsTxt(domain.domainUrl);
  const report = buildGEOReport(pages, robotsTxt);

  return NextResponse.json({
    domain: { id: domain.id, url: domain.domainUrl },
    ...report,
  });
}
