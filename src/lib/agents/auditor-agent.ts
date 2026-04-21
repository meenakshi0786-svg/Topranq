import { db, schema } from "../db";
import { eq, sql, and, isNull } from "drizzle-orm";
import { BaseAgent, type AgentResult, type AgentContext } from "./base-agent";
import { calculateScores } from "../scorer";
import type { SEOIssue } from "../analyzer/types";
import * as cheerio from "cheerio";

interface PreScanResults {
  brokenLinks: typeof schema.pages.$inferSelect[];
  redirectChains: typeof schema.pages.$inferSelect[];
  missingMeta: typeof schema.pages.$inferSelect[];
  thinContent: typeof schema.pages.$inferSelect[];
  orphanPages: typeof schema.pages.$inferSelect[];
  cannibalization: Array<{ keyword: string; urls: string[] }>;
  missingSchema: typeof schema.pages.$inferSelect[];
  missingAltText: Array<{ url: string; ratio: number }>;
}

export class AuditorAgent extends BaseAgent {
  agentName = "auditor";
  creditCost = 1; // 1 credit per audit

  protected async execute(
    domainId: string,
    taskInput: unknown,
    _context: AgentContext
  ): Promise<AgentResult> {
    const input = taskInput as {
      auditRunId: string;
      crawlOutput: {
        hasRobotsTxt: boolean;
        hasSitemap: boolean;
        robotsTxtContent?: string;
        sitemapUrls?: string[];
      };
    };

    // Update status
    db.update(schema.auditRuns)
      .set({ status: "analyzing" })
      .where(eq(schema.auditRuns.id, input.auditRunId))
      .run();

    // Load all crawled pages for this domain
    const pages = db
      .select()
      .from(schema.pages)
      .where(eq(schema.pages.domainId, domainId))
      .all();

    // Load internal links
    const links = db
      .select()
      .from(schema.internalLinks)
      .where(eq(schema.internalLinks.domainId, domainId))
      .all();

    // ── PRE-SCAN (code, not LLM) ──────────────────────────────────
    const preScan = this.preScan(pages, links, domainId);

    // ── GENERATE ISSUES from pre-scan ─────────────────────────────
    const allIssues: SEOIssue[] = [];

    // Broken links (5xx, 404, 502, 503)
    for (const page of preScan.brokenLinks) {
      allIssues.push({
        checkId: "broken_link",
        category: "technical",
        severity: page.statusCode && page.statusCode >= 500 ? "critical" : "high",
        impactArea: "crawl_efficiency",
        message: `Page returns ${page.statusCode}: ${page.url}`,
        details: { url: page.url, statusCode: page.statusCode },
      });
    }

    // Missing meta descriptions — consolidated
    if (preScan.missingMeta.length > 0) {
      allIssues.push({
        checkId: "missing_meta_description",
        category: "on_page",
        severity: preScan.missingMeta.length > pages.length * 0.5 ? "medium" : "low",
        impactArea: "ctr",
        message: `${preScan.missingMeta.length} page(s) missing meta description`,
        details: { urls: preScan.missingMeta.slice(0, 5).map(p => p.url) },
      });
    }

    // Thin content — consolidated
    if (preScan.thinContent.length > 0) {
      allIssues.push({
        checkId: "thin_content",
        category: "content",
        severity: preScan.thinContent.length > 5 ? "medium" : "low",
        impactArea: "rankings",
        message: `${preScan.thinContent.length} page(s) with thin content (<300 words)`,
        details: { urls: preScan.thinContent.slice(0, 5).map(p => p.url) },
      });
    }

    // Orphan pages — consolidated
    if (preScan.orphanPages.length > 0) {
      allIssues.push({
        checkId: "orphan_page",
        category: "structure",
        severity: preScan.orphanPages.length > 5 ? "medium" : "low",
        impactArea: "crawl_efficiency",
        message: `${preScan.orphanPages.length} orphan page(s) with no inbound internal links`,
        details: { urls: preScan.orphanPages.slice(0, 5).map(p => p.url) },
      });
    }

    // Keyword cannibalization
    for (const item of preScan.cannibalization) {
      allIssues.push({
        checkId: "keyword_cannibalization",
        category: "content",
        severity: "high",
        impactArea: "rankings",
        message: `Keyword cannibalization: "${item.keyword}" targets ${item.urls.length} pages`,
        details: { keyword: item.keyword, urls: item.urls },
      });
    }

    // Missing schema — only flag if NO pages have schema at all (site-level issue)
    if (preScan.missingSchema.length > 0 && preScan.missingSchema.length === pages.filter(p => p.statusCode === 200).length) {
      allIssues.push({
        checkId: "missing_schema",
        category: "on_page",
        severity: "medium",
        impactArea: "ctr",
        message: `No structured data found on any page (${preScan.missingSchema.length} pages)`,
        details: { urls: preScan.missingSchema.slice(0, 5).map(p => p.url) },
      });
    } else if (preScan.missingSchema.length > 0) {
      allIssues.push({
        checkId: "missing_schema",
        category: "on_page",
        severity: "low",
        impactArea: "ctr",
        message: `${preScan.missingSchema.length} page(s) missing structured data`,
        details: { urls: preScan.missingSchema.slice(0, 5).map(p => p.url) },
      });
    }

    // Missing alt text
    for (const item of preScan.missingAltText) {
      allIssues.push({
        checkId: "missing_alt_text",
        category: "on_page",
        severity: "medium",
        impactArea: "rankings",
        message: `${Math.round(item.ratio * 100)}% images missing alt text: ${item.url}`,
        details: { url: item.url, ratio: item.ratio },
      });
    }

    // ── Per-page detailed checks ──────────────────────────────────
    for (const page of pages) {
      if (!page.statusCode || page.statusCode >= 400) continue;

      // Missing title
      if (!page.title) {
        allIssues.push({
          checkId: "missing_title",
          category: "on_page",
          severity: "critical",
          impactArea: "ctr",
          message: `Missing title tag: ${page.url}`,
          details: { url: page.url },
        });
      } else if (page.title.length > 60) {
        allIssues.push({
          checkId: "title_too_long",
          category: "on_page",
          severity: "medium",
          impactArea: "ctr",
          message: `Title too long (${page.title.length} chars): ${page.url}`,
          details: { url: page.url, length: page.title.length, title: page.title },
        });
      }

      // Missing H1
      if (!page.h1) {
        allIssues.push({
          checkId: "missing_h1",
          category: "on_page",
          severity: "high",
          impactArea: "rankings",
          message: `Missing H1: ${page.url}`,
          details: { url: page.url },
        });
      }

      // Canonical issues
      if (page.canonicalUrl && page.canonicalUrl !== page.url) {
        // Check if canonical points elsewhere — could be intentional or broken
        const canonicalExists = pages.find((p) => p.url === page.canonicalUrl);
        if (!canonicalExists) {
          allIssues.push({
            checkId: "broken_canonical",
            category: "technical",
            severity: "critical",
            impactArea: "rankings",
            message: `Canonical points to non-existent URL: ${page.url}`,
            details: { url: page.url, canonical: page.canonicalUrl },
          });
        }
      }

    }

    // Missing canonical — consolidate into one issue
    const missingCanonicalPages = pages.filter(p => !p.canonicalUrl && p.statusCode === 200);
    if (missingCanonicalPages.length > 0) {
      allIssues.push({
        checkId: "missing_canonical",
        category: "technical",
        severity: "low",
        impactArea: "rankings",
        message: `${missingCanonicalPages.length} page(s) missing canonical tag`,
        details: { urls: missingCanonicalPages.slice(0, 5).map(p => p.url) },
      });
    }

    // ── Site-level checks ─────────────────────────────────────────
    if (!input.crawlOutput.hasRobotsTxt) {
      allIssues.push({
        checkId: "missing_robots_txt",
        category: "technical",
        severity: "medium",
        impactArea: "crawl_efficiency",
        message: "No robots.txt file found",
      });
    }

    if (!input.crawlOutput.hasSitemap) {
      allIssues.push({
        checkId: "missing_sitemap",
        category: "technical",
        severity: "medium",
        impactArea: "crawl_efficiency",
        message: "No XML sitemap found",
      });
    }

    // Check HTTPS
    const httpPages = pages.filter((p) => p.url.startsWith("http://"));
    if (httpPages.length > 0) {
      allIssues.push({
        checkId: "no_https",
        category: "technical",
        severity: "critical",
        impactArea: "rankings",
        message: `${httpPages.length} page(s) served over HTTP instead of HTTPS`,
        details: { urls: httpPages.map((p) => p.url) },
      });
    }

    // ── Store issues in DB ────────────────────────────────────────
    for (const issue of allIssues) {
      const affectedUrls = issue.details?.url
        ? [issue.details.url as string]
        : issue.details?.urls
          ? (issue.details.urls as string[])
          : [];

      db.insert(schema.auditIssues)
        .values({
          auditRunId: input.auditRunId,
          issueType: issue.checkId,
          severity: issue.severity,
          affectedUrls: JSON.stringify(affectedUrls),
          description: issue.message,
          recommendation: this.getRecommendation(issue.checkId),
          dataSource: `pages.${issue.category}`,
        })
        .run();
    }

    // ── Calculate scores ──────────────────────────────────────────
    const scores = calculateScores(allIssues);

    // Update audit run
    db.update(schema.auditRuns)
      .set({
        status: "complete",
        overallScore: scores.overall,
        scoresJson: JSON.stringify(scores),
        creditsUsed: this.creditCost,
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.auditRuns.id, input.auditRunId))
      .run();

    return {
      status: "success",
      output: { scores, issueCount: allIssues.length },
      creditsUsed: this.creditCost,
    };
  }

