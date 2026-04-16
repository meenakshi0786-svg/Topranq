import type { InferSelectModel } from "drizzle-orm";
import type { pages as pagesTable } from "../db/schema";

type PageRow = InferSelectModel<typeof pagesTable>;

export interface PageGEOScore {
  pageId: string;
  url: string;
  title: string | null;
  score: number; // 0-100
  checks: {
    hasClearTitle: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    hasMinContent: boolean;
    hasSchema: boolean;
    hasFaqSchema: boolean;
    hasArticleSchema: boolean;
    canonicalSet: boolean;
  };
  suggestions: string[];
}

export interface DomainGEOReport {
  overallScore: number; // 0-100, weighted average across pages
  pagesAnalyzed: number;
  aiCrawlers: {
    checked: boolean;
    allowed: string[];
    blocked: string[];
    wildcardBlock: boolean;
  };
  hasLlmsTxt: boolean;
  pageScores: PageGEOScore[];
  topIssues: Array<{
    issue: string;
    affectedCount: number;
    recommendation: string;
    severity: "high" | "medium" | "low";
    affectedPages: Array<{ url: string; title: string | null; suggestion: string }>;
  }>;
}

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Bytespider",
  "CCBot",
];

export function scorePage(page: PageRow): PageGEOScore {
  const schema = page.schemaMarkup || "";
  const hasSchema = schema.length > 10;
  const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/i.test(schema);
  const hasArticleSchema = /"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/i.test(schema);

  const hasClearTitle = !!(page.title && page.title.length >= 20 && page.title.length <= 70);
  const hasMetaDescription = !!(page.metaDescription && page.metaDescription.length >= 80 && page.metaDescription.length <= 180);
  const hasH1 = !!(page.h1 && page.h1.trim().length > 0);
  const hasMinContent = (page.wordCount || 0) >= 300;
  const canonicalSet = !!page.canonicalUrl;

  // Weighted scoring
  let score = 0;
  if (hasClearTitle) score += 15;
  else if (page.title) score += 5;

  if (hasMetaDescription) score += 15;
  else if (page.metaDescription) score += 5;

  if (hasH1) score += 15;
  if (hasMinContent) score += 15;
  if (hasSchema) score += 10;
  if (hasFaqSchema) score += 15;
  if (hasArticleSchema) score += 10;
  if (canonicalSet) score += 5;

  const suggestions: string[] = [];
  if (!hasClearTitle) suggestions.push("Tighten page title to 20–70 characters with primary keyword");
  if (!hasMetaDescription) suggestions.push("Add a 80–180 character meta description — AI engines use this as citation preview");
  if (!hasH1) suggestions.push("Add a single descriptive H1 heading");
  if (!hasMinContent) suggestions.push("Expand content to 300+ words so AI engines have enough to extract");
  if (!hasSchema) suggestions.push("Add JSON-LD structured data");
  if (!hasFaqSchema && (page.wordCount || 0) > 500) suggestions.push("Add FAQPage schema — the single biggest lift for AI citation");
  if (!hasArticleSchema && (page.wordCount || 0) > 500) suggestions.push("Add Article or BlogPosting schema");
  if (!canonicalSet) suggestions.push("Set a canonical URL to avoid duplicate citation");

  return {
    pageId: page.id,
    url: page.url,
    title: page.title,
    score: Math.min(100, score),
    checks: {
      hasClearTitle,
      hasMetaDescription,
      hasH1,
      hasMinContent,
      hasSchema,
      hasFaqSchema,
      hasArticleSchema,
      canonicalSet,
    },
    suggestions,
  };
}

