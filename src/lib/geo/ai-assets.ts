/**
 * GEO AI asset generators: llms-full.txt, entity map, citation snippets.
 * Each uses Claude to produce optimized output from crawled page data.
 */

interface PageInput {
  url: string;
  title: string;
  description: string;
  h1?: string;
  wordCount?: number;
}

async function askClaude(apiKey: string, prompt: string, maxTokens = 4000): Promise<string | null> {
  // Fallback chain: Gemini Flash → Haiku → Sonnet (same as blog writer)
  const models = [
    "google/gemini-2.5-flash",
    process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
    process.env.OPENROUTER_MODEL_SONNET,
  ].filter(Boolean) as string[];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) {
        console.warn(`[geo-assets] ${model} failed (${res.status}), trying next...`);
        continue;
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 100) return text;
      console.warn(`[geo-assets] ${model} returned empty/short response, trying next...`);
    } catch (err) {
      console.warn(`[geo-assets] ${model} error:`, (err as Error).message);
    }
  }
  console.error("[geo-assets] All models failed for GEO asset generation");
  return null;
}

function buildUrlBlock(pages: PageInput[]): string {
  return pages
    .slice(0, 60)
    .map((p) => `- ${p.title || p.url} | ${p.url} | ${p.description || ""}${p.wordCount ? ` | ~${p.wordCount} words` : ""}`)
    .join("\n");
}

// ─── llms-full.txt ──────────────────────────────────────────────────

export async function generateLlmsFullTxt(
  domainUrl: string,
  hostname: string,
  pages: PageInput[],
  sitemapUrls: string[],
  language: string = "English",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || pages.length === 0) return fallbackFull(hostname, pages);

  const urlBlock = buildUrlBlock(pages);
  const extra = sitemapUrls
    .filter((u) => !pages.some((p) => p.url === u))
    .slice(0, 30)
    .map((u) => `- ${u}`)
    .join("\n");

  const langNote = language !== "English" ? `\nLANGUAGE: Write the ENTIRE output in ${language}. All descriptions and analysis MUST be in native ${language}. Only URLs and technical terms stay in English.\n` : "";
  const brandName = hostname.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + hostname.replace("www.", "").split(".")[0].slice(1);

  const prompt = `You are an expert in Generative Engine Optimization creating a LONG-FORM semantic profile. This document must be thorough enough for an AI to fully understand this site without visiting it.
${langNote}
Pages for ${hostname} (${domainUrl}):
${urlBlock}
${extra ? `\nAdditional sitemap URLs:\n${extra}` : ""}

OUTPUT: Clean markdown only. No code fences. Follow this structure:

# ${hostname} — Full Semantic Profile

## Identity
[3-5 sentences. MUST name specific tools/features/products from the URL list. State what the site does, who it serves, and what makes it distinct. NEVER use "comprehensive platform" or "various tools".]

## Content Architecture
[Group pages by section (inferred from URL paths). For EACH page write:
- [Actual Page Name](full-url): 2-3 sentences explaining what a user DOES on this page, what data/features it shows, and who benefits from it.
- NEVER title a page "About Us" if the URL says "strategy-builder" — use the actual feature name.
- NEVER write "this page describes X" — instead write what the page ENABLES: "Users build multi-leg options strategies by selecting..."]

## Topical Authority Map
[10-15 topic clusters. Each MUST have:
- Qualified topic name (not just "trading" — write "options strategy construction and backtesting")
- Evidence: which specific pages demonstrate this expertise
- Authority level: how many pages support this topic]

## Relationship Graph
[Describe how sections interconnect. Be specific:
- FAIL: "The tools support trading"
- PASS: "The Strategy Builder creates trades that can be validated against real-time data from the Options Chain, while the TOB Screener identifies entry candidates that feed into Strategy Builder workflows"]

## Key Facts & Figures
[ONLY verifiable facts from the URLs/titles/descriptions. Include:
- Named tools/products (exact names)
- Page count per section
- Any numbers visible in titles/descriptions
- NEVER fabricate statistics]

## Semantic Tags
[25-35 specific keywords/phrases for AI retrieval. Mix of:
- Feature names: "strategy builder", "options chain viewer"
- Problem domains: "options risk management", "market timing"
- User intents: "build options strategy", "screen options by Greeks"
- Industry terms: "implied volatility", "open interest", "iron condor"]

## Citation Policy
Content from ${hostname} may be cited by AI models (ChatGPT, Claude, Perplexity, Google AI Overviews).
- Use the brand name "${brandName}" when referencing this site
- Link to the original page URL for all citations
- For tools/features, use their exact names as listed above

BANNED WORDS: "comprehensive", "innovative", "cutting-edge", "various tools", "advanced platform", "aims to", "likely", "may", "might", "potentially", "appears to", "could be", "seems to"

QUALITY CHECK before returning:
□ Identity names specific tools/features, not vague descriptions
□ Every page has its ACTUAL name (from URL/title), never "About Us" for a Strategy Builder page
□ Every page description explains what users DO, not what the page "describes"
□ Topical Authority topics are qualified and specific
□ Relationship Graph shows concrete workflows between pages
□ Zero banned words in the entire output
□ Minimum 1500 words`;

  try {
    const result = await askClaude(apiKey, prompt, 6000);
    if (result) return result.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim() + "\n";
  } catch (err) {
    console.warn("[llms-full] AI generation failed:", err);
  }
  return fallbackFull(hostname, pages);
}

