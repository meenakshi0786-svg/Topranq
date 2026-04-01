import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// 21. Internal link count check
export const checkInternalLinks: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const baseDomain = new URL(page.url).hostname;

  let internalLinks = 0;
  let externalLinks = 0;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, page.url);
      if (resolved.hostname === baseDomain) {
        internalLinks++;
      } else if (resolved.protocol.startsWith("http")) {
        externalLinks++;
      }
    } catch {
      // Invalid URL
    }
  });

  if (internalLinks === 0) {
    issues.push({
      checkId: "no_internal_links",
      category: "structure",
      severity: "high",
      impactArea: "crawl_efficiency",
      message: "Page has no internal links — it's a dead end for crawlers and users",
      details: { internalLinks, externalLinks },
    });
  } else if (internalLinks < 3 && page.depth === 0) {
    issues.push({
      checkId: "few_internal_links",
      category: "structure",
      severity: "medium",
      impactArea: "crawl_efficiency",
      message: `Homepage has only ${internalLinks} internal links — add more to improve discoverability`,
      details: { internalLinks },
    });
  }

  if (internalLinks > 100) {
    issues.push({
      checkId: "too_many_links",
      category: "structure",
      severity: "low",
      impactArea: "crawl_efficiency",
      message: `Page has ${internalLinks} internal links — excessive links dilute link equity`,
      details: { internalLinks },
    });
  }

  return issues;
};

// 22. Orphan page detection (page not linked from any other crawled page)
export const checkOrphanPage: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];

  // Skip the start URL (it won't have incoming links from crawl)
  if (page.url === context.startUrl) return issues;

  // Check if any other page links to this one
  const isLinkedFrom = context.allPages.some((other) => {
    if (other.url === page.url || !other.html) return false;
    const $ = cheerio.load(other.html);
    let found = false;
    $("a[href]").each((_, el) => {
      try {
        const href = $(el).attr("href");
        if (!href) return;
        const resolved = new URL(href, other.url);
        resolved.hash = "";
        if (resolved.href === page.url) {
          found = true;
          return false; // break
        }
      } catch {
        // skip
      }
    });
    return found;
  });

  if (!isLinkedFrom) {
    issues.push({
      checkId: "orphan_page",
      category: "structure",
      severity: "medium",
      impactArea: "crawl_efficiency",
      message: "Page is not linked from any other crawled page — may be difficult to discover",
      details: { url: page.url },
    });
  }

  return issues;
};

// 23. Broken internal links check
export const checkBrokenLinks: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const baseDomain = new URL(page.url).hostname;
  const brokenLinks: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, page.url);
      if (resolved.hostname !== baseDomain) return;

      // Check if this URL was crawled and returned an error
      const crawledPage = context.allPages.find(
        (p) => p.url === resolved.href
      );
      if (crawledPage && crawledPage.statusCode >= 400) {
        brokenLinks.push(resolved.href);
      }
    } catch {
      // Invalid URL
    }
  });

  if (brokenLinks.length > 0) {
    issues.push({
      checkId: "broken_internal_links",
      category: "structure",
      severity: "high",
      impactArea: "ux",
      message: `Page links to ${brokenLinks.length} broken internal URL(s)`,
      details: { brokenLinks },
    });
  }

  return issues;
};

// 24. Language attribute check
export const checkLangAttribute: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const lang = $("html").attr("lang");

  if (!lang) {
    issues.push({
      checkId: "missing_lang",
      category: "structure",
      severity: "medium",
      impactArea: "rankings",
      message: "HTML element is missing the lang attribute",
    });
  }

  return issues;
};

export const structureChecks: CheckFunction[] = [
  checkInternalLinks,
  checkOrphanPage,
  checkBrokenLinks,
  checkLangAttribute,
];