export function analyzeRobotsTxt(robotsTxt: string | null): {
  allowed: string[];
  blocked: string[];
  wildcardBlock: boolean;
} {
  if (!robotsTxt) {
    return { allowed: AI_CRAWLERS, blocked: [], wildcardBlock: false };
  }

  const blocked: string[] = [];
  const allowed: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const pattern = new RegExp(`user-agent:\\s*${crawler}[\\s\\S]*?disallow:\\s*/`, "i");
    if (pattern.test(robotsTxt)) {
      blocked.push(crawler);
    } else {
      allowed.push(crawler);
    }
  }

  const wildcardBlock = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/m.test(robotsTxt);

  return { allowed, blocked, wildcardBlock };
}

export function buildGEOReport(
  pages: PageRow[],
  robotsTxt: string | null,
  hasLlmsTxt: boolean = false
): DomainGEOReport {
  const pageScores = pages.map(scorePage);
  const overallScore =
    pageScores.length > 0
      ? Math.round(pageScores.reduce((sum, p) => sum + p.score, 0) / pageScores.length)
      : 0;

  const robotsAnalysis = analyzeRobotsTxt(robotsTxt);

  // Aggregate top issues
  const issueCount = {
    title: 0,
    meta: 0,
    h1: 0,
    content: 0,
    schema: 0,
    faq: 0,
    article: 0,
    canonical: 0,
  };
  for (const p of pageScores) {
    if (!p.checks.hasClearTitle) issueCount.title++;
    if (!p.checks.hasMetaDescription) issueCount.meta++;
    if (!p.checks.hasH1) issueCount.h1++;
    if (!p.checks.hasMinContent) issueCount.content++;
    if (!p.checks.hasSchema) issueCount.schema++;
    if (!p.checks.hasFaqSchema) issueCount.faq++;
    if (!p.checks.hasArticleSchema) issueCount.article++;
    if (!p.checks.canonicalSet) issueCount.canonical++;
  }

  // Helper: collect pages failing a specific check
  const pagesFor = (checkKey: keyof PageGEOScore["checks"], suggestion: string) =>
    pageScores
      .filter((p) => !p.checks[checkKey])
      .map((p) => ({ url: p.url, title: p.title, suggestion }));

  const topIssues: DomainGEOReport["topIssues"] = [];
  if (issueCount.faq > 0) topIssues.push({
    issue: "Missing FAQPage schema",
    affectedCount: issueCount.faq,
    recommendation: "Add FAQPage JSON-LD to pages with Q&A content — biggest lift for AI citation",
    severity: "high",
    affectedPages: pagesFor("hasFaqSchema", "Add FAQPage JSON-LD with Q&A pairs from existing content"),
  });
  if (issueCount.schema > 0) topIssues.push({
    issue: "No structured data",
    affectedCount: issueCount.schema,
    recommendation: "Add JSON-LD schema so AI engines can understand page context",
    severity: "high",
    affectedPages: pagesFor("hasSchema", "Add Article, Product, or Organization JSON-LD schema"),
  });
  if (robotsAnalysis.wildcardBlock || robotsAnalysis.blocked.length === AI_CRAWLERS.length) {
    topIssues.push({
      issue: "AI crawlers blocked in robots.txt",
      affectedCount: 1,
      recommendation: "Allow GPTBot, ClaudeBot, PerplexityBot, Google-Extended in robots.txt",
      severity: "high",
      affectedPages: [{ url: "/robots.txt", title: "robots.txt", suggestion: "Remove Disallow rules for AI user agents" }],
    });
  } else if (robotsAnalysis.blocked.length > 0) {
    topIssues.push({
      issue: `${robotsAnalysis.blocked.length} AI crawler(s) blocked`,
      affectedCount: robotsAnalysis.blocked.length,
      recommendation: `Unblock: ${robotsAnalysis.blocked.join(", ")}`,
      severity: "medium",
      affectedPages: robotsAnalysis.blocked.map((bot) => ({ url: "/robots.txt", title: bot, suggestion: `Allow ${bot} in robots.txt` })),
    });
  }
  if (!hasLlmsTxt) {
    topIssues.push({
      issue: "No llms.txt file",
      affectedCount: 1,
      recommendation: "Add an llms.txt file at your site root — use the generator on this page",
      severity: "medium",
      affectedPages: [{ url: "/llms.txt", title: "llms.txt", suggestion: "Generate and upload llms.txt to your site root" }],
    });
  }
  if (issueCount.meta > 0) topIssues.push({
    issue: "Weak meta descriptions",
    affectedCount: issueCount.meta,
    recommendation: "Write 80–180 char meta descriptions — AI engines use these as citation previews",
    severity: "medium",
    affectedPages: pagesFor("hasMetaDescription", "Write a unique 80–180 character meta description with target keyword"),
  });
  if (issueCount.content > 0) topIssues.push({
    issue: "Thin content",
    affectedCount: issueCount.content,
    recommendation: "Pages under 300 words are rarely cited — expand or consolidate",
    severity: "low",
    affectedPages: pagesFor("hasMinContent", "Expand to 300+ words or merge with a related page"),
  });

  return {
    overallScore,
    pagesAnalyzed: pages.length,
    aiCrawlers: {
      checked: robotsTxt !== null,
      allowed: robotsAnalysis.allowed,
      blocked: robotsAnalysis.blocked,
      wildcardBlock: robotsAnalysis.wildcardBlock,
    },
    hasLlmsTxt,
    pageScores: pageScores.sort((a, b) => a.score - b.score),
    topIssues,
  };
}

