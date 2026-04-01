import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// 10. Title tag check
export const checkTitle: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const title = $("title").first().text().trim();

  if (!title) {
    issues.push({
      checkId: "missing_title",
      category: "on_page",
      severity: "critical",
      impactArea: "ctr",
      message: "Page is missing a title tag",
    });
  } else {
    if (title.length < 10) {
      issues.push({
        checkId: "title_too_short",
        category: "on_page",
        severity: "high",
        impactArea: "ctr",
        message: `Title tag is too short (${title.length} chars) — aim for 50-60 characters`,
        details: { title, length: title.length },
      });
    } else if (title.length > 60) {
      issues.push({
        checkId: "title_too_long",
        category: "on_page",
        severity: "medium",
        impactArea: "ctr",
        message: `Title tag is too long (${title.length} chars) — may be truncated in search results`,
        details: { title, length: title.length },
      });
    }
  }
  return issues;
};

// 11. Meta description check
export const checkMetaDescription: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const desc =
    $('meta[name="description"]').attr("content")?.trim() || "";

  if (!desc) {
    issues.push({
      checkId: "missing_meta_description",
      category: "on_page",
      severity: "high",
      impactArea: "ctr",
      message: "Page is missing a meta description",
    });
  } else {
    if (desc.length < 50) {
      issues.push({
        checkId: "meta_description_too_short",
        category: "on_page",
        severity: "medium",
        impactArea: "ctr",
        message: `Meta description is too short (${desc.length} chars) — aim for 120-160 characters`,
        details: { description: desc, length: desc.length },
      });
    } else if (desc.length > 160) {
      issues.push({
        checkId: "meta_description_too_long",
        category: "on_page",
        severity: "low",
        impactArea: "ctr",
        message: `Meta description is too long (${desc.length} chars) — may be truncated`,
        details: { description: desc, length: desc.length },
      });
    }
  }
  return issues;
};

// 12. Heading structure check
export const checkHeadings: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const h1s = $("h1");
  const h2s = $("h2");

  if (h1s.length === 0) {
    issues.push({
      checkId: "missing_h1",
      category: "on_page",
      severity: "high",
      impactArea: "rankings",
      message: "Page is missing an H1 heading",
    });
  } else if (h1s.length > 1) {
    issues.push({
      checkId: "multiple_h1",
      category: "on_page",
      severity: "medium",
      impactArea: "rankings",
      message: `Page has ${h1s.length} H1 tags — use only one H1 per page`,
      details: {
        h1s: h1s
          .map((_, el) => $(el).text().trim())
          .get(),
      },
    });
  } else {
    const h1Text = h1s.first().text().trim();
    if (h1Text.length < 5) {
      issues.push({
        checkId: "h1_too_short",
        category: "on_page",
        severity: "medium",
        impactArea: "rankings",
        message: "H1 heading is too short to be meaningful",
        details: { h1: h1Text },
      });
    }
  }

  if (h2s.length === 0 && page.html.length > 3000) {
    issues.push({
      checkId: "missing_h2",
      category: "on_page",
      severity: "low",
      impactArea: "rankings",
      message: "Page has content but no H2 subheadings — consider adding structure",
    });
  }

  // Check heading hierarchy (H2 before any H3, etc.)
  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = (el as unknown as { tagName: string }).tagName;
    headings.push({
      level: parseInt(tag[1]),
      text: $(el).text().trim(),
    });
  });

  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      issues.push({
        checkId: "heading_skip",
        category: "on_page",
        severity: "low",
        impactArea: "rankings",
        message: `Heading hierarchy skips a level (H${headings[i - 1].level} → H${headings[i].level})`,
        details: {
          from: `H${headings[i - 1].level}: ${headings[i - 1].text}`,
          to: `H${headings[i].level}: ${headings[i].text}`,
        },
      });
      break; // Only report once
    }
  }

  return issues;
};

// 13. Image alt text check
export const checkImages: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const images = $("img");
  let missingAlt = 0;
  let emptyAlt = 0;
  const totalImages = images.length;

  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined) {
      missingAlt++;
    } else if (alt.trim() === "") {
      emptyAlt++;
    }
  });

  if (missingAlt > 0) {
    issues.push({
      checkId: "images_missing_alt",
      category: "on_page",
      severity: "high",
      impactArea: "rankings",
      message: `${missingAlt} of ${totalImages} images are missing alt attributes`,
      details: { missingAlt, totalImages },
    });
  }

  if (emptyAlt > 2) {
    issues.push({
      checkId: "images_empty_alt",
      category: "on_page",
      severity: "low",
      impactArea: "rankings",
      message: `${emptyAlt} images have empty alt text — acceptable for decorative images only`,
      details: { emptyAlt, totalImages },
    });
  }

  return issues;
};

// 14. Structured data / Schema check
export const checkStructuredData: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const microdata = $("[itemscope]");

  if (jsonLdScripts.length === 0 && microdata.length === 0) {
    issues.push({
      checkId: "missing_structured_data",
      category: "on_page",
      severity: "medium",
      impactArea: "ctr",
      message: "No structured data (Schema.org) found — missing rich snippet opportunity",
    });
  } else {
    // Validate JSON-LD syntax
    jsonLdScripts.each((_, el) => {
      const content = $(el).html();
      if (content) {
        try {
          JSON.parse(content);
        } catch {
          issues.push({
            checkId: "invalid_json_ld",
            category: "on_page",
            severity: "high",
            impactArea: "ctr",
            message: "Invalid JSON-LD structured data — contains syntax errors",
          });
        }
      }
    });
  }

  return issues;
};

// 15. URL structure check
export const checkUrlStructure: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];

  try {
    const parsed = new URL(page.url);
    const path = parsed.pathname;

    if (path.length > 115) {
      issues.push({
        checkId: "url_too_long",
        category: "on_page",
        severity: "low",
        impactArea: "ux",
        message: `URL path is very long (${path.length} chars)`,
        details: { path },
      });
    }

    if (/[A-Z]/.test(path)) {
      issues.push({
        checkId: "url_uppercase",
        category: "on_page",
        severity: "low",
        impactArea: "crawl_efficiency",
        message: "URL contains uppercase characters — can cause duplicate content issues",
        details: { path },
      });
    }

    if (path.includes("_")) {
      issues.push({
        checkId: "url_underscores",
        category: "on_page",
        severity: "low",
        impactArea: "rankings",
        message: "URL uses underscores instead of hyphens — Google treats hyphens as word separators",
        details: { path },
      });
    }

    // Check for query parameters that might indicate duplicate content
    if (parsed.search.length > 50) {
      issues.push({
        checkId: "url_excessive_params",
        category: "on_page",
        severity: "low",
        impactArea: "crawl_efficiency",
        message: "URL has many query parameters — may create duplicate content",
        details: { search: parsed.search },
      });
    }
  } catch {
    // Invalid URL
  }

  return issues;
};

export const onPageChecks: CheckFunction[] = [
  checkTitle,
  checkMetaDescription,
  checkHeadings,
  checkImages,
  checkStructuredData,
  checkUrlStructure,
];
