import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { createHash } from "crypto";
import { fetchPageWithPlaywright, looksLikeJsRendered } from "./playwright-fallback";

export interface CrawlResult {
  url: string;
  statusCode: number;
  contentType: string;
  html: string;
  headers: Record<string, string>;
  loadTimeMs: number;
  depth: number;
  redirectChain: string[];
}

export interface CrawlOptions {
  maxPages: number;
  maxDepth: number;
  respectRobotsTxt: boolean;
  userAgent: string;
  timeoutMs: number;
  delayMs: number; // delay between requests to be polite
}

const DEFAULT_OPTIONS: CrawlOptions = {
  maxPages: 50,
  maxDepth: 5,
  respectRobotsTxt: true,
  userAgent: "SEOAnalyzerBot/1.0 (+https://seo-analyzer.dev)",
  timeoutMs: 15000,
  delayMs: 500,
};

export interface CrawlProgress {
  pagesFound: number;
  pagesCrawled: number;
  currentUrl: string;
}

export async function crawlSite(
  startUrl: string,
  options: Partial<CrawlOptions> = {},
  onProgress?: (progress: CrawlProgress) => void
): Promise<CrawlResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [];

  // Normalize start URL
  const parsedStart = new URL(startUrl);
  const baseDomain = parsedStart.hostname;
  const baseOrigin = parsedStart.origin;

  // Check robots.txt
  let robots: ReturnType<typeof robotsParser> | null = null;
  if (opts.respectRobotsTxt) {
    try {
      const robotsUrl = `${baseOrigin}/robots.txt`;
      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": opts.userAgent },
        signal: AbortSignal.timeout(opts.timeoutMs),
      });
      if (res.ok) {
        const robotsTxt = await res.text();
        robots = robotsParser(robotsUrl, robotsTxt);
      }
    } catch {
      // robots.txt not available — proceed without it
    }
  }

  // Seed the queue
  queue.push({ url: normalizeUrl(startUrl), depth: 0 });

  while (queue.length > 0 && results.length < opts.maxPages) {
    const item = queue.shift()!;
    const normalizedUrl = normalizeUrl(item.url);

    if (visited.has(normalizedUrl)) continue;
    if (item.depth > opts.maxDepth) continue;

    // Check robots.txt
    if (robots && !robots.isAllowed(normalizedUrl, opts.userAgent)) {
      continue;
    }

    visited.add(normalizedUrl);

    onProgress?.({
      pagesFound: visited.size + queue.length,
      pagesCrawled: results.length,
      currentUrl: normalizedUrl,
    });

    try {
      const result = await fetchPage(normalizedUrl, item.depth, opts);
      if (!result) continue;

      results.push(result);

      // Only extract links from HTML pages
      if (
        result.contentType.includes("text/html") &&
        item.depth < opts.maxDepth
      ) {
        const newLinks = extractInternalLinks(
          result.html,
          result.url,
          baseDomain
        );
        for (const link of newLinks) {
          const norm = normalizeUrl(link);
          if (!visited.has(norm)) {
            queue.push({ url: norm, depth: item.depth + 1 });
          }
        }
      }

      // Polite delay between requests
      if (opts.delayMs > 0) {
        await sleep(opts.delayMs);
      }
    } catch {
      // Page fetch failed — skip it silently
    }
  }

  return results;
}

async function fetchPage(
  url: string,
  depth: number,
  opts: CrawlOptions
): Promise<CrawlResult | null> {
  const start = Date.now();
  const redirectChain: string[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": opts.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(opts.timeoutMs),
      redirect: "follow",
    });

    const loadTimeMs = Date.now() - start;
    const contentType = response.headers.get("content-type") || "";

    // Only process HTML and text
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain")
    ) {
      // Still record the page for status code tracking
      return {
        url: response.url,
        statusCode: response.status,
        contentType,
        html: "",
        headers: headersToObject(response.headers),
        loadTimeMs,
        depth,
        redirectChain,
      };
    }

    let html = await response.text();
    let finalUrl = response.url;
    let finalStatus = response.status;
    let finalLoadTimeMs = loadTimeMs;

    // Track if we were redirected
    if (response.url !== url) {
      redirectChain.push(url);
    }

    // Fallback to Playwright if HTML looks JS-only (empty SPA shell)
    if (looksLikeJsRendered(html)) {
      const pw = await fetchPageWithPlaywright(url, opts.userAgent, opts.timeoutMs);
      if (pw && pw.html.length > html.length) {
        html = pw.html;
        finalUrl = pw.url;
        finalStatus = pw.statusCode;
        finalLoadTimeMs = pw.loadTimeMs;
        if (finalUrl !== url && !redirectChain.includes(url)) {
          redirectChain.push(url);
        }
      }
    }

    return {
      url: finalUrl,
      statusCode: finalStatus,
      contentType,
      html,
      headers: headersToObject(response.headers),
      loadTimeMs: finalLoadTimeMs,
      depth,
      redirectChain,
    };
  } catch {
    // Even fetch failed entirely — try Playwright as a last resort
    const pw = await fetchPageWithPlaywright(url, opts.userAgent, opts.timeoutMs);
    if (pw) {
      return {
        url: pw.url,
        statusCode: pw.statusCode,
        contentType: "text/html",
        html: pw.html,
        headers: {},
        loadTimeMs: pw.loadTimeMs,
        depth,
        redirectChain,
      };
    }
    return null;
  }
}

export function extractInternalLinks(
  html: string,
  pageUrl: string,
  baseDomain: string
): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, pageUrl);

      // Only follow internal links
      if (resolved.hostname !== baseDomain) return;

      // Skip non-http protocols, anchors, mailto, tel, javascript
      if (!resolved.protocol.startsWith("http")) return;

      // Remove hash fragments
      resolved.hash = "";

      // Skip common non-page extensions
      const ext = resolved.pathname.split(".").pop()?.toLowerCase();
      const skipExts = [
        "pdf",
        "jpg",
        "jpeg",
        "png",
        "gif",
        "svg",
        "css",
        "js",
        "zip",
        "mp4",
        "mp3",
        "webp",
        "ico",
        "woff",
        "woff2",
        "ttf",
      ];
      if (ext && skipExts.includes(ext)) return;

      links.push(resolved.href);
    } catch {
      // Invalid URL — skip
    }
  });

  return [...new Set(links)];
}

export function extractAllLinks(
  html: string,
  pageUrl: string
): Array<{
  href: string;
  anchor: string;
  isInternal: boolean;
  isNofollow: boolean;
}> {
  const $ = cheerio.load(html);
  const baseDomain = new URL(pageUrl).hostname;
  const linkList: Array<{
    href: string;
    anchor: string;
    isInternal: boolean;
    isNofollow: boolean;
  }> = [];

  $("a[href]").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, pageUrl);
      if (!resolved.protocol.startsWith("http")) return;

      const rel = ($el.attr("rel") || "").toLowerCase();

      linkList.push({
        href: resolved.href,
        anchor: $el.text().trim(),
        isInternal: resolved.hostname === baseDomain,
        isNofollow: rel.includes("nofollow"),
      });
    } catch {
      // Invalid URL
    }
  });

  return linkList;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // Remove trailing slash for consistency (except root)
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.href;
  } catch {
    return url;
  }
}

export function hashHtml(html: string): string {
  return createHash("md5").update(html).digest("hex");
}

function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
