// Playwright fallback for JS-rendered sites.
// Lazily imports playwright so the dep is only loaded when actually needed —
// cuts cold-start cost for the 80% of crawls served by plain fetch.

import type { Browser } from "playwright";

let cachedBrowser: Browser | null = null;
let cachedAt = 0;
const BROWSER_TTL_MS = 5 * 60 * 1000; // recycle after 5 min idle

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && Date.now() - cachedAt < BROWSER_TTL_MS) {
    return cachedBrowser;
  }
  if (cachedBrowser) {
    try { await cachedBrowser.close(); } catch { /* ignore */ }
  }
  const { chromium } = await import("playwright");
  cachedBrowser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  cachedAt = Date.now();
  return cachedBrowser;
}

export interface PlaywrightFetchResult {
  url: string;
  statusCode: number;
  html: string;
  loadTimeMs: number;
}

export async function fetchPageWithPlaywright(
  url: string,
  userAgent: string,
  timeoutMs = 25_000
): Promise<PlaywrightFetchResult | null> {
  const start = Date.now();
  let context;
  let page;

  try {
    const browser = await getBrowser();
    context = await browser.newContext({ userAgent });
    page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    if (!response) return null;

    // Brief settle so React/Vue can finish rendering
    await page.waitForTimeout(800);
    const html = await page.content();
    const finalUrl = page.url();
    const statusCode = response.status();
    const loadTimeMs = Date.now() - start;

    return { url: finalUrl, statusCode, html, loadTimeMs };
  } catch {
    return null;
  } finally {
    try { await page?.close(); } catch { /* ignore */ }
    try { await context?.close(); } catch { /* ignore */ }
  }
}

// Heuristic: is this HTML likely a JS-rendered shell (no useful content)?
// Triggers when:
//   - <body> has very little visible text after stripping scripts/styles
//   - Or root mount nodes (#root, #__next, #app) are empty
//   - Or the noscript tag explicitly tells users to enable JS
export function looksLikeJsRendered(html: string): boolean {
  if (!html || html.length < 500) return true;

  // Strip scripts/styles to count real text
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length < 200) return true;

  // Common SPA empty mount points
  const emptyMount = /<div[^>]+id=["'](root|__next|app|svelte|nuxt)["'][^>]*>\s*<\/div>/i.test(html);
  if (emptyMount) return true;

  // Pages explicitly requiring JS
  if (/please\s+enable\s+javascript/i.test(html)) return true;
  if (/you\s+need\s+to\s+enable\s+javascript/i.test(html)) return true;

  return false;
}
