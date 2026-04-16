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

async function checkLlmsTxt(domainUrl: string): Promise<boolean> {
  try {
    const base = new URL(domainUrl).origin;
    const res = await fetch(`${base}/llms.txt`, {
      headers: { "User-Agent": "RanqapexBot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    if (text.trim().length < 20) return false;
    if (/<html|<!doctype html/i.test(text.slice(0, 200))) return false;
    return true;
  } catch {
    return false;
  }
}

// Parse a sitemap.xml (or sitemap index) and return all URLs.
// Handles nested sitemap indexes up to 1 level deep.
async function fetchSitemapUrls(domainUrl: string, maxUrls = 500): Promise<string[]> {
  try {
    const base = new URL(domainUrl).origin;
    const urls = new Set<string>();

    // Try robots.txt for sitemap hints first
    const sitemaps = new Set<string>([`${base}/sitemap.xml`, `${base}/sitemap_index.xml`]);
    try {
      const robotsRes = await fetch(`${base}/robots.txt`, {
        signal: AbortSignal.timeout(5000),
      });
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        const matches = robotsText.matchAll(/sitemap:\s*(https?:\/\/[^\s]+)/gi);
        for (const m of matches) sitemaps.add(m[1].trim());
      }
    } catch { /* skip */ }

    async function parseSitemap(url: string, depth = 0): Promise<void> {
      if (depth > 2 || urls.size >= maxUrls) return;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "RanqapexBot/1.0" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return;
        const xml = await res.text();
        const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

        // If <sitemapindex>, recurse into each child sitemap
        if (/<sitemapindex/i.test(xml)) {
          for (const childUrl of locs.slice(0, 20)) {
            if (urls.size >= maxUrls) break;
            await parseSitemap(childUrl, depth + 1);
          }
        } else {
          for (const u of locs) {
            if (urls.size >= maxUrls) break;
            urls.add(u);
          }
        }
      } catch { /* skip this sitemap */ }
    }

    for (const sm of sitemaps) {
      if (urls.size >= maxUrls) break;
      await parseSitemap(sm);
    }

    return Array.from(urls);
  } catch {
    return [];
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
    const sitemapUrls = await fetchSitemapUrls(domain.domainUrl);
    const content = await generateLlmsTxt(domain.domainUrl, pages, sitemapUrls);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="llms.txt"`,
      },
    });
  }

  // ── Full GEO report ──
  const [robotsTxt, hasLlmsTxt] = await Promise.all([
    fetchRobotsTxt(domain.domainUrl),
    checkLlmsTxt(domain.domainUrl),
  ]);
  const report = buildGEOReport(pages, robotsTxt, hasLlmsTxt);

  return NextResponse.json({
    domain: { id: domain.id, url: domain.domainUrl },
    ...report,
  });
}
