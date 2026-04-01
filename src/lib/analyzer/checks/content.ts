import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// 16. Word count / thin content check
export const checkWordCount: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);

  // Remove script, style, nav, footer, header to get main content
  $("script, style, nav, footer, header, aside").remove();
  const text = $("body").text();
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 50) {
    issues.push({
      checkId: "very_thin_content",
      category: "content",
      severity: "critical",
      impactArea: "rankings",
      message: `Page has very thin content (${wordCount} words) — too little for search engines to understand topic`,
      details: { wordCount },
    });
  } else if (wordCount < 200) {
    issues.push({
      checkId: "thin_content",
      category: "content",
      severity: "high",
      impactArea: "rankings",
      message: `Page has thin content (${wordCount} words) — consider expanding to at least 300 words`,
      details: { wordCount },
    });
  }

  return issues;
};

// 17. Content readability check (simple Flesch-Kincaid approximation)
export const checkReadability: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  $("script, style, nav, footer, header, aside").remove();
  const text = $("body").text().trim();

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length < 100) return issues; // Not enough content to judge

  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);

  if (avgWordsPerSentence > 25) {
    issues.push({
      checkId: "low_readability",
      category: "content",
      severity: "medium",
      impactArea: "ux",
      message: `Average sentence length is ${avgWordsPerSentence.toFixed(0)} words — hard to read, aim for 15-20`,
      details: {
        avgWordsPerSentence: Math.round(avgWordsPerSentence),
        totalSentences: sentences.length,
      },
    });
  }

  return issues;
};

// 18. Duplicate content check (across pages in the crawl)
export const checkDuplicateContent: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  // Find other pages with same title
  const $ = cheerio.load(page.html);
  const title = $("title").first().text().trim();

  if (!title) return issues;

  const duplicatePages = context.allPages.filter((p) => {
    if (p.url === page.url || !p.html) return false;
    const p$ = cheerio.load(p.html);
    return p$("title").first().text().trim() === title;
  });

  if (duplicatePages.length > 0) {
    issues.push({
      checkId: "duplicate_title",
      category: "content",
      severity: "high",
      impactArea: "rankings",
      message: `Title tag "${title}" is duplicated across ${duplicatePages.length + 1} pages`,
      details: {
        duplicateUrls: duplicatePages.map((p) => p.url),
      },
    });
  }

  // Check for duplicate meta descriptions
  const desc = $('meta[name="description"]').attr("content")?.trim();
  if (desc) {
    const duplicateDescs = context.allPages.filter((p) => {
      if (p.url === page.url || !p.html) return false;
      const p$ = cheerio.load(p.html);
      return p$('meta[name="description"]').attr("content")?.trim() === desc;
    });

    if (duplicateDescs.length > 0) {
      issues.push({
        checkId: "duplicate_meta_description",
        category: "content",
        severity: "medium",
        impactArea: "ctr",
        message: `Meta description is duplicated across ${duplicateDescs.length + 1} pages`,
        details: {
          duplicateUrls: duplicateDescs.map((p) => p.url),
        },
      });
    }
  }

  return issues;
};

// 19. Keyword placement heuristics
export const checkKeywordPlacement: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const title = $("title").first().text().trim().toLowerCase();
  const h1 = $("h1").first().text().trim().toLowerCase();
  const desc = ($('meta[name="description"]').attr("content") || "").toLowerCase();

  // If title and H1 exist but share zero significant words, flag it
  if (title && h1 && title.length > 5 && h1.length > 5) {
    const titleWords = new Set(
      title.split(/\s+/).filter((w) => w.length > 3)
    );
    const h1Words = h1.split(/\s+/).filter((w) => w.length > 3);
    const overlap = h1Words.filter((w) => titleWords.has(w));

    if (overlap.length === 0) {
      issues.push({
        checkId: "title_h1_mismatch",
        category: "content",
        severity: "medium",
        impactArea: "rankings",
        message: "Title and H1 share no common keywords — they should reinforce each other",
        details: { title, h1 },
      });
    }
  }

  // Check if meta description contains any words from the title
  if (title && desc && title.length > 5 && desc.length > 10) {
    const titleWords = new Set(
      title.split(/\s+/).filter((w) => w.length > 4)
    );
    const descWords = desc.split(/\s+/).filter((w) => w.length > 4);
    const overlap = descWords.filter((w) => titleWords.has(w));

    if (overlap.length === 0 && titleWords.size > 0) {
      issues.push({
        checkId: "meta_desc_no_keyword",
        category: "content",
        severity: "low",
        impactArea: "ctr",
        message: "Meta description doesn't contain key terms from the title",
        details: { title, description: desc },
      });
    }
  }

  return issues;
};

// 20. Basic E-E-A-T surface indicators
export const checkEEAT: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  const html = page.html.toLowerCase();

  // Check for author information
  const hasAuthor =
    $('[rel="author"]').length > 0 ||
    $(".author, .byline, [itemprop='author']").length > 0 ||
    html.includes("written by") ||
    html.includes("author");

  // Check for date
  const hasDate =
    $("time, [datetime], .date, .published, [itemprop='datePublished']")
      .length > 0;

  // Only flag for content-heavy pages (likely blog/article pages)
  const wordCount = $("body").text().split(/\s+/).length;

  if (wordCount > 300 && !hasAuthor) {
    issues.push({
      checkId: "missing_author",
      category: "content",
      severity: "low",
      impactArea: "rankings",
      message: "Content page has no visible author attribution — weak E-E-A-T signal",
    });
  }

  if (wordCount > 300 && !hasDate) {
    issues.push({
      checkId: "missing_publish_date",
      category: "content",
      severity: "low",
      impactArea: "rankings",
      message: "Content page has no visible publish/update date — weak freshness signal",
    });
  }

  return issues;
};

export const contentChecks: CheckFunction[] = [
  checkWordCount,
  checkReadability,
  checkDuplicateContent,
  checkKeywordPlacement,
  checkEEAT,
];
