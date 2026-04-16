import type { InferSelectModel } from "drizzle-orm";
import type { pages as pagesTable } from "../db/schema";

type PageRow = InferSelectModel<typeof pagesTable>;

export interface PageGEOScore {
  pageId: string;
  url: string;
  title: string | null;
  score: number; // 0-100
  checks: {
    hasClearTitle: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    hasMinContent: boolean;
    hasSchema: boolean;
    hasFaqSchema: boolean;
    hasArticleSchema: boolean;
    canonicalSet: boolean;
  };
  suggestions: string[];
}

export interface DomainGEOReport {
  overallScore: number; // 0-100, weighted average across pages
  pagesAnalyzed: number;
  aiCrawlers: {
    checked: boolean;
    allowed: string[];
    blocked: string[];
    wildcardBlock: boolean;
  };
  hasLlmsTxt: boolean;
  pageScores: PageGEOScore[];
  topIssues: Array<{
    issue: string;
    affectedCount: number;
    recommendation: string;
    severity: "high" | "medium" | "low";
    affectedPages: Array<{ url: string; title: string | null; suggestion: string }>;
  }>;
}

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Bytespider",
  "CCBot",
];

export function scorePage(page: PageRow): PageGEOScore {
  const schema = page.schemaMarkup || "";
  const hasSchema = schema.length > 10;
  const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/i.test(schema);
  const hasArticleSchema = /"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/i.test(schema);

  const hasClearTitle = !!(page.title && page.title.length >= 20 && page.title.length <= 70);
  const hasMetaDescription = !!(page.metaDescription && page.metaDescription.length >= 80 && page.metaDescription.length <= 180);
  const hasH1 = !!(page.h1 && page.h1.trim().length > 0);
  const hasMinContent = (page.wordCount || 0) >= 300;
  const canonicalSet = !!page.canonicalUrl;

  // Weighted scoring
  let score = 0;
  if (hasClearTitle) score += 15;
  else if (page.title) score += 5;

  if (hasMetaDescription) score += 15;
  else if (page.metaDescription) score += 5;

  if (hasH1) score += 15;
  if (hasMinContent) score += 15;
  if (hasSchema) score += 10;
  if (hasFaqSchema) score += 15;
  if (hasArticleSchema) score += 10;
  if (canonicalSet) score += 5;

  const suggestions: string[] = [];
  if (!hasClearTitle) suggestions.push("Tighten page title to 20–70 characters with primary keyword");
  if (!hasMetaDescription) suggestions.push("Add a 80–180 character meta description — AI engines use this as citation preview");
  if (!hasH1) suggestions.push("Add a single descriptive H1 heading");
  if (!hasMinContent) suggestions.push("Expand content to 300+ words so AI engines have enough to extract");
  if (!hasSchema) suggestions.push("Add JSON-LD structured data");
  if (!hasFaqSchema && (page.wordCount || 0) > 500) suggestions.push("Add FAQPage schema — the single biggest lift for AI citation");
  if (!hasArticleSchema && (page.wordCount || 0) > 500) suggestions.push("Add Article or BlogPosting schema");
  if (!canonicalSet) suggestions.push("Set a canonical URL to avoid duplicate citation");

  return {
    pageId: page.id,
    url: page.url,
    title: page.title,
    score: Math.min(100, score),
    checks: {
      hasClearTitle,
      hasMetaDescription,
      hasH1,
      hasMinContent,
      hasSchema,
      hasFaqSchema,
      hasArticleSchema,
      canonicalSet,
    },
    suggestions,
  };
}

export function analyzeRobotsTxt(robotsTxt: string | null): {
  allowed: string[];
  blocked: string[];
  wildcardBlock: boolean;
} {
  if (!robotsTxt) {
    return { allowed: AI_CRAWLERS, blocked: [], wildcardBlock: false };
  }

  const blocked: string[] = [];
  const allowed: string[] = [];

  for (const crawler of AI_CRAWLERS) {
    const pattern = new RegExp(`user-agent:\\s*${crawler}[\\s\\S]*?disallow:\\s*/`, "i");
    if (pattern.test(robotsTxt)) {
      blocked.push(crawler);
    } else {
      allowed.push(crawler);
    }
  }

  const wildcardBlock = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/m.test(robotsTxt);

  return { allowed, blocked, wildcardBlock };
}

