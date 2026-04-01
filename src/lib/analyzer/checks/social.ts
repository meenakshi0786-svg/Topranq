import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// 30. Open Graph tags check
export const checkOpenGraph: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDescription = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogUrl = $('meta[property="og:url"]').attr("content");
  const ogType = $('meta[property="og:type"]').attr("content");

  const missing: string[] = [];
  if (!ogTitle) missing.push("og:title");
  if (!ogDescription) missing.push("og:description");
  if (!ogImage) missing.push("og:image");
  if (!ogUrl) missing.push("og:url");
  if (!ogType) missing.push("og:type");

  if (missing.length >= 4) {
    issues.push({
      checkId: "missing_og_tags",
      category: "social",
      severity: "medium",
      impactArea: "ctr",
      message: "Open Graph tags are missing — shared links on social media will look poor",
      details: { missing },
    });
  } else if (missing.length > 0) {
    issues.push({
      checkId: "incomplete_og_tags",
      category: "social",
      severity: "low",
      impactArea: "ctr",
      message: `Missing Open Graph tags: ${missing.join(", ")}`,
      details: { missing },
    });
  }

  return issues;
};

// 31. Twitter Card tags check
export const checkTwitterCards: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  const twitterCard = $('meta[name="twitter:card"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const twitterDesc = $('meta[name="twitter:description"]').attr("content");

  if (!twitterCard && !twitterTitle && !twitterDesc) {
    issues.push({
      checkId: "missing_twitter_cards",
      category: "social",
      severity: "low",
      impactArea: "ctr",
      message: "No Twitter Card meta tags found — tweets linking to this page won't have rich previews",
    });
  }

  return issues;
};

// 32. Favicon check
export const checkFavicon: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  const favicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0 ||
    $('link[rel="apple-touch-icon"]').length > 0;

  if (!favicon) {
    issues.push({
      checkId: "missing_favicon",
      category: "social",
      severity: "low",
      impactArea: "ux",
      message: "No favicon detected — affects brand recognition in browser tabs and bookmarks",
    });
  }

  return issues;
};

// 33. Local SEO elements check
export const checkLocalSEO: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Check for LocalBusiness schema
  let hasLocalSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    if (content && content.includes("LocalBusiness")) {
      hasLocalSchema = true;
    }
  });

  // Check for NAP (Name, Address, Phone) patterns
  const bodyText = $("body").text();
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(bodyText);
  const hasAddress = $("address").length > 0 || $('[itemprop="address"]').length > 0;

  // Only flag if this looks like a local business (has phone or address)
  if ((hasPhone || hasAddress) && !hasLocalSchema) {
    issues.push({
      checkId: "missing_local_schema",
      category: "social",
      severity: "medium",
      impactArea: "rankings",
      message: "Page appears to be a local business but lacks LocalBusiness schema markup",
    });
  }

  return issues;
};

export const socialChecks: CheckFunction[] = [
  checkOpenGraph,
  checkTwitterCards,
  checkFavicon,
  checkLocalSEO,
];