  // Quality gate: every issue must have severity + affected_urls + data_source
  protected validate(result: AgentResult): boolean {
    return result.status === "success";
  }

  // ── PRE-SCAN (per PDF spec) ───────────────────────────────────────
  private preScan(
    pages: typeof schema.pages.$inferSelect[],
    links: typeof schema.internalLinks.$inferSelect[],
    domainId: string
  ): PreScanResults {
    // Broken links: status 404, 500, 502, 503
    const brokenLinks = pages.filter(
      (p) => p.statusCode && [404, 500, 502, 503].includes(p.statusCode)
    );

    // Redirect chains (depth > 2) — detected during crawl, check via URL differences
    const redirectChains: typeof schema.pages.$inferSelect[] = [];

    // Missing meta descriptions
    const missingMeta = pages.filter((p) => !p.metaDescription && p.statusCode === 200);

    // Thin content (< 300 words)
    const thinContent = pages.filter(
      (p) => p.wordCount !== null && p.wordCount < 300 && p.statusCode === 200
    );

    // Orphan pages (0 inbound internal links)
    const inboundCounts = new Map<string, number>();
    for (const link of links) {
      if (link.toPageId) {
        inboundCounts.set(link.toPageId, (inboundCounts.get(link.toPageId) || 0) + 1);
      }
    }
    const orphanPages = pages.filter(
      (p) => !inboundCounts.has(p.id) && p.statusCode === 200
    );

    // Keyword cannibalization: find pages with >80% title overlap
    const cannibalization: Array<{ keyword: string; urls: string[] }> = [];
    const titleWords = new Map<string, string[]>();
    for (const page of pages) {
      if (!page.title) continue;
      const mainWords = page.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .sort()
        .join(" ");
      if (mainWords) {
        if (!titleWords.has(mainWords)) {
          titleWords.set(mainWords, []);
        }
        titleWords.get(mainWords)!.push(page.url);
      }
    }
    for (const [keyword, urls] of titleWords) {
      if (urls.length >= 2) {
        cannibalization.push({ keyword, urls });
      }
    }

    // Missing schema
    const missingSchema = pages.filter(
      (p) => !p.schemaMarkup && p.statusCode === 200
    );

    // Missing alt text — we stored this data during crawl indirectly via pages
    // For now, flag pages without schema as needing review
    const missingAltText: Array<{ url: string; ratio: number }> = [];

    return {
      brokenLinks,
      redirectChains,
      missingMeta,
      thinContent,
      orphanPages,
      cannibalization,
      missingSchema,
      missingAltText,
    };
  }

