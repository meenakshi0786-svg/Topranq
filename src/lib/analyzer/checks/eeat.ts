import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// Deep E-E-A-T analysis — Experience, Expertise, Authoritativeness, Trustworthiness

// 34. Author credentials check
export const checkAuthorCredentials: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  $("script, style, nav, footer, header, aside").remove();
  const wordCount = $("body").text().split(/\s+/).filter((w) => w.length > 0).length;

  if (wordCount < 300) return issues; // Only check content-heavy pages

  const html = page.html.toLowerCase();

  // Check for author bio/about section
  const hasAuthorBio =
    $(".author-bio, .author-info, .author-box, .post-author, [itemprop='author'] [itemprop='description']").length > 0 ||
    html.includes("about the author") ||
    html.includes("written by") ||
    html.includes("reviewed by") ||
    html.includes("medically reviewed");

  // Check for author schema
  const hasAuthorSchema = html.includes('"author"') && (html.includes('"person"') || html.includes('"organization"'));

  // Check for credentials indicators
  const hasCredentials =
    /\b(md|phd|cpa|esq|rn|dds|dvm|pe|cfa|mba)\b/i.test(html) ||
    html.includes("certified") ||
    html.includes("licensed") ||
    html.includes("board-certified") ||
    html.includes("years of experience");

  if (!hasAuthorBio && !hasAuthorSchema) {
    issues.push({
      checkId: "no_author_bio",
      category: "content",
      severity: "medium",
      impactArea: "rankings",
      message: "No author bio or author schema found — weak E-E-A-T signal for content credibility",
    });
  }

  // Check for YMYL (Your Money Your Life) content without credentials
  const isYMYL =
    html.includes("health") || html.includes("medical") || html.includes("financial") ||
    html.includes("investment") || html.includes("legal") || html.includes("insurance") ||
    html.includes("tax") || html.includes("mortgage") || html.includes("diagnosis");

  if (isYMYL && !hasCredentials && !hasAuthorBio) {
    issues.push({
      checkId: "ymyl_no_credentials",
      category: "content",
      severity: "high",
      impactArea: "rankings",
      message: "YMYL (health/finance/legal) content without author credentials — Google requires strong E-E-A-T for these topics",
    });
  }

  return issues;
};

// 35. Trust signals check
export const checkTrustSignals: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const html = page.html.toLowerCase();

  // Only check on homepage or about pages
  const isMainPage = page.url === page.url.replace(/\/[^/]*$/, "/") || page.url.endsWith("/");

  if (!isMainPage) return issues;

  // Check for contact information
  const hasContact =
    html.includes("contact") ||
    $('a[href^="mailto:"]').length > 0 ||
    $('a[href^="tel:"]').length > 0;

  // Check for privacy policy / terms
  const hasPrivacy =
    $('a[href*="privacy"]').length > 0 ||
    $('a[href*="terms"]').length > 0;

  // Check for about page link
  const hasAbout =
    $('a[href*="about"]').length > 0 ||
    $('a[href*="team"]').length > 0;

  // Check for security indicators
  const hasSecurityBadges =
    html.includes("ssl") || html.includes("secure") ||
    html.includes("verified") || html.includes("trust");

  const missingSignals: string[] = [];
  if (!hasContact) missingSignals.push("contact information");
  if (!hasPrivacy) missingSignals.push("privacy policy/terms");
  if (!hasAbout) missingSignals.push("about page");

  if (missingSignals.length >= 2) {
    issues.push({
      checkId: "missing_trust_signals",
      category: "content",
      severity: "medium",
      impactArea: "rankings",
      message: `Homepage missing trust signals: ${missingSignals.join(", ")}`,
      details: { missingSignals },
    });
  }

  return issues;
};

// 36. Content freshness check
export const checkContentFreshness: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  $("script, style, nav, footer, header, aside").remove();
  const wordCount = $("body").text().split(/\s+/).filter((w) => w.length > 0).length;

  if (wordCount < 300) return issues;

  // Check for last modified/updated date
  const hasLastModified =
    $('[itemprop="dateModified"]').length > 0 ||
    $(".updated, .modified, .last-updated").length > 0 ||
    page.html.toLowerCase().includes("last updated") ||
    page.html.toLowerCase().includes("updated on");

  const hasPublishDate =
    $("time[datetime]").length > 0 ||
    $('[itemprop="datePublished"]').length > 0;

  if (hasPublishDate && !hasLastModified) {
    issues.push({
      checkId: "no_update_date",
      category: "content",
      severity: "low",
      impactArea: "rankings",
      message: "Content has a publish date but no last-updated date — freshness signals help rankings for time-sensitive topics",
    });
  }

  // Check for citations/sources
  const hasCitations =
    $("a[href*='doi.org']").length > 0 ||
    $("a[href*='pubmed']").length > 0 ||
    $("a[href*='scholar.google']").length > 0 ||
    $(".citation, .reference, .source, .footnote, cite, blockquote[cite]").length > 0 ||
    $("sup a, .footnotes").length > 0;

  const externalLinks = $("a[href^='http']").filter((_, el) => {
    const href = $(el).attr("href") || "";
    try { return new URL(href).hostname !== new URL(page.url).hostname; } catch { return false; }
  }).length;

  if (wordCount > 800 && !hasCitations && externalLinks < 2) {
    issues.push({
      checkId: "no_citations",
      category: "content",
      severity: "low",
      impactArea: "rankings",
      message: "Long-form content with no citations or external sources — adding references strengthens E-E-A-T",
      details: { wordCount, externalLinks },
    });
  }

  return issues;
};

export const eeatChecks: CheckFunction[] = [
  checkAuthorCredentials,
  checkTrustSignals,
  checkContentFreshness,
];
