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
  onProgress?: (progress: CrawlProgress) => void,
  seedUrls?: string[]
): Promise<CrawlResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [];

  // Normalize start URL
  const parsedStart = new URL(startUrl);
  let baseDomain = parsedStart.hostname;
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

  // Seed the queue with start URL + sitemap URLs
  queue.push({ url: normalizeUrl(startUrl), depth: 0 });
  if (seedUrls && seedUrls.length > 0) {
    const seeded = new Set<string>([normalizeUrl(startUrl)]);
    for (const sUrl of seedUrls) {
      try {
        const parsed = new URL(sUrl);
        // Only add same-domain URLs from sitemap
        const host = parsed.hostname;
        const isSameDomain =
          host === baseDomain ||
          host === `www.${baseDomain}` ||
          baseDomain === `www.${host}`;
        if (!isSameDomain) continue;
        const norm = normalizeUrl(sUrl);
        if (!seeded.has(norm)) {
          queue.push({ url: norm, depth: 1 });
          seeded.add(norm);
        }
      } catch { /* skip invalid sitemap URLs */ }
    }
    console.log(`[crawler] Seeded queue with ${seeded.size - 1} sitemap URLs`);
  }

  console.log(`[crawler] Starting crawl: ${startUrl} (maxPages=${opts.maxPages}, maxDepth=${opts.maxDepth})`);

  while (queue.length > 0 && results.length < opts.maxPages) {
    const item = queue.shift()!;
    const normalizedUrl = normalizeUrl(item.url);

    if (visited.has(normalizedUrl)) continue;
    if (item.depth > opts.maxDepth) {
      console.log(`[crawler] Skipping (depth ${item.depth} > ${opts.maxDepth}): ${normalizedUrl}`);
      continue;
    }

    // Check robots.txt
    if (robots && !robots.isAllowed(normalizedUrl, opts.userAgent)) {
      console.log(`[crawler] Blocked by robots.txt: ${normalizedUrl}`);
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
      if (!result) {
        console.log(`[crawler] Fetch returned null: ${normalizedUrl}`);
        continue;
      }

      results.push(result);
      console.log(`[crawler] ✓ Crawled (${results.length}/${opts.maxPages}) depth=${item.depth}: ${result.url} [${result.statusCode}] html=${result.html.length} chars`);

      // After the first page, update baseDomain if the site redirected
      // (e.g. example.com → www.example.com or vice versa)
      if (results.length === 1) {
        const actualDomain = new URL(result.url).hostname;
        if (actualDomain !== baseDomain) {
          console.log(`[crawler] Domain redirected: ${baseDomain} → ${actualDomain}`);
          baseDomain = actualDomain;
        }
      }

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
        let added = 0;
        for (const link of newLinks) {
          const norm = normalizeUrl(link);
          if (!visited.has(norm)) {
            queue.push({ url: norm, depth: item.depth + 1 });
            added++;
          }
        }
        console.log(`[crawler] Found ${newLinks.length} internal links on ${result.url}, ${added} new added to queue (queue size: ${queue.length})`);
      }

      // Polite delay between requests
      if (opts.delayMs > 0) {
        await sleep(opts.delayMs);
      }
    } catch (err) {
      console.error(`[crawler] Error fetching ${normalizedUrl}:`, (err as Error).message);
    }
  }

  console.log(`[crawler] Done. Crawled ${results.length} pages, visited ${visited.size} URLs`);
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
      console.log(`[crawler] JS-rendered detected for ${url} (html=${html.length} chars), trying Playwright...`);
      const pw = await fetchPageWithPlaywright(url, opts.userAgent, opts.timeoutMs);
      if (pw && pw.html.length > html.length) {
        console.log(`[crawler] Playwright got ${pw.html.length} chars (was ${html.length})`);
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

      // Only follow internal links (handle www/non-www variants)
      const host = resolved.hostname;
      const isInternal =
        host === baseDomain ||
        host === `www.${baseDomain}` ||
        baseDomain === `www.${host}`;
      if (!isInternal) return;

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

      const host = resolved.hostname;
      const isInt =
        host === baseDomain ||
        host === `www.${baseDomain}` ||
        baseDomain === `www.${host}`;

      linkList.push({
        href: resolved.href,
        anchor: $el.text().trim(),
        isInternal: isInt,
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