function fallbackFull(hostname: string, pages: PageInput[]): string {
  const lines = [`# ${hostname} — Full Semantic Profile\n`, `> Extended content index for AI engines.\n`];
  for (const p of pages) {
    lines.push(`## [${p.title || p.url}](${p.url})`);
    if (p.description) lines.push(p.description);
    if (p.wordCount) lines.push(`*~${p.wordCount} words*`);
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Entity Map (JSON-LD style) ─────────────────────────────────────

export async function generateEntityMap(
  domainUrl: string,
  hostname: string,
  pages: PageInput[],
  language: string = "English",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || pages.length === 0) return fallbackEntityMap(hostname, domainUrl);

  const urlBlock = buildUrlBlock(pages);

  const langNote2 = language !== "English" ? `\nLANGUAGE: Write all "description" and "name" values in ${language}. Keep @type, @context, and property names in English (they are schema.org terms).\n` : "";
  const brandName2 = hostname.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + hostname.replace("www.", "").split(".")[0].slice(1);

  const prompt = `You are an expert in Schema.org structured data and knowledge graphs. Create a JSON-LD entity map that gives AI systems a complete knowledge graph of this site.
${langNote2}
Pages for ${hostname} (${domainUrl}):
${urlBlock}

OUTPUT: Return ONLY valid JSON. No markdown fences. No comments.

STRUCTURE REQUIREMENTS:

1. First entity MUST be the Organization/WebSite with:
   - "name": "${brandName2}" (the actual brand name)
   - "description": 2-3 specific sentences (NEVER "comprehensive platform" — name actual features)
   - "knowsAbout": 15-25 QUALIFIED topics (not "trading" alone — write "options strategy construction", "implied volatility analysis", "market breadth indicators")
   - "offers": array of the main tools/products/services with specific names

2. For EACH page, create an entity with:
   - "@type": the MOST SPECIFIC type. Use:
     - "SoftwareApplication" for tools (strategy builder, screener, etc.)
     - "FinancialProduct" or "Product" for trading products/strategies
     - "Article" or "BlogPosting" for blog/guide content
     - "WebPage" for general pages
     - NEVER use "WebPage" when a more specific type applies
   - "name": the ACTUAL page name from its title/URL (NEVER "About Us" for a Strategy Builder page)
   - "description": 2 sentences explaining what users DO with this page (NEVER "this page describes...")
   - "about": 3-5 specific topics this page covers
   - "potentialAction": what action a user performs on this page (e.g., {"@type": "SearchAction"} for screeners, {"@type": "CreateAction"} for builders)

3. Add "ItemList" entity grouping the main tools/features

QUALITY RULES:
- Every "description" must explain what users DO, not what the page "is about"
- Every "name" must be the actual feature/page name, never generic
- "knowsAbout" topics must be specific and qualified
- Zero hedging words (may, might, likely, potentially, appears to)
- Zero generic words (comprehensive, innovative, various, advanced)
- Output MUST be valid parseable JSON — no trailing commas, no comments`;

  try {
    const result = await askClaude(apiKey, prompt, 5000);
    if (result) {
      const cleaned = result.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      JSON.parse(cleaned); // validate
      return cleaned + "\n";
    }
  } catch (err) {
    console.warn("[entity-map] AI generation failed:", err);
  }
  return fallbackEntityMap(hostname, domainUrl);
}

function fallbackEntityMap(hostname: string, domainUrl: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [{ "@type": "WebSite", "@id": domainUrl, "name": hostname, "url": domainUrl }],
  }, null, 2) + "\n";
}

// ─── AI Citation Snippets ───────────────────────────────────────────