export function generateLlmsTxt(
  domainUrl: string,
  pages: PageRow[],
  sitemapUrls: string[] = [],
  metadata?: { description?: string }
): string {
  const hostname = (() => {
    try {
      return new URL(domainUrl).hostname;
    } catch {
      return domainUrl;
    }
  })();

  const lines: string[] = [];
  lines.push(`# ${hostname}`);
  lines.push("");
  if (metadata?.description) {
    lines.push(`> ${metadata.description}`);
    lines.push("");
  } else {
    lines.push(`> Website content indexed for AI engines and large language models.`);
    lines.push("");
  }

  // Crawled pages (with titles + descriptions — richer)
  const crawledUrls = new Set(pages.map((p) => p.url));
  if (pages.length > 0) {
    lines.push("## Pages");
    lines.push("");
    for (const page of pages) {
      const title = page.title || page.url;
      const desc = page.metaDescription ? `: ${page.metaDescription}` : "";
      lines.push(`- [${title}](${page.url})${desc}`);
    }
    lines.push("");
  }

  // Sitemap URLs not already covered
  const extraSitemapUrls = sitemapUrls.filter((u) => !crawledUrls.has(u));
  if (extraSitemapUrls.length > 0) {
    // Group by section (first path segment) for readability
    const grouped: Record<string, string[]> = {};
    for (const url of extraSitemapUrls) {
      try {
        const u = new URL(url);
        const segment = u.pathname.split("/").filter(Boolean)[0] || "Site";
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/[-_]/g, " ");
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(url);
      } catch {
        /* skip malformed */
      }
    }

    lines.push("## Additional URLs from sitemap");
    lines.push("");
    for (const [section, urls] of Object.entries(grouped)) {
      if (urls.length === 1) {
        lines.push(`- [${section}](${urls[0]})`);
      } else {
        lines.push(`### ${section}`);
        lines.push("");
        for (const url of urls.slice(0, 50)) {
          const path = (() => {
            try { return new URL(url).pathname; } catch { return url; }
          })();
          lines.push(`- [${path}](${url})`);
        }
        if (urls.length > 50) lines.push(`- ...and ${urls.length - 50} more`);
        lines.push("");
      }
    }
    lines.push("");
  }

  lines.push("## Notes");
  lines.push("");
  lines.push("Content on this site may be cited by AI models (ChatGPT, Claude, Perplexity, Google AI Overviews).");
  lines.push("Please attribute citations back to the original page URL.");
  lines.push("");

  return lines.join("\n");
}
