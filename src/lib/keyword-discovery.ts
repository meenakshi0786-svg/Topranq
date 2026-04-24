/**
 * Keyword Discovery Engine — find low-hanging keyword opportunities
 *
 * Pipeline:
 * 1. Load site context (GSC data, crawled pages, products)
 * 2. Identify seed keywords from GSC + page titles
 * 3. Fetch competitor SERPs via Serper (PAA, related, organic results)
 * 4. AI analyzes SERP weakness, relevancy, and gaps
 * 5. Returns flat list of 15-25 keyword opportunities with pills data
 */

import { db, schema } from "./db";
import { eq } from "drizzle-orm";

export interface DiscoveredKeyword {
  keyword: string;
  difficulty: "Low" | "Medium" | "High";
  intent: "informational" | "commercial" | "transactional" | "navigational";
  relevancyScore: number; // 0-100
  source: "competitor_gap" | "paa" | "related" | "gsc_weak" | "gsc_opportunity";
  sourceDetail?: string;
  competitorUrl?: string;
}

export interface SuggestedPillarGrouping {
  topic: string;
  description: string;
  clusters: Array<{
    clusterTopic: string;
    clusterKeywords: string[];
    reason: string;
  }>;
}

// ── Shared JSON repair utility ──
function repairAndParseJSON(text: string): unknown {
  let jsonStr = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = jsonStr.match(/[\[{][\s\S]*[\]}]/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  // Sanitize control characters inside JSON strings
  let sanitized = jsonMatch[0].replace(
    /"(?:[^"\\]|\\.)*"/g,
    (match: string) => match
      .replace(/(?<!\\)\n/g, "\\n")
      .replace(/(?<!\\)\r/g, "\\r")
      .replace(/(?<!\\)\t/g, "\\t")
      .replace(/[\x00-\x1f]/g, (c: string) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`),
  );

  // Fix trailing commas
  sanitized = sanitized.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");

  try {
    return JSON.parse(sanitized);
  } catch {
    // Try to repair truncated JSON
    let repaired = sanitized;
    repaired = repaired.replace(/,\s*"[^"]*$/, "");
    repaired = repaired.replace(/,\s*\{[^}]*$/, "");
    repaired = repaired.replace(/,\s*$/, "");

    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;

    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

    repaired = repaired.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
    return JSON.parse(repaired);
  }
}

// ── AI call with model fallback ──
async function callAI(prompt: string, maxTokens = 4000): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const models = [
    process.env.OPENROUTER_MODEL_SONNET,
    "google/gemini-2.5-flash",
    process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
  ].filter(Boolean) as string[];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) { console.warn(`[keyword-discovery] ${model} failed (${res.status})`); continue; }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content.length > 100) return content;
    } catch (err) {
      console.warn(`[keyword-discovery] ${model} error:`, (err as Error).message);
    }
  }
  throw new Error("All AI models failed");
}

// ── Fetch SERP data from Serper.dev ──
async function fetchSERP(query: string, serperKey: string) {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!res.ok) return null;
    const serp = await res.json();
    return {
      keyword: query,
      organic: (serp.organic || []).slice(0, 10).map((r: { title: string; link: string; snippet?: string; position?: number }) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet || "",
        position: r.position || 0,
      })),
      paa: (serp.peopleAlsoAsk || []).map((p: { question: string }) => p.question).slice(0, 5),
      related: (serp.relatedSearches || []).map((r: { query: string }) => r.query).slice(0, 8),
    };
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════
// Main: Discover Keywords
// ══════════════════════════════════════════════════════════════════════

export async function discoverKeywords(domainId: string): Promise<DiscoveredKeyword[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) throw new Error("SERPER_API_KEY is not set");

  // ── Load domain context ──
  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
  if (!domain) throw new Error("Domain not found");

  const pages = db.select().from(schema.pages).where(eq(schema.pages.domainId, domainId)).all();
  const gscRows = db.select().from(schema.searchConsoleData).where(eq(schema.searchConsoleData.domainId, domainId)).all();

  let products: { name: string; category: string | null }[] = [];
  try {
    products = db.select().from(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).all();
  } catch { /* no products */ }

  // ── Aggregate GSC keywords ──
  const gscMap = new Map<string, { query: string; impressions: number; clicks: number; position: number }>();
  for (const r of gscRows) {
    if (!r.query) continue;
    const prev = gscMap.get(r.query);
    if (prev) {
      prev.impressions += r.impressions || 0;
      prev.clicks += r.clicks || 0;
    } else {
      gscMap.set(r.query, { query: r.query, impressions: r.impressions || 0, clicks: r.clicks || 0, position: r.avgPosition || 0 });
    }
  }
  const allGscKeywords = Array.from(gscMap.values()).sort((a, b) => b.impressions - a.impressions);

  // ── Identify seed keywords ──
  // Top GSC keywords by impressions for SERP analysis
  const topGscKeywords = allGscKeywords.slice(0, 10);
  // Weak GSC keywords: high impressions but position 8-30 (low-hanging fruit)
  const weakGscKeywords = allGscKeywords
    .filter(k => k.position >= 8 && k.position <= 30 && k.impressions > 50)
    .slice(0, 10);

  // Fallback: extract topics from page titles if no GSC
  const seedKeywords = topGscKeywords.length > 0
    ? topGscKeywords.map(k => k.query)
    : pages.map(p => p.title || "").filter(Boolean).slice(0, 8);

  if (seedKeywords.length === 0) {
    // Last resort: use domain name as seed
    try {
      const hostname = new URL(domain.domainUrl).hostname.replace("www.", "").replace(/\.[^.]+$/, "");
      seedKeywords.push(hostname);
    } catch { /* ignore */ }
  }

  // ── Fetch SERP data for seeds ──
  console.log(`[keyword-discovery] Fetching SERPs for ${seedKeywords.length} seed keywords...`);
  const serpResults = (await Promise.all(
    seedKeywords.slice(0, 8).map(q => fetchSERP(q, serperKey))
  )).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof fetchSERP>>>[];

  // ── Build context for AI ──
  const language = domain.language || "English";
  const currentYear = new Date().getFullYear();

  const existingCoverage = pages.map(p => p.title || p.url).filter(Boolean).slice(0, 25).join("\n");

  const gscContext = allGscKeywords.length > 0
    ? allGscKeywords.slice(0, 30).map(k =>
      `"${k.query}" — pos ${k.position.toFixed(1)}, ${k.impressions} imp, ${k.clicks} clicks`
    ).join("\n")
    : "No GSC data available";

  const weakContext = weakGscKeywords.length > 0
    ? weakGscKeywords.map(k =>
      `"${k.query}" — pos ${k.position.toFixed(1)}, ${k.impressions} impressions (LOW-HANGING: improve to page 1)`
    ).join("\n")
    : "";

  const serpContext = serpResults.map(s => {
    const competitorSummary = s.organic.slice(0, 5).map((o: { title: string; link: string }, i: number) =>
      `  ${i + 1}. ${o.title} — ${o.link}`
    ).join("\n");
    return `SERP for "${s.keyword}":
Competitors:
${competitorSummary}
PAA: ${s.paa.join(" | ")}
Related: ${s.related.join(", ")}`;
  }).join("\n\n");

  const productContext = products.length > 0
    ? `PRODUCT CATEGORIES: ${[...new Set(products.map(p => p.category).filter(Boolean))].join(", ")}
SAMPLE PRODUCTS: ${products.slice(0, 10).map(p => p.name).join(", ")}`
    : "";

  // ── AI Analysis ──
  const prompt = `You are an expert SEO keyword researcher. Analyze this website and find 20 LOW-HANGING keyword opportunities.

DOMAIN: ${domain.domainUrl}
LANGUAGE: ${language}
YEAR: ${currentYear}

═══ SITE'S CURRENT COVERAGE ═══
${existingCoverage || "No pages crawled yet"}

═══ CURRENT GSC KEYWORDS ═══
${gscContext}

${weakContext ? `═══ WEAK KEYWORDS (Position 8-30, high impressions — EASY WINS) ═══\n${weakContext}` : ""}

═══ COMPETITOR SERP DATA ═══
${serpContext || "No SERP data available"}

${productContext ? `═══ PRODUCT CONTEXT ═══\n${productContext}` : ""}

═══ YOUR TASK ═══

Find exactly 20 keyword opportunities. For EACH keyword, analyze:

1. **DIFFICULTY** — Look at who ranks on page 1:
   - "Low": Page 1 has forums, thin blog posts, outdated content (2+ years old), no major brands, low word count pages, missing schema/images
   - "Medium": Mix of strong and weak results, some authority sites but gaps exist
   - "High": Page 1 dominated by Amazon, Wikipedia, Forbes, govt sites, major brands with comprehensive content

2. **INTENT** — What the searcher wants:
   - "informational": how-to, what-is, guide, tutorial, tips
   - "commercial": best, review, comparison, vs, top 10
   - "transactional": buy, price, discount, order, near me
   - "navigational": brand name, specific product

3. **RELEVANCY** — How relevant is this keyword to the website (0-100):
   - 90-100: Directly matches what the site sells/covers
   - 70-89: Related to the site's niche
   - 50-69: Loosely related
   - Below 50: Don't include it

4. **SOURCE** — Where this opportunity comes from:
   - "competitor_gap": Competitors rank for this, the site doesn't
   - "paa": From People Also Ask questions
   - "related": From Google's related searches
   - "gsc_weak": Site ranks position 8-30 (push to page 1)
   - "gsc_opportunity": GSC shows high impressions but low clicks (CTR opportunity)

═══ KEYWORD SELECTION CRITERIA ═══

PRIORITIZE:
- Keywords where SERP page 1 has WEAK results (thin content, old articles, forums)
- Long-tail keywords (3-5 words) over short head terms
- Keywords with clear commercial or informational intent
- Keywords that match the site's products/services
- ${language} keywords only

EXCLUDE:
- Brand name keywords (competitor brand names)
- Keywords the site already ranks #1-5 for
- Keywords with relevancy below 70
- Single-word generic terms

═══ OUTPUT FORMAT ═══

Return STRICT JSON array only (no markdown, no fences, no prose):
[
  {
    "keyword": "keyword phrase in ${language}",
    "difficulty": "Low",
    "intent": "informational",
    "relevancyScore": 92,
    "source": "competitor_gap",
    "sourceDetail": "competitor example.com ranks #3",
    "competitorUrl": "https://example.com/page"
  }
]

RULES:
- Exactly 20 keywords
- All keywords in ${language}
- relevancyScore must be 70-100 (no irrelevant keywords)
- Mix of difficulties: at least 8 Low, 6-8 Medium, 2-4 High
- Mix of intents: at least 8 informational, 4 commercial, 2 transactional
- Mix of sources: include at least 3 competitor_gap, 3 paa, 3 related
- Sort by relevancyScore descending (most relevant first)
- sourceDetail must be specific (which competitor, which question)`;

  console.log(`[keyword-discovery] Calling AI for keyword analysis...`);
  const response = await callAI(prompt, 6000);

  const parsed = repairAndParseJSON(response) as DiscoveredKeyword[];

  // Validate and clean
  const validated = (Array.isArray(parsed) ? parsed : []).filter(k => {
    if (!k.keyword || typeof k.keyword !== "string") return false;
    if (!["Low", "Medium", "High"].includes(k.difficulty)) k.difficulty = "Medium";
    if (!["informational", "commercial", "transactional", "navigational"].includes(k.intent)) k.intent = "informational";
    if (typeof k.relevancyScore !== "number") k.relevancyScore = 75;
    k.relevancyScore = Math.max(0, Math.min(100, Math.round(k.relevancyScore)));
    if (!["competitor_gap", "paa", "related", "gsc_weak", "gsc_opportunity"].includes(k.source)) k.source = "related";
    return true;
  });

  // Sort by relevancy descending
  validated.sort((a, b) => b.relevancyScore - a.relevancyScore);

  console.log(`[keyword-discovery] Found ${validated.length} keywords`);
  return validated;
}

// ══════════════════════════════════════════════════════════════════════
// Group selected keywords into pillar/cluster structure
// ══════════════════════════════════════════════════════════════════════

export async function groupKeywordsIntoPillars(
  domainUrl: string,
  keywords: DiscoveredKeyword[],
  language: string
): Promise<SuggestedPillarGrouping[]> {
  const keywordList = keywords.map(k =>
    `"${k.keyword}" (${k.difficulty} difficulty, ${k.intent}, relevancy ${k.relevancyScore})`
  ).join("\n");

  const prompt = `You are an SEO content strategist. Group these selected keywords into a pillar-cluster content structure.

DOMAIN: ${domainUrl}
LANGUAGE: ${language}

SELECTED KEYWORDS:
${keywordList}

═══ TASK ═══

Group these ${keywords.length} keywords into 2-4 PILLARS. Each pillar should have 2-5 CLUSTERS.

Rules:
- Each pillar = a broad topic that covers multiple related keywords
- Each cluster = one article targeting 1-3 specific keywords
- Every selected keyword must appear in exactly ONE cluster
- Pillar topics should be broad enough to be comprehensive guides
- Cluster topics should be specific enough to be standalone articles
- All topics in ${language}

═══ OUTPUT FORMAT ═══

Return STRICT JSON array only:
[
  {
    "topic": "Broad pillar topic in ${language}",
    "description": "1-2 sentence description of what this pillar covers",
    "clusters": [
      {
        "clusterTopic": "Specific article topic in ${language}",
        "clusterKeywords": ["keyword1", "keyword2"],
        "reason": "Why these keywords belong together"
      }
    ]
  }
]

STRICT RULES:
- 2-4 pillars total
- 2-5 clusters per pillar
- Every keyword appears in exactly one cluster
- All text in ${language}`;

  const response = await callAI(prompt, 4000);
  const parsed = repairAndParseJSON(response) as SuggestedPillarGrouping[];

  if (!Array.isArray(parsed)) throw new Error("Invalid grouping response");

  return parsed;
}