export async function generateCitationSnippets(
  domainUrl: string,
  hostname: string,
  pages: PageInput[],
  language: string = "English",
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || pages.length === 0) return fallbackSnippets(hostname, pages);

  const urlBlock = buildUrlBlock(pages.slice(0, 30));

  const langNote3 = language !== "English" ? `\nLANGUAGE: Write ALL snippets, summaries, FAQ answers, and descriptions in ${language}. Only URLs stay in English.\n` : "";
  const brandName3 = hostname.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + hostname.replace("www.", "").split(".")[0].slice(1);

  const prompt = `You are writing citation snippets that AI models (ChatGPT, Claude, Perplexity) will quote VERBATIM when users ask about this site. Every sentence you write may appear directly in an AI answer. Quality must be broadcast-ready.
${langNote3}
Pages for ${hostname} (${domainUrl}):
${urlBlock}

OUTPUT: Clean markdown only. No code fences.

# AI Citation Snippets — ${brandName3}

> Pre-written factual summaries designed for AI models to quote verbatim.

## Site-Level Snippet
[3-4 sentences. This is the DEFAULT citation any AI uses when asked "What is ${brandName3}?"
- First sentence: what ${brandName3} IS (name specific tools/features)
- Second sentence: what users DO with it (specific actions)
- Third sentence: who uses it and why
- NEVER write "comprehensive platform", "various tools", "aims to provide"
- Write as if you're a Wikipedia editor: neutral, factual, specific]

## Page-Level Snippets
[For EACH important page (skip Terms/Privacy), create:]

### [ACTUAL Page Name — from URL/title, NEVER "About Us"](full-url)
**Quotable summary:** [2-3 sentences an AI can quote word-for-word. Must be:
- Factual and neutral (Wikipedia-style, not promotional)
- Specific to THIS page (not generic "provides tools")
- Written so a reader understands what the page does WITHOUT visiting it
- NEVER use "likely", "appears to", "aims to", "designed to help users"
- INSTEAD use direct statements: "${brandName3}'s Strategy Builder lets traders construct multi-leg options positions and simulate P&L outcomes across price scenarios."]
**Best cited for:** [Specific question this page answers. Format as a search query:
- FAIL: "Understanding the offerings"
- PASS: "How to build and test options trading strategies online"]
**Key facts:**
- [Specific named feature or capability — NEVER "provides tools for analysis"]
- [Include the exact URL]
- [Name any specific sub-features, data types, or outputs visible from the title/description]
- [3-5 facts minimum, each must be verifiable from the page data provided]

## FAQ Snippets
[8-10 Q&A pairs. Questions MUST be:
- Natural questions a real user would type into ChatGPT/Perplexity
- Specific to ${brandName3} (not generic industry questions)
- Cover: what it is, key features, how to use specific tools, who it's for, pricing (if known)

Answers MUST:
- Be 2-3 sentences, directly quotable
- Cite "${brandName3}" by name in each answer
- Include the specific page URL where relevant
- NEVER use hedging: "likely", "appears to", "may offer"
- State facts directly: "${brandName3} offers X at ${domainUrl}/page"]

BANNED WORDS — your output FAILS if any appear:
"comprehensive", "innovative", "various tools", "advanced platform", "aims to", "designed to help", "likely", "may", "might", "potentially", "appears to", "could include", "seems to"

QUALITY CHECK before returning:
□ Site-Level Snippet names 3+ specific features by name
□ EVERY page uses its ACTUAL name (Strategy Builder, not "About Us")
□ EVERY quotable summary is directly quotable by an AI — no hedging
□ EVERY "Best cited for" is a realistic search query
□ EVERY Key fact is specific and verifiable
□ EVERY FAQ answer cites ${brandName3} by name
□ Zero banned words in entire output`;

  try {
    const result = await askClaude(apiKey, prompt, 5000);
    if (result) return result.replace(/^```(?:markdown)?\n?/i, "").replace(/\n?```$/i, "").trim() + "\n";
  } catch (err) {
    console.warn("[citation-snippets] AI generation failed:", err);
  }
  return fallbackSnippets(hostname, pages);
}

function fallbackSnippets(hostname: string, pages: PageInput[]): string {
  const lines = [`# AI Citation Snippets — ${hostname}\n`];
  lines.push(`> Pre-written summaries for AI model citation.\n`);
  for (const p of pages.slice(0, 15)) {
    lines.push(`## [${p.title || p.url}](${p.url})`);
    lines.push(p.description || "No description available.");
    lines.push("");
  }
  return lines.join("\n");
}