export function buildGEOReport(
  pages: PageRow[],
  robotsTxt: string | null,
  hasLlmsTxt: boolean = false
): DomainGEOReport {
  const pageScores = pages.map(scorePage);
  const overallScore =
    pageScores.length > 0
      ? Math.round(pageScores.reduce((sum, p) => sum + p.score, 0) / pageScores.length)
      : 0;

  const robotsAnalysis = analyzeRobotsTxt(robotsTxt);

  // Aggregate top issues
  const issueCount = {
    title: 0,
    meta: 0,
    h1: 0,
    content: 0,
    schema: 0,
    faq: 0,
    article: 0,
    canonical: 0,
  };
  for (const p of pageScores) {
    if (!p.checks.hasClearTitle) issueCount.title++;
    if (!p.checks.hasMetaDescription) issueCount.meta++;
    if (!p.checks.hasH1) issueCount.h1++;
    if (!p.checks.hasMinContent) issueCount.content++;
    if (!p.checks.hasSchema) issueCount.schema++;
    if (!p.checks.hasFaqSchema) issueCount.faq++;
    if (!p.checks.hasArticleSchema) issueCount.article++;
    if (!p.checks.canonicalSet) issueCount.canonical++;
  }

  // Helper: collect pages failing a specific check
  const pagesFor = (checkKey: keyof PageGEOScore["checks"], suggestion: string) =>
    pageScores
      .filter((p) => !p.checks[checkKey])
      .map((p) => ({ url: p.url, title: p.title, suggestion }));

  const topIssues: DomainGEOReport["topIssues"] = [];
  if (issueCount.faq > 0) topIssues.push({
    issue: "Missing FAQPage schema",
    affectedCount: issueCount.faq,
    recommendation: "Add FAQPage JSON-LD to pages with Q&A content — biggest lift for AI citation",
    severity: "high",
    affectedPages: pagesFor("hasFaqSchema", "Add FAQPage JSON-LD with Q&A pairs from existing content"),
  });
  if (issueCount.schema > 0) topIssues.push({
    issue: "No structured data",
    affectedCount: issueCount.schema,
    recommendation: "Add JSON-LD schema so AI engines can understand page context",
    severity: "high",
    affectedPages: pagesFor("hasSchema", "Add Article, Product, or Organization JSON-LD schema"),
  });
  if (robotsAnalysis.wildcardBlock || robotsAnalysis.blocked.length === AI_CRAWLERS.length) {
    topIssues.push({
      issue: "AI crawlers blocked in robots.txt",
      affectedCount: 1,
      recommendation: "Allow GPTBot, ClaudeBot, PerplexityBot, Google-Extended in robots.txt",
      severity: "high",
      affectedPages: [{ url: "/robots.txt", title: "robots.txt", suggestion: "Remove Disallow rules for AI user agents" }],
    });
  } else if (robotsAnalysis.blocked.length > 0) {
    topIssues.push({
      issue: `${robotsAnalysis.blocked.length} AI crawler(s) blocked`,
      affectedCount: robotsAnalysis.blocked.length,
      recommendation: `Unblock: ${robotsAnalysis.blocked.join(", ")}`,
      severity: "medium",
      affectedPages: robotsAnalysis.blocked.map((bot) => ({ url: "/robots.txt", title: bot, suggestion: `Allow ${bot} in robots.txt` })),
    });
  }
  if (!hasLlmsTxt) {
    topIssues.push({
      issue: "No llms.txt file",
      affectedCount: 1,
      recommendation: "Add an llms.txt file at your site root — use the generator on this page",
      severity: "medium",
      affectedPages: [{ url: "/llms.txt", title: "llms.txt", suggestion: "Generate and upload llms.txt to your site root" }],
    });
  }
  if (issueCount.meta > 0) topIssues.push({
    issue: "Weak meta descriptions",
    affectedCount: issueCount.meta,
    recommendation: "Write 80–180 char meta descriptions — AI engines use these as citation previews",
    severity: "medium",
    affectedPages: pagesFor("hasMetaDescription", "Write a unique 80–180 character meta description with target keyword"),
  });
  if (issueCount.content > 0) topIssues.push({
    issue: "Thin content",
    affectedCount: issueCount.content,
    recommendation: "Pages under 300 words are rarely cited — expand or consolidate",
    severity: "low",
    affectedPages: pagesFor("hasMinContent", "Expand to 300+ words or merge with a related page"),
  });

  return {
    overallScore,
    pagesAnalyzed: pages.length,
    aiCrawlers: {
      checked: robotsTxt !== null,
      allowed: robotsAnalysis.allowed,
      blocked: robotsAnalysis.blocked,
      wildcardBlock: robotsAnalysis.wildcardBlock,
    },
    hasLlmsTxt,
    pageScores: pageScores.sort((a, b) => a.score - b.score),
    topIssues,
  };
}

/**
 * Generate an AI-optimized llms.txt that helps LLMs understand, retrieve,
 * and cite this website. Uses Claude to analyze the pages and produce
 * structured sections: About, grouped URLs, Key Topics, Use Cases, Audience.
 * Falls back to a static template if the AI call fails.
 */
