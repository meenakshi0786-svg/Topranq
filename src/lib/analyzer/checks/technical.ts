import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue, PageData, SiteContext } from "../types";

// 1. HTTPS check
export const checkHttps: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (page.url.startsWith("http://")) {
    issues.push({
      checkId: "no_https",
      category: "technical",
      severity: "critical",
      impactArea: "rankings",
      message: "Page is served over HTTP instead of HTTPS",
      details: { url: page.url },
    });
  }
  return issues;
};

// 2. Status code check
export const checkStatusCode: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  const { statusCode } = page;

  if (statusCode >= 500) {
    issues.push({
      checkId: "server_error",
      category: "technical",
      severity: "critical",
      impactArea: "crawl_efficiency",
      message: `Page returns server error (${statusCode})`,
      details: { statusCode },
    });
  } else if (statusCode === 404) {
    issues.push({
      checkId: "not_found",
      category: "technical",
      severity: "high",
      impactArea: "crawl_efficiency",
      message: "Page returns 404 Not Found",
      details: { statusCode },
    });
  } else if (statusCode >= 400) {
    issues.push({
      checkId: "client_error",
      category: "technical",
      severity: "high",
      impactArea: "crawl_efficiency",
      message: `Page returns client error (${statusCode})`,
      details: { statusCode },
    });
  }
  return issues;
};

// 3. Canonical tag check
export const checkCanonical: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const canonical = $('link[rel="canonical"]').attr("href");

  if (!canonical) {
    issues.push({
      checkId: "missing_canonical",
      category: "technical",
      severity: "medium",
      impactArea: "rankings",
      message: "Page is missing a canonical tag",
    });
  } else {
    try {
      const canonicalUrl = new URL(canonical, page.url);
      if (canonicalUrl.href !== page.url) {
        issues.push({
          checkId: "canonical_mismatch",
          category: "technical",
          severity: "medium",
          impactArea: "rankings",
          message: "Canonical URL points to a different page",
          details: { canonical: canonicalUrl.href, pageUrl: page.url },
        });
      }
    } catch {
      issues.push({
        checkId: "invalid_canonical",
        category: "technical",
        severity: "high",
        impactArea: "rankings",
        message: "Canonical tag contains an invalid URL",
        details: { canonical },
      });
    }
  }
  return issues;
};

// 4. Indexability check (noindex)
export const checkIndexability: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Check meta robots
  const metaRobots = $('meta[name="robots"]').attr("content") || "";
  const metaGooglebot = $('meta[name="googlebot"]').attr("content") || "";

  // Check X-Robots-Tag header
  const xRobotsTag = page.headers["x-robots-tag"] || "";

  const allDirectives = `${metaRobots} ${metaGooglebot} ${xRobotsTag}`.toLowerCase();

  if (allDirectives.includes("noindex")) {
    issues.push({
      checkId: "noindex_detected",
      category: "technical",
      severity: "high",
      impactArea: "traffic",
      message: "Page is marked as noindex — it will not appear in search results",
      details: { metaRobots, metaGooglebot, xRobotsTag },
    });
  }

  if (allDirectives.includes("nofollow")) {
    issues.push({
      checkId: "nofollow_detected",
      category: "technical",
      severity: "medium",
      impactArea: "crawl_efficiency",
      message: "Page has nofollow directive — links on this page won't pass authority",
      details: { metaRobots, metaGooglebot, xRobotsTag },
    });
  }

  return issues;
};

// 5. Redirect chain check
export const checkRedirects: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (page.redirectChain.length > 0) {
    issues.push({
      checkId: "redirect_chain",
      category: "technical",
      severity: page.redirectChain.length > 2 ? "high" : "medium",
      impactArea: "crawl_efficiency",
      message: `Page has a redirect chain (${page.redirectChain.length} redirect${page.redirectChain.length > 1 ? "s" : ""})`,
      details: { chain: page.redirectChain, finalUrl: page.url },
    });
  }
  return issues;
};

// 6. Mixed content check
export const checkMixedContent: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html || !page.url.startsWith("https://")) return issues;

  const $ = cheerio.load(page.html);
  const mixedResources: string[] = [];

  $("img[src], script[src], link[href], iframe[src], video[src], audio[src]").each(
    (_, el) => {
      const src = $(el).attr("src") || $(el).attr("href") || "";
      if (src.startsWith("http://")) {
        mixedResources.push(src);
      }
    }
  );

  if (mixedResources.length > 0) {
    issues.push({
      checkId: "mixed_content",
      category: "technical",
      severity: "high",
      impactArea: "ux",
      message: `HTTPS page loads ${mixedResources.length} resource(s) over insecure HTTP`,
      details: { resources: mixedResources.slice(0, 10) },
    });
  }
  return issues;
};

// 7. Robots.txt check (site-level, only on first page)
export const checkRobotsTxt: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];

  // Only check on the start page
  if (page.url !== context.startUrl) return issues;

  if (!context.robotsTxtContent) {
    issues.push({
      checkId: "missing_robots_txt",
      category: "technical",
      severity: "medium",
      impactArea: "crawl_efficiency",
      message: "No robots.txt file found",
    });
  }

  return issues;
};

// 8. Sitemap check (site-level, only on first page)
export const checkSitemap: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];

  if (page.url !== context.startUrl) return issues;

  if (!context.sitemapUrls || context.sitemapUrls.length === 0) {
    issues.push({
      checkId: "missing_sitemap",
      category: "technical",
      severity: "medium",
      impactArea: "crawl_efficiency",
      message: "No XML sitemap found at /sitemap.xml",
    });
  }

  return issues;
};

// 9. Page depth check
export const checkPageDepth: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (page.depth > 3) {
    issues.push({
      checkId: "deep_page",
      category: "technical",
      severity: page.depth > 5 ? "high" : "medium",
      impactArea: "crawl_efficiency",
      message: `Page is ${page.depth} clicks deep from homepage — hard for search engines to discover`,
      details: { depth: page.depth },
    });
  }
  return issues;
};

export const technicalChecks: CheckFunction[] = [
  checkHttps,
  checkStatusCode,
  checkCanonical,
  checkIndexability,
  checkRedirects,
  checkMixedContent,
  checkRobotsTxt,
  checkSitemap,
  checkPageDepth,
];
