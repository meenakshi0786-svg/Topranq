import type { CrawlResult } from "../crawler";
import type { SEOIssue, PageData, SiteContext, CheckFunction } from "./types";
import { technicalChecks } from "./checks/technical";
import { onPageChecks } from "./checks/on-page";
import { contentChecks } from "./checks/content";
import { structureChecks } from "./checks/structure";
import { performanceChecks } from "./checks/performance";
import { socialChecks } from "./checks/social";
import { eeatChecks } from "./checks/eeat";
import { aiReadinessChecks } from "./checks/ai-readiness";
import { schemaChecks } from "./checks/schema";
import { imageChecks } from "./checks/images";
import { hreflangChecks } from "./checks/hreflang";
import { securityChecks } from "./checks/security";
import { accessibilityChecks } from "./checks/accessibility";

export type { SEOIssue } from "./types";

const ALL_CHECKS: CheckFunction[] = [
  ...technicalChecks,
  ...onPageChecks,
  ...contentChecks,
  ...structureChecks,
  ...performanceChecks,
  ...socialChecks,
  ...eeatChecks,
  ...aiReadinessChecks,
  ...schemaChecks,
  ...imageChecks,
  ...hreflangChecks,
  ...securityChecks,
  ...accessibilityChecks,
];

export interface PageAnalysisResult {
  url: string;
  issues: SEOIssue[];
  wordCount: number;
}

export interface SiteAnalysisResult {
  pages: PageAnalysisResult[];
  allIssues: SEOIssue[];
  issuesByPage: Map<string, SEOIssue[]>;
}

export function analyzePage(page: PageData, context: SiteContext): SEOIssue[] {
  const issues: SEOIssue[] = [];

  for (const check of ALL_CHECKS) {
    try {
      const result = check(page, context);
      issues.push(...result);
    } catch {
      // Individual check failure shouldn't break the whole analysis
    }
  }

  return issues;
}

export function analyzeSite(
  crawlResults: CrawlResult[],
  domain: string,
  startUrl: string,
  robotsTxtContent?: string,
  sitemapUrls?: string[]
): SiteAnalysisResult {
  // Convert crawl results to page data
  const allPages: PageData[] = crawlResults.map((r) => ({
    url: r.url,
    html: r.html,
    statusCode: r.statusCode,
    contentType: r.contentType,
    headers: r.headers,
    loadTimeMs: r.loadTimeMs,
    depth: r.depth,
    redirectChain: r.redirectChain,
  }));

  const context: SiteContext = {
    domain,
    startUrl,
    allPages,
    robotsTxtContent,
    sitemapUrls,
  };

  const pages: PageAnalysisResult[] = [];
  const allIssues: SEOIssue[] = [];
  const issuesByPage = new Map<string, SEOIssue[]>();

  for (const page of allPages) {
    const pageIssues = analyzePage(page, context);
    const wordCount = getWordCount(page.html);

    pages.push({ url: page.url, issues: pageIssues, wordCount });
    allIssues.push(...pageIssues);
    issuesByPage.set(page.url, pageIssues);
  }

  return { pages, allIssues, issuesByPage };
}

function getWordCount(html: string): number {
  if (!html) return 0;
  // Quick word count by stripping tags
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(" ").filter((w) => w.length > 0).length;
}