export async function generateLlmsTxt(
  domainUrl: string,
  pages: PageRow[],
  sitemapUrls: string[] = [],
  language: string = "English",
): Promise<string> {
  const hostname = (() => { try { return new URL(domainUrl).hostname; } catch { return domainUrl; } })();

  // Collect all URLs with titles + descriptions for the AI prompt
  const crawledUrls = new Set(pages.map((p) => p.url));
  const pageEntries = pages.map((p) => ({
    url: p.url,
    title: p.title || "",
    description: p.metaDescription || "",
  }));
  const extraUrls = sitemapUrls
    .filter((u) => !crawledUrls.has(u))
    .slice(0, 80)
    .map((u) => {
      const path = (() => { try { return new URL(u).pathname; } catch { return u; } })();
      return { url: u, title: path, description: "" };
    });
  const allUrls = [...pageEntries, ...extraUrls];

  const urlBlock = allUrls
    .map((u) => `- ${u.title || u.url} | ${u.url}${u.description ? ` | ${u.description}` : ""}`)
    .join("\n");

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && allUrls.length > 0) {
    try {
      const optimized = await generateOptimizedLlmsTxt(apiKey, hostname, domainUrl, urlBlock, language);
      if (optimized) return optimized;
    } catch (err) {
      console.warn("[llms.txt] AI optimization failed, falling back to static:", err);
    }
  }

  // Static fallback
  return buildStaticLlmsTxt(hostname, pageEntries, extraUrls);
}

async function generateOptimizedLlmsTxt(
  apiKey: string,
  hostname: string,
  domainUrl: string,
  urlBlock: string,
  language: string = "English",
): Promise<string | null> {
  const langInstruction = language !== "English"
    ? `\n\nLANGUAGE REQUIREMENT: Write the ENTIRE output in ${language}. All descriptions, sections, key topics, capabilities, use cases, and audience text MUST be in native ${language}. Only URLs and technical terms (JSON-LD, schema.org) stay in English.\n`
    : "";
  const prompt = `You are an expert in Generative Engine Optimization (GEO) and AI search systems.
${langInstruction}
Transform the following URL list for ${hostname} (${domainUrl}) into a high-quality, AI-optimized llms.txt that scores 9/10+ for LLM retrieval, understanding, and citation.

URLs (format: title | url | description):
${urlBlock}

OUTPUT: Clean markdown only. No code fences. Follow this EXACT structure:

# ${hostname}

> [2-3 sentences. State what the platform does in practical terms. Focus on function, not buzzwords.]

## Core Pages
[Most important pages only. Each: - [Title](url): Specific, factual 1-line description]

## Products / Services
[If applicable. Same format.]

## Documentation / Technical Resources
[If applicable.]

## Content / Resources
[Blog, events, guides.]

## Company / Legal
[Low priority: terms, privacy, careers.]

## Key Topics
[5-10 bullet points: industry, technology, core concepts this site covers]

## Capabilities
[4-6 bullet points describing what users can actually DO with this platform. Action-oriented. Example: "Build and deploy autonomous AI agents" NOT "Innovative agent technology"]

## Use Cases
[3-6 realistic, practical use cases. No vague or buzzword-heavy phrasing.]

## Audience
[Who this platform is for]

## Citation Policy
Content on this site may be cited by AI models (ChatGPT, Claude, Perplexity, Google AI Overviews).
Please attribute citations back to the original page URL.

STRICT RULES:
1. Do NOT hallucinate features, products, or claims — only infer from provided URLs/titles/descriptions
2. Do NOT use hedging: never write "may", "might", "potentially", "likely", "could be", "possible", "appears to"
3. Do NOT use marketing fluff: never write "innovative", "cutting-edge", "next-generation", "revolutionary", "state-of-the-art"
4. If you cannot determine what a page does from its title/URL, write a safe factual description based on what IS known, or omit it
5. Each description must be specific and informative — max 1-2 lines
6. Prefer clarity over creativity

QUALITY CHECK — before returning, verify:
- Zero hedging words in the entire output
- Zero marketing buzzwords
- Every description answers: what IS this page, not what it MIGHT be
- The Capabilities section uses action verbs (Build, Deploy, Create, Monitor, Analyze)
- The document answers: What is this site? What does it enable? When should an AI cite it?`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-haiku",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || text.length < 100) return null;

  // Strip any wrapping code fences the model might add
  return text.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim() + "\n";
}

function buildStaticLlmsTxt(
  hostname: string,
  pages: Array<{ url: string; title: string; description: string }>,
  extra: Array<{ url: string; title: string }>,
): string {
  const lines: string[] = [];
  lines.push(`# ${hostname}`);
  lines.push("");
  lines.push(`> Website content indexed for AI engines and large language models.`);
  lines.push("");

  if (pages.length > 0) {
    lines.push("## Pages");
    lines.push("");
    for (const p of pages) {
      const title = p.title || p.url;
      const desc = p.description ? `: ${p.description}` : "";
      lines.push(`- [${title}](${p.url})${desc}`);
    }
    lines.push("");
  }

  if (extra.length > 0) {
    lines.push("## Additional URLs");
    lines.push("");
    for (const u of extra) lines.push(`- [${u.title}](${u.url})`);
    lines.push("");
  }

  lines.push("## Citation Policy");
  lines.push("");
  lines.push("Content on this site may be cited by AI models (ChatGPT, Claude, Perplexity, Google AI Overviews).");
  lines.push("Please attribute citations back to the original page URL.");
  lines.push("");
  return lines.join("\n");
}
