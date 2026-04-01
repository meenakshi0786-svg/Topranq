import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// Schema Markup Detection, Validation & Generation suggestions

const GOOGLE_SUPPORTED_TYPES = [
  "Article", "NewsArticle", "BlogPosting",
  "BreadcrumbList",
  "Event",
  "FAQPage",
  "HowTo",
  "JobPosting",
  "LocalBusiness", "Restaurant", "Store",
  "Organization",
  "Person",
  "Product", "Review", "AggregateRating",
  "Recipe",
  "SoftwareApplication",
  "VideoObject",
  "WebSite", "WebPage",
  "Course",
  "Dataset",
  "Book",
];

const DEPRECATED_TYPES: Record<string, string> = {
  "HowTo": "Deprecated by Google in September 2023 — rich results no longer shown",
  "SpecialAnnouncement": "Deprecated by Google in July 2025",
};

// 40. Schema detection and validation
export const checkSchemaMarkup: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Detect JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const hasMicrodata = $("[itemscope]").length > 0;
  const hasRdfa = $("[typeof]").length > 0;
  const hasJsonLd = jsonLdScripts.length > 0;

  if (!hasJsonLd && !hasMicrodata && !hasRdfa) {
    issues.push({
      checkId: "no_schema_markup",
      category: "social",
      severity: "medium",
      impactArea: "ctr",
      message: "No structured data (JSON-LD, Microdata, or RDFa) found — add schema markup for rich search results",
    });
    return issues;
  }

  // Parse and validate JSON-LD
  const detectedTypes: string[] = [];
  const schemaErrors: string[] = [];

  jsonLdScripts.each((_, el) => {
    const content = $(el).html();
    if (!content) return;

    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = item["@type"];
        if (!type) continue;

        const types = Array.isArray(type) ? type : [type];
        for (const t of types) {
          detectedTypes.push(t);

          // Check for deprecated types
          if (DEPRECATED_TYPES[t]) {
            schemaErrors.push(`${t}: ${DEPRECATED_TYPES[t]}`);
          }

          // Validate required fields for common types
          if (t === "Article" || t === "NewsArticle" || t === "BlogPosting") {
            if (!item.headline) schemaErrors.push(`${t} missing required 'headline'`);
            if (!item.author) schemaErrors.push(`${t} missing required 'author'`);
            if (!item.datePublished) schemaErrors.push(`${t} missing 'datePublished'`);
            if (!item.image) schemaErrors.push(`${t} missing recommended 'image'`);
          }

          if (t === "Product") {
            if (!item.name) schemaErrors.push("Product missing required 'name'");
            if (!item.offers && !item.review && !item.aggregateRating) {
              schemaErrors.push("Product should have 'offers', 'review', or 'aggregateRating'");
            }
          }

          if (t === "LocalBusiness") {
            if (!item.name) schemaErrors.push("LocalBusiness missing 'name'");
            if (!item.address) schemaErrors.push("LocalBusiness missing 'address'");
            if (!item.telephone) schemaErrors.push("LocalBusiness missing 'telephone'");
          }

          if (t === "Organization") {
            if (!item.name) schemaErrors.push("Organization missing 'name'");
            if (!item.url) schemaErrors.push("Organization missing 'url'");
            if (!item.logo) schemaErrors.push("Organization missing 'logo'");
          }

          if (t === "WebSite") {
            if (!item.potentialAction) {
              schemaErrors.push("WebSite missing 'potentialAction' (SearchAction) — needed for sitelinks search box");
            }
          }
        }
      }
    } catch {
      issues.push({
        checkId: "invalid_json_ld",
        category: "social",
        severity: "high",
        impactArea: "ctr",
        message: "Invalid JSON-LD — structured data contains syntax errors and will be ignored by search engines",
      });
    }
  });

  if (schemaErrors.length > 0) {
    issues.push({
      checkId: "schema_validation_errors",
      category: "social",
      severity: "medium",
      impactArea: "ctr",
      message: `Schema markup has ${schemaErrors.length} issue(s): ${schemaErrors.slice(0, 3).join("; ")}${schemaErrors.length > 3 ? ` and ${schemaErrors.length - 3} more` : ""}`,
      details: { errors: schemaErrors, detectedTypes },
    });
  }

  return issues;
};

// 41. Missing recommended schema by page type
export const checkMissingSchema: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const html = page.html.toLowerCase();

  // Collect existing schema types
  const existingTypes = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    if (!content) return;
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item) => {
        if (item["@type"]) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          types.forEach((t: string) => existingTypes.add(t));
        }
      });
    } catch { /* ignore parse errors */ }
  });

  // Detect page type and suggest schema
  $("script, style, nav, footer, header, aside").remove();
  const bodyText = $("body").text().toLowerCase();
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

  // Blog/article detection
  const isArticle =
    ($("article").length > 0 || $(".post, .blog-post, .entry").length > 0) &&
    wordCount > 300;

  if (isArticle && !existingTypes.has("Article") && !existingTypes.has("BlogPosting") && !existingTypes.has("NewsArticle")) {
    issues.push({
      checkId: "article_no_schema",
      category: "social",
      severity: "low",
      impactArea: "ctr",
      message: "Article/blog content detected but no Article schema — add BlogPosting or Article schema for rich results",
    });
  }

  // Product detection
  const isProduct =
    html.includes("add to cart") || html.includes("buy now") ||
    $("[itemprop='price'], .price, .product-price").length > 0;

  if (isProduct && !existingTypes.has("Product")) {
    issues.push({
      checkId: "product_no_schema",
      category: "social",
      severity: "medium",
      impactArea: "ctr",
      message: "Product page detected but no Product schema — add Product schema with offers for price display in search results",
    });
  }

  // Breadcrumb detection
  const hasBreadcrumb = $(".breadcrumb, .breadcrumbs, [aria-label='breadcrumb'], nav[aria-label='Breadcrumb']").length > 0;
  if (hasBreadcrumb && !existingTypes.has("BreadcrumbList")) {
    issues.push({
      checkId: "breadcrumb_no_schema",
      category: "social",
      severity: "low",
      impactArea: "ctr",
      message: "Breadcrumb navigation detected but no BreadcrumbList schema — add schema for breadcrumb display in search results",
    });
  }

  // Homepage — check for Organization/WebSite schema
  const isHomepage = page.url.replace(/\/$/, "") === page.url.replace(/\/[^/]*$/, "").replace(/\/$/, "") ||
                     page.url.endsWith("/") && page.url.split("/").filter(Boolean).length <= 3;
  if (isHomepage && !existingTypes.has("Organization") && !existingTypes.has("WebSite")) {
    issues.push({
      checkId: "homepage_no_org_schema",
      category: "social",
      severity: "low",
      impactArea: "ctr",
      message: "Homepage missing Organization or WebSite schema — helps search engines understand your brand",
    });
  }

  return issues;
};

export const schemaChecks: CheckFunction[] = [
  checkSchemaMarkup,
  checkMissingSchema,
];
