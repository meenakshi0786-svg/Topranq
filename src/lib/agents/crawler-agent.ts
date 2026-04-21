import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { crawlSite, extractAllLinks, hashHtml } from "../crawler";
import { BaseAgent, type AgentResult, type AgentContext } from "./base-agent";
import * as cheerio from "cheerio";

export class CrawlerAgent extends BaseAgent {
  agentName = "crawler";
  creditCost = 0; // No LLM calls

  protected async execute(
    domainId: string,
    taskInput: unknown,
    _context: AgentContext
  ): Promise<AgentResult> {
    const input = taskInput as { auditRunId: string; maxPages: number };
    const domain = await db.query.domains.findFirst({
      where: eq(schema.domains.id, domainId),
    });
    if (!domain) return { status: "failed", errors: ["Domain not found"], creditsUsed: 0 };

    const startUrl = domain.domainUrl.startsWith("http")
      ? domain.domainUrl
      : `https://${domain.domainUrl}`;

    // Update audit run status
    db.update(schema.auditRuns)
      .set({ status: "crawling" })
      .where(eq(schema.auditRuns.id, input.auditRunId))
      .run();

    // Fetch robots.txt and sitemap
    const origin = new URL(startUrl).origin;
    let robotsTxtContent: string | undefined;
    let sitemapUrls: string[] = [];

    try {
      const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) robotsTxtContent = await res.text();
    } catch { /* no robots.txt */ }

    try {
      const res = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        const matches = text.match(/<loc>(.*?)<\/loc>/g);
        if (matches) sitemapUrls = matches.map((m) => m.replace(/<\/?loc>/g, ""));
      }
    } catch { /* no sitemap */ }

    // Delete old pages and links for this domain before re-crawling
    db.delete(schema.internalLinks)
      .where(eq(schema.internalLinks.domainId, domainId))
      .run();
    db.delete(schema.pages)
      .where(eq(schema.pages.domainId, domainId))
      .run();

    // Crawl — seed with sitemap URLs so we don't rely only on link discovery
    const crawlResults = await crawlSite(
      startUrl,
      { maxPages: input.maxPages },
      (progress) => {
        db.update(schema.auditRuns)
          .set({ pagesFound: progress.pagesFound, pagesCrawled: progress.pagesCrawled })
          .where(eq(schema.auditRuns.id, input.auditRunId))
          .run();
      },
      sitemapUrls
    );

    // Store pages in knowledge graph
    const pageIdMap = new Map<string, string>();
    for (const result of crawlResults) {
      const $ = result.html ? cheerio.load(result.html) : null;
      const pageId = crypto.randomUUID();

      db.insert(schema.pages)
        .values({
          id: pageId,
          domainId,
          url: result.url,
          title: $?.("title").first().text().trim() || null,
          metaDescription: $?.('meta[name="description"]').attr("content")?.trim() || null,
          h1: $?.("h1").first().text().trim() || null,
          wordCount: getWordCount(result.html),
          statusCode: result.statusCode,
          canonicalUrl: $?.('link[rel="canonical"]').attr("href") || null,
          schemaMarkup: extractSchemaMarkup($),
          pageSpeedJson: JSON.stringify({ loadTimeMs: result.loadTimeMs }),
        })
        .run();

      pageIdMap.set(result.url, pageId);
    }

    // Build internal link graph
    for (const result of crawlResults) {
      if (!result.html) continue;
      const sourceId = pageIdMap.get(result.url);
      if (!sourceId) continue;

      const links = extractAllLinks(result.html, result.url);
      for (const link of links) {
        if (!link.isInternal) continue;
        const toId = pageIdMap.get(link.href);
        db.insert(schema.internalLinks)
          .values({
            domainId,
            fromPageId: sourceId,
            toPageId: toId || null,
            anchorText: link.anchor || null,
          })
          .run();
      }
    }

    // Update audit run
    db.update(schema.auditRuns)
      .set({ pagesCrawled: crawlResults.length, pagesFound: crawlResults.length })
      .where(eq(schema.auditRuns.id, input.auditRunId))
      .run();

    return {
      status: "success",
      output: {
        pagesCrawled: crawlResults.length,
        hasRobotsTxt: !!robotsTxtContent,
        hasSitemap: sitemapUrls.length > 0,
        sitemapUrls,
        robotsTxtContent,
      },
      creditsUsed: 0,
    };
  }
}

function getWordCount(html: string): number {
  if (!html) return 0;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(" ").filter((w) => w.length > 0).length;
}

function extractSchemaMarkup($: cheerio.CheerioAPI | null): string | null {
  if (!$) return null;
  const scripts: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    if (content) scripts.push(content);
  });
  return scripts.length > 0 ? JSON.stringify(scripts) : null;
}