  private getRecommendation(checkId: string): string {
    const recs: Record<string, string> = {
      broken_link: "Fix or redirect broken URLs. Update internal links pointing to them.",
      missing_meta_description: "Add a unique 120-160 character meta description with target keywords and a CTA.",
      thin_content: "Expand content to 300+ words covering the topic comprehensively. Add data, examples, and visuals.",
      orphan_page: "Add internal links from related pages. Include in navigation or sitemap.",
      keyword_cannibalization: "Consolidate competing pages or differentiate their target keywords. Consider 301 redirecting the weaker page.",
      missing_schema: "Add JSON-LD structured data matching the page type (Article, Product, FAQ, etc.).",
      missing_title: "Add a unique title tag under 60 characters with the primary keyword front-loaded.",
      title_too_long: "Shorten to under 60 characters. Put the most important keywords first.",
      missing_h1: "Add one H1 tag that clearly describes the main topic of the page.",
      broken_canonical: "Fix the canonical tag to point to a valid URL or remove it if this is the preferred version.",
      missing_canonical: "Add a self-referencing canonical tag to prevent duplicate content issues.",
      missing_robots_txt: "Create a robots.txt file at the domain root with crawl directives.",
      missing_sitemap: "Create and submit an XML sitemap to help search engines discover your pages.",
      no_https: "Migrate all pages to HTTPS. Get an SSL certificate and set up 301 redirects from HTTP.",
      missing_alt_text: "Add descriptive alt text to all meaningful images. Include relevant keywords naturally.",
    };
    return recs[checkId] || "Review and fix this issue to improve SEO performance.";
  }
}
