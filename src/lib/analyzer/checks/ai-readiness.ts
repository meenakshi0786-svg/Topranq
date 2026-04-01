import * as cheerio from "cheerio";
import type { CheckFunction, SEOIssue } from "../types";

// AI Search Readiness — Checks for AI crawler access and citability

// 37. AI crawler robots.txt check
export const checkAICrawlerAccess: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];

  // Only run on the start URL (site-level check)
  if (page.url !== context.startUrl) return issues;
  if (!context.robotsTxtContent) return issues;

  const robots = context.robotsTxtContent.toLowerCase();

  const aiCrawlers = [
    { name: "GPTBot", agent: "gptbot" },
    { name: "ChatGPT-User", agent: "chatgpt-user" },
    { name: "ClaudeBot", agent: "claudebot" },
    { name: "Claude-Web", agent: "claude-web" },
    { name: "PerplexityBot", agent: "perplexitybot" },
    { name: "Google-Extended", agent: "google-extended" },
    { name: "Bytespider", agent: "bytespider" },
    { name: "CCBot", agent: "ccbot" },
  ];

  const blockedCrawlers: string[] = [];
  const allowedCrawlers: string[] = [];

  for (const crawler of aiCrawlers) {
    // Check for user-agent block
    const agentPattern = new RegExp(`user-agent:\\s*${crawler.agent}[\\s\\S]*?disallow:\\s*/`, "i");
    if (agentPattern.test(context.robotsTxtContent)) {
      blockedCrawlers.push(crawler.name);
    } else {
      allowedCrawlers.push(crawler.name);
    }
  }

  // Also check wildcard blocks
  const hasWildcardBlock = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/m.test(context.robotsTxtContent);

  if (blockedCrawlers.length > 0 && blockedCrawlers.length < aiCrawlers.length) {
    issues.push({
      checkId: "some_ai_crawlers_blocked",
      category: "technical",
      severity: "low",
      impactArea: "traffic",
      message: `Some AI crawlers blocked in robots.txt: ${blockedCrawlers.join(", ")} — may reduce AI search visibility`,
      details: { blockedCrawlers, allowedCrawlers },
    });
  }

  if (blockedCrawlers.length === aiCrawlers.length || hasWildcardBlock) {
    issues.push({
      checkId: "all_ai_crawlers_blocked",
      category: "technical",
      severity: "medium",
      impactArea: "traffic",
      message: "All AI crawlers are blocked — your content won't appear in AI search results (ChatGPT, Perplexity, Google AI Overviews)",
      details: { blockedCrawlers },
    });
  }

  return issues;
};

// 38. llms.txt detection
export const checkLlmsTxt: CheckFunction = (page, context) => {
  const issues: SEOIssue[] = [];

  // Only run on start URL
  if (page.url !== context.startUrl) return issues;

  // Check if llms.txt is referenced or if we can detect it
  const hasLlmsTxt = context.robotsTxtContent?.toLowerCase().includes("llms.txt") || false;

  if (!hasLlmsTxt) {
    issues.push({
      checkId: "no_llms_txt",
      category: "technical",
      severity: "low",
      impactArea: "traffic",
      message: "No llms.txt file detected — this emerging standard helps AI models understand your site's purpose and preferred citation format",
    });
  }

  return issues;
};

// 39. AI citability check — content structure for AI extraction
export const checkAICitability: CheckFunction = (page) => {
  const issues: SEOIssue[] = [];
  if (!page.html) return issues;

  const $ = cheerio.load(page.html);
  $("script, style").remove();

  const wordCount = $("body").text().split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 200) return issues;

  // Check for clear question-answer patterns (good for AI snippets)
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const listCount = $("ul, ol").length;
  const tableCount = $("table").length;

  // Check for definition-style content (great for AI citation)
  const hasSummary = $("summary, .summary, .tldr, .key-takeaways, .highlights").length > 0;
  const hasDefinitions = $("dl, dfn, abbr[title]").length > 0;

  // Check for structured paragraphs (optimal 134-167 word passages)
  const paragraphs = $("p").toArray();
  let wellStructuredParagraphs = 0;
  for (const p of paragraphs) {
    const pWords = $(p).text().split(/\s+/).filter((w) => w.length > 0).length;
    if (pWords >= 40 && pWords <= 200) wellStructuredParagraphs++;
  }

  const structureScore = Math.min(10,
    (h2Count >= 2 ? 2 : 0) +
    (h3Count >= 1 ? 1 : 0) +
    (listCount >= 1 ? 2 : 0) +
    (tableCount >= 1 ? 1 : 0) +
    (hasSummary ? 2 : 0) +
    (hasDefinitions ? 1 : 0) +
    (wellStructuredParagraphs >= 3 ? 1 : 0)
  );

  if (wordCount > 500 && structureScore < 3) {
    issues.push({
      checkId: "poor_ai_citability",
      category: "content",
      severity: "medium",
      impactArea: "traffic",
      message: "Content lacks structured elements (headings, lists, tables, summaries) that AI models use for citation extraction",
      details: { structureScore, h2Count, listCount, tableCount, hasSummary },
    });
  }

  // Check for FAQ-style content (highly citable by AI)
  const hasFaqSchema = page.html.includes('"FAQPage"') || page.html.includes('"faqpage"');
  const hasFaqContent =
    $("h2, h3").toArray().some((el) => {
      const text = $(el).text().trim();
      return text.endsWith("?") || text.toLowerCase().startsWith("what") ||
             text.toLowerCase().startsWith("how") || text.toLowerCase().startsWith("why");
    });

  if (wordCount > 500 && hasFaqContent && !hasFaqSchema) {
    issues.push({
      checkId: "faq_without_schema",
      category: "content",
      severity: "low",
      impactArea: "traffic",
      message: "Page has FAQ-style headings but no FAQPage schema — adding schema increases AI citation likelihood",
    });
  }

  return issues;
};

export const aiReadinessChecks: CheckFunction[] = [
  checkAICrawlerAccess,
  checkLlmsTxt,
  checkAICitability,
];
