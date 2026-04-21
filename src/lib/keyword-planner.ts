/**
 * Magic Keyword Planner — Keyword Gap → Content Strategy Plan
 *
 * Pipeline:
 * 1. Load user's GSC data + crawled pages (current coverage)
 * 2. Fetch competitor SERPs via Serper for top keywords
 * 3. Sonnet analyzes gaps, clusters, and priorities
 * 4. Returns structured strategy with pillars, clusters, quick wins
 */

import { db, schema } from "./db";
import { eq } from "drizzle-orm";

export interface KeywordPlan {
  summary: {
    totalMissingKeywords: number;
    totalClusters: number;
    topOpportunity: string;
  };
  pillars: Array<{
    pillarName: string;
    clusters: Array<{
      clusterName: string;
      priorityScore: number;
      intent: string;
      keywords: string[];
      articleTitle: string;
      wordCount: number;
      contentAngle: string;
      internalLinks: {
        pillar: string;
        relatedClusters: string[];
      };
    }>;
  }>;
  quickWins: Array<{
    keyword: string;
    reason: string;
  }>;
}

export async function generateKeywordPlan(domainId: string): Promise<KeywordPlan> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const serperKey = process.env.SERPER_API_KEY;

  // ── Step 1: Understand current coverage ──
  const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
  if (!domain) throw new Error("Domain not found");

  const pages = db.select().from(schema.pages).where(eq(schema.pages.domainId, domainId)).all();
  const gscRows = db.select().from(schema.searchConsoleData).where(eq(schema.searchConsoleData.domainId, domainId)).all();

  // Aggregate GSC keywords
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
  const userKeywords = Array.from(gscMap.values()).sort((a, b) => b.impressions - a.impressions).slice(0, 50);

  // Existing pages as topics
  const existingPages = pages.map((p) => `${p.title || ""} | ${p.url}`).slice(0, 30).join("\n");

  // ── Step 2: Competitor SERP data ──
  let competitorData = "";
  if (serperKey && userKeywords.length > 0) {
    const topKeywords = userKeywords.slice(0, 8);
    const serpResults = await Promise.all(
      topKeywords.map(async (kw) => {
        try {
          const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: kw.query, num: 10 }),
          });
          if (!res.ok) return null;
          const serp = await res.json();
          return {
            keyword: kw.query,
            userPosition: kw.position,
            competitors: (serp.organic || []).slice(0, 5).map((r: { title: string; link: string }) => `${r.title} — ${r.link}`),
            paa: (serp.peopleAlsoAsk || []).map((p: { question: string }) => p.question).slice(0, 4),
            related: (serp.relatedSearches || []).map((r: { query: string }) => r.query).slice(0, 5),
          };
        } catch { return null; }
      }),
    );

    competitorData = serpResults
      .filter(Boolean)
      .map((r) => `Keyword: "${r!.keyword}" (your pos: ${r!.userPosition.toFixed(1)})\nCompetitors: ${r!.competitors.join(" | ")}\nPAA: ${r!.paa.join(" | ")}\nRelated: ${r!.related.join(", ")}`)
      .join("\n\n");
  }

  // Fallback if no GSC: use page titles
  const existingKeywords = userKeywords.length > 0
    ? userKeywords.map((k) => `"${k.query}" (pos ${k.position.toFixed(1)}, ${k.impressions} imp, ${k.clicks} clicks)`).join("\n")
    : pages.map((p) => p.title || "").filter(Boolean).slice(0, 20).join("\n");

  // ── Step 3-9: AI Analysis ──
  const currentYear = new Date().getFullYear();
  const language = domain.language || "English";

  const prompt = `You are an advanced AI SEO strategist. Analyze this domain and generate a Keyword Gap → Content Strategy Plan.

CURRENT YEAR: ${currentYear} — all trend references and article titles MUST use ${currentYear}, never 2024 or 2025.
SITE LANGUAGE: ${language} — all article titles, keywords, and content angles MUST be in ${language}.
DOMAIN: ${domain.domainUrl}

USER'S EXISTING PAGES:
${existingPages || "No pages crawled yet"}

USER'S CURRENT KEYWORDS (from Google Search Console):
${existingKeywords || "No GSC data available"}

${competitorData ? `COMPETITOR SERP DATA:\n${competitorData}` : ""}

EXECUTE THESE STEPS:

STEP 1: Understand what topics the user already covers. Identify strengths and gaps.

STEP 2: From competitor data + PAA + related searches, build a keyword universe.

STEP 3: Classify into missing keywords, weak keywords (pos 10+), and untapped topics.

STEP 4: Group into 3 Pillars with 3 Clusters each. Each cluster = 1 article.

STEP 5: Assign intent — CRITICAL: include a MIX of intents across the 9 clusters:
- At least 4 informational (guides, how-tos, tutorials)
- At least 2 commercial (comparisons, best-of, reviews)
- At least 1 transactional (buying guides, product-focused)
- Navigational only if relevant
An eCommerce site MUST have commercial and transactional clusters, not just informational.

STEP 6: Score each cluster 1-100. Spread realistically: some 60s, some 70s, some 80-90s.

STEP 7: For each cluster generate:
- articleTitle: in ${language}, under 60 chars, include ${currentYear} where relevant
- keywords: 3 keywords in ${language}
- wordCount: 900-1800
- contentAngle: 1 sentence (under 80 chars) explaining what makes it unique

STEP 8: Internal linking — EACH cluster links to ITS OWN pillar (not all to the same pillar):
- Pillar 1 clusters link to Pillar 1 name
- Pillar 2 clusters link to Pillar 2 name
- Pillar 3 clusters link to Pillar 3 name
- Plus 2 related clusters from ANY pillar

STEP 9: Identify exactly 3 quick wins.

Return STRICT JSON only (no markdown, no code fences):
{
  "summary": {
    "totalMissingKeywords": 45,
    "totalClusters": 9,
    "topOpportunity": "1 sentence describing the #1 opportunity"
  },
  "pillars": [
    {
      "pillarName": "Pillar topic in ${language}",
      "clusters": [
        {
          "clusterName": "Subtopic in ${language}",
          "priorityScore": 85,
          "intent": "commercial",
          "keywords": ["kw1", "kw2", "kw3"],
          "articleTitle": "Title in ${language} under 60 chars",
          "wordCount": 1500,
          "contentAngle": "Under 80 chars, what makes this unique",
          "internalLinks": {
            "pillar": "THIS cluster's own pillar name",
            "relatedClusters": ["cluster from another pillar", "another related"]
          }
        }
      ]
    }
  ],
  "quickWins": [
    {"keyword": "keyword in ${language}", "reason": "under 60 chars"}
  ]
}

STRICT RULES:
- EXACTLY 3 pillars × 3 clusters = 9 total
- totalMissingKeywords MUST be a number (integer), never text
- Intent MIX: at least 4 informational + 2 commercial + 1 transactional
- Each cluster links to ITS OWN pillar name, NOT all to the same pillar
- All titles/keywords in ${language}, all years as ${currentYear}
- contentAngle under 80 chars, reason under 60 chars
- KEEP RESPONSE UNDER 4000 TOKENS — be concise`;

  const models = [
    process.env.OPENROUTER_MODEL_SONNET,
    "google/gemini-2.5-flash",
    process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
  ].filter(Boolean) as string[];

  let responseText = "";
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) { console.warn(`[keyword-planner] ${model} failed (${res.status})`); continue; }
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content || "";
      if (responseText.length > 200) break;
    } catch (err) {
      console.warn(`[keyword-planner] ${model} error:`, (err as Error).message);
    }
  }

  if (!responseText) throw new Error("All AI models failed for keyword planning");

  // Parse JSON — the AI sometimes returns huge JSON that gets truncated or malformed.
  // Strategy: strip fences, sanitize, fix trailing commas, truncate to valid JSON if needed.
  let jsonStr = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse keyword plan — no JSON found in response");

  // Sanitize control characters inside JSON string values
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

  let plan: KeywordPlan;
  try {
    plan = JSON.parse(sanitized) as KeywordPlan;
  } catch {
    // JSON is truncated — try to repair by closing open brackets/braces
    console.warn("[keyword-planner] JSON truncated, attempting repair...");
    let repaired = sanitized;
    // Count open vs close brackets
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;

    // Remove trailing incomplete elements (partial strings, dangling commas)
    repaired = repaired.replace(/,\s*"[^"]*$/, "");
    repaired = repaired.replace(/,\s*\{[^}]*$/, "");
    repaired = repaired.replace(/,\s*$/, "");

    // Close missing brackets/braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

    // Fix trailing commas again after repair
    repaired = repaired.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");

    try {
      plan = JSON.parse(repaired) as KeywordPlan;
      console.log("[keyword-planner] JSON repair succeeded");
    } catch (err2) {
      console.error("[keyword-planner] JSON repair also failed:", (err2 as Error).message);
      throw new Error("Keyword plan generation returned incomplete data. Please try again.");
    }
  }

  // Validate minimum structure + ensure numbers are numbers
  if (!plan.summary) plan.summary = { totalMissingKeywords: 0, totalClusters: 0, topOpportunity: "Analysis incomplete" };
  if (typeof plan.summary.totalMissingKeywords !== "number") plan.summary.totalMissingKeywords = 50;
  if (typeof plan.summary.totalClusters !== "number") plan.summary.totalClusters = plan.pillars?.reduce((s, p) => s + (p.clusters?.length || 0), 0) || 9;
  if (!plan.pillars) plan.pillars = [];
  if (!plan.quickWins) plan.quickWins = [];

  return plan;
}
