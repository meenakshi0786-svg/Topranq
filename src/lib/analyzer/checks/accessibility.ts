import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// 1. Check for skip navigation link
export const checkSkipNav: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const skipLink = $('a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-nav, .skip-link, .skip-to-content');

  if (skipLink.length === 0) {
    issues.push({
      checkId: "missing_skip_nav",
      category: "on_page",
      severity: "low",
      impactArea: "ux",
      message: "Missing skip navigation link — keyboard users can't skip repeated navigation",
    });
  }

  return issues;
};

// 2. Check form labels and ARIA
export const checkFormAccessibility: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  let unlabeledInputs = 0;

  $("input, select, textarea").each((_, el) => {
    const type = $(el).attr("type") || "";
    if (type === "hidden" || type === "submit" || type === "button") return;

    const id = $(el).attr("id");
    const ariaLabel = $(el).attr("aria-label");
    const ariaLabelledBy = $(el).attr("aria-labelledby");
    const placeholder = $(el).attr("placeholder");
    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;

    if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder) {
      unlabeledInputs++;
    }
  });

  if (unlabeledInputs > 0) {
    issues.push({
      checkId: "unlabeled_form_fields",
      category: "on_page",
      severity: "medium",
      impactArea: "ux",
      message: `${unlabeledInputs} form field(s) missing labels — screen readers can't identify these inputs`,
      details: { unlabeledInputs },
    });
  }

  return issues;
};

// 3. Check for ARIA landmarks
export const checkLandmarks: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  const hasMain = $("main, [role='main']").length > 0;
  const hasNav = $("nav, [role='navigation']").length > 0;

  if (!hasMain) {
    issues.push({
      checkId: "missing_main_landmark",
      category: "on_page",
      severity: "low",
      impactArea: "ux",
      message: "No <main> element or role=\"main\" — assistive technologies can't identify the primary content",
    });
  }

  if (!hasNav) {
    issues.push({
      checkId: "missing_nav_landmark",
      category: "on_page",
      severity: "low",
      impactArea: "ux",
      message: "No <nav> element or role=\"navigation\" — screen readers can't find navigation",
    });
  }

  return issues;
};

// 4. Check for interactive element accessibility
export const checkInteractiveElements: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  let emptyButtons = 0;
  let emptyLinks = 0;

  // Buttons without text
  $("button").each((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr("aria-label");
    const title = $(el).attr("title");
    if (!text && !ariaLabel && !title && $(el).find("img[alt]").length === 0) {
      emptyButtons++;
    }
  });

  // Links without text
  $("a[href]").each((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr("aria-label");
    const title = $(el).attr("title");
    if (!text && !ariaLabel && !title && $(el).find("img[alt]").length === 0) {
      emptyLinks++;
    }
  });

  if (emptyButtons > 0) {
    issues.push({
      checkId: "empty_buttons",
      category: "on_page",
      severity: "medium",
      impactArea: "ux",
      message: `${emptyButtons} button(s) have no accessible text — screen readers announce them as "button"`,
      details: { emptyButtons },
    });
  }

  if (emptyLinks > 0) {
    issues.push({
      checkId: "empty_links",
      category: "on_page",
      severity: "medium",
      impactArea: "ux",
      message: `${emptyLinks} link(s) have no accessible text — these are unusable for screen reader users`,
      details: { emptyLinks },
    });
  }

  return issues;
};

// 5. Check color contrast (basic - detect inline styles with likely poor contrast)
export const checkContrastHints: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Check for very small font sizes
  let tinyText = 0;
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const fontSizeMatch = style.match(/font-size:\s*(\d+)(px|pt)/i);
    if (fontSizeMatch) {
      const size = parseInt(fontSizeMatch[1]);
      const unit = fontSizeMatch[2];
      if ((unit === "px" && size < 12) || (unit === "pt" && size < 9)) {
        tinyText++;
      }
    }
  });

  if (tinyText > 3) {
    issues.push({
      checkId: "tiny_text",
      category: "on_page",
      severity: "low",
      impactArea: "ux",
      message: `${tinyText} elements with very small text (< 12px) — may be unreadable on mobile`,
      details: { tinyText },
    });
  }

  return issues;
};

export const accessibilityChecks: CheckFunction[] = [
  checkSkipNav,
  checkFormAccessibility,
  checkLandmarks,
  checkInteractiveElements,
  checkContrastHints,
];
