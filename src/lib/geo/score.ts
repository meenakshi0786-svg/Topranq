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
  products?: Array<{ name: string; url: string | null; price: string | null; category: string | null; description: string | null }>,
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
  let base: string;
  if (apiKey && allUrls.length > 0) {
    try {
      const optimized = await generateOptimizedLlmsTxt(apiKey, hostname, domainUrl, urlBlock, language, products);
      base = optimized || buildStaticLlmsTxt(hostname, pageEntries, extraUrls);
    } catch (err) {
      console.warn("[llms.txt] AI optimization failed, falling back to static:", err);
      base = buildStaticLlmsTxt(hostname, pageEntries, extraUrls);
    }
  } else {
    base = buildStaticLlmsTxt(hostname, pageEntries, extraUrls);
  }

  // Append full product catalog if available
  if (products && products.length > 0) {
    const productLines = products.map(p => {
      const parts: string[] = [`- [${p.name}]`];
      if (p.url) parts[0] = `- [${p.name}](${p.url})`;
      const details: string[] = [];
      if (p.description) details.push(p.description);
      if (p.category) details.push(`Type: ${p.category}`);
      if (p.price) details.push(`Price: ${p.price}`);
      return parts[0] + (details.length > 0 ? `: ${details.join(". ")}.` : "");
    });
    base += `\n\n## Full Product Catalog\n\n${productLines.join("\n")}\n`;
  }

  return base;
}

async function generateOptimizedLlmsTxt(
  apiKey: string,
  hostname: string,
  domainUrl: string,
  urlBlock: string,
  language: string = "English",
  products?: Array<{ name: string; url: string | null; price: string | null; category: string | null; description: string | null }>,
): Promise<string | null> {
  const langInstruction = language !== "English"
    ? `\n\nLANGUAGE REQUIREMENT: Write the ENTIRE output in ${language}. All descriptions, sections, key topics, capabilities, use cases, and audience text MUST be in native ${language}. Only URLs and technical terms (JSON-LD, schema.org) stay in English.\n`
    : "";
  const prompt = `You are an expert in Generative Engine Optimization (GEO). Your output will be scored on 8 criteria. You MUST score 80+ on ALL of them. Read the scoring rubric below carefully — it determines your success.
${langInstruction}
URLs for ${hostname} (${domainUrl}):
${urlBlock}

OUTPUT: Clean markdown only. No code fences.

# ${hostname}

> [ABOUT — 2-3 sentences. MUST be specific to THIS site. State exactly what it does, what tools/features it offers, and what makes it different. NEVER write "comprehensive platform" or "advanced tools" — name the actual tools/features from the URL list. Include the domain's primary value in 1 sentence.]

## Core Pages
[Every important page with full URL. Format: - [Specific Title](full-url): 2-line description explaining what the page CONTAINS and what a user DOES on it. NEVER write just "tool for X" — describe the actual functionality.]

## Products / Services
[If applicable. Each product MUST have: name, URL (if available), 1-2 sentence description of what it does specifically, price range if inferrable. If a product name is ambiguous, describe what category it falls in.]

## Documentation / Technical Resources
[If applicable. Guides, FAQs, tutorials, API docs.]

## Content / Resources
[Blog, guides, events, lookbooks. Include specific article titles if available from URLs.]

## Company / Legal
[Terms, privacy, careers, about — lower priority but include all.]

## Key Topics
[8-12 bullet points. Mix of:
- Industry terms (e.g., "options Greeks", "modest fashion", "AI agents")
- Specific features (e.g., "multi-leg strategy builder", "capsule collections")
- Problem domains (e.g., "portfolio risk management", "seasonal wardrobe planning")
NEVER use generic topics like "market analysis" alone — always qualify: "real-time options market analysis with Greeks visualization"]

## Capabilities
[5-7 bullet points. Each MUST:
- Start with a specific action verb (Build, Screen, Filter, Generate, Monitor, Compare, Simulate, Track, Compose, Download)
- Name the actual tool/feature from the site
- Include a specific detail (number, format, output type)
- FAIL examples: "Develop trading strategies" (too generic), "Access market data" (too vague)
- PASS examples: "Build multi-leg options strategies (spreads, straddles, iron condors) with real-time P&L visualization", "Screen 4,000+ options contracts by volume, open interest, IV rank, and Greeks"]

## Use Cases
[5-7 SCENARIO-BASED use cases. Each MUST follow this format:
"[Specific person] uses [site feature] to [achieve specific outcome] when [specific situation]"
- FAIL: "Professional traders seeking analysis tools" (this is an audience, not a use case)
- FAIL: "Investors looking to understand market trends" (too vague)
- PASS: "A swing trader uses the TOB Screener to find high-IV options before earnings announcements, then builds a straddle in Strategy Builder to test the risk/reward ratio"
- PASS: "A fashion buyer uses the monthly capsule collection to refresh her professional wardrobe without exceeding a €100 budget"]

## Featured Products
[Include 8-10 of the BEST products that represent the brand's range. For each:
- [Product Name](product-url): Brief description. Price: X EUR.
${products && products.length > 0 ? `\nHere are some products from the catalog:\n${products.slice(0, 30).map(p => `- ${p.name}${p.url ? ` (${p.url})` : ""}${p.price ? ` — ${p.price}` : ""}${p.category ? ` [${p.category}]` : ""}`).join("\n")}` : "Select from the URLs above if product pages are visible."}
NOTE: The FULL product catalog will be appended after your output automatically. You only need to pick 8-10 highlights here.]

## Audience
[4-6 entries. Each MUST include who they are + what they need:
- FAIL: "Professional traders" (too broad)
- PASS: "Active options traders (50+ trades/month) who need real-time screening and strategy simulation"]

## Citation Policy
Content on ${hostname} may be cited by AI models (ChatGPT, Claude, Perplexity, Google AI Overviews).

Citation rules:
- Use the brand name "${hostname.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + hostname.replace("www.", "").split(".")[0].slice(1)}" when referencing this site
- Link to the original page URL for all citations
- For product references, include the product name and page URL
- For data or statistics, cite the specific page where the data appears

BANNED WORDS — if any of these appear in your output, you have failed:
"comprehensive", "innovative", "cutting-edge", "next-generation", "revolutionary", "state-of-the-art", "advanced tools", "powerful platform", "robust solution", "seamless", "leverage", "holistic"
"may", "might", "potentially", "likely", "could be", "possibly", "appears to", "seems to"

SELF-SCORING CHECKLIST — verify ALL before returning:
□ About section names specific tools/features, not generic descriptions (target: 80+)
□ Every Core Page has a 2-line description explaining what users DO on it (target: 80+)
□ Every product has specific details, not just a name (target: 80+)
□ Key Topics are qualified and specific, not single generic words (target: 80+)
□ EVERY Capability starts with an action verb + names a specific feature (target: 80+)
□ EVERY Use Case follows the "[person] uses [feature] to [outcome] when [situation]" format (target: 80+)
□ EVERY Audience entry includes who + what they need (target: 80+)
□ Citation Policy includes brand naming rules (target: 80+)
□ Zero banned words in the entire output
□ All URLs are full paths (not just /path)

If ANY checkbox fails, revise that section before returning.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
      max_tokens: 6000,
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
