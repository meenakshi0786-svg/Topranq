import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// Hreflang / Internationalization checks

// 46. Hreflang validation
export const checkHreflang: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const hreflangTags = $('link[rel="alternate"][hreflang]');

  if (hreflangTags.length === 0) return issues; // No i18n, nothing to check

  const hreflangs: Array<{ lang: string; href: string }> = [];
  const errors: string[] = [];

  hreflangTags.each((_, el) => {
    const lang = $(el).attr("hreflang") || "";
    const href = $(el).attr("href") || "";

    hreflangs.push({ lang, href });

    // Validate language code format (ISO 639-1 + optional ISO 3166-1)
    if (!/^[a-z]{2}(-[A-Za-z]{2})?$/.test(lang) && lang !== "x-default") {
      errors.push(`Invalid language code: "${lang}"`);
    }

    // Validate href is absolute URL
    if (href && !href.startsWith("http://") && !href.startsWith("https://")) {
      errors.push(`hreflang href must be absolute URL: "${href}"`);
    }
  });

  // Check for self-referencing hreflang
  const hasSelfRef = hreflangs.some((h) => {
    try {
      return new URL(h.href).pathname === new URL(page.url).pathname;
    } catch { return false; }
  });

  if (!hasSelfRef) {
    errors.push("Missing self-referencing hreflang tag — every page should include its own language in the hreflang set");
  }

  // Check for x-default
  const hasXDefault = hreflangs.some((h) => h.lang === "x-default");
  if (hreflangs.length > 1 && !hasXDefault) {
    errors.push('Missing x-default hreflang — add <link rel="alternate" hreflang="x-default" href="..." /> for users with no language match');
  }

  // Check for return tags (each target should link back)
  const currentLang = hreflangs.find((h) => {
    try { return new URL(h.href).pathname === new URL(page.url).pathname; } catch { return false; }
  });

  if (currentLang) {
    // Check other pages in the crawl for return tags
    for (const hf of hreflangs) {
      if (hf.lang === currentLang.lang) continue;

      const targetPage = context.allPages.find((p) => {
        try { return new URL(p.url).pathname === new URL(hf.href).pathname; } catch { return false; }
      });

      if (targetPage?.html) {
        const target$ = cheerio.load(targetPage.html);
        const returnTag = target$(`link[rel="alternate"][hreflang="${currentLang.lang}"]`);
        if (returnTag.length === 0) {
          errors.push(`Missing return hreflang: ${hf.href} (${hf.lang}) doesn't link back to this page (${currentLang.lang})`);
        }
      }
    }
  }

  if (errors.length > 0) {
    issues.push({
      checkId: "hreflang_errors",
      category: "technical",
      severity: errors.length > 3 ? "high" : "medium",
      impactArea: "rankings",
      message: `Hreflang implementation has ${errors.length} issue(s): ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? ` and ${errors.length - 2} more` : ""}`,
      details: { errors, hreflangCount: hreflangs.length },
    });
  }

  return issues;
};

// 47. Language declaration check
export const checkLanguageDeclaration: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const htmlLang = $("html").attr("lang");

  if (!htmlLang) {
    issues.push({
      checkId: "missing_html_lang",
      category: "technical",
      severity: "medium",
      impactArea: "rankings",
      message: 'Missing lang attribute on <html> — add lang="en" (or appropriate language) for accessibility and SEO',
    });
  } else if (!/^[a-z]{2}(-[A-Za-z]{2,})?$/.test(htmlLang)) {
    issues.push({
      checkId: "invalid_html_lang",
      category: "technical",
      severity: "low",
      impactArea: "rankings",
      message: `Invalid lang attribute value: "${htmlLang}" — use ISO 639-1 format (e.g., "en", "en-US")`,
      details: { lang: htmlLang },
    });
  }

  return issues;
};

export const hreflangChecks: CheckFunction[] = [
  checkHreflang,
  checkLanguageDeclaration,
];
