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
  const prompt = `You are an advanced AI SEO strategist. Analyze this domain and generate a complete Keyword Gap → Content Strategy Plan.

DOMAIN: ${domain.domainUrl}

USER'S EXISTING PAGES:
${existingPages || "No pages crawled yet"}

USER'S CURRENT KEYWORDS (from Google Search Console):
${existingKeywords || "No GSC data available"}

${competitorData ? `COMPETITOR SERP DATA:\n${competitorData}` : ""}

EXECUTE THESE STEPS:

STEP 1: Understand what topics the user already covers. Identify strengths and gaps.

STEP 2: From competitor data + PAA + related searches, build a keyword universe. Remove duplicates.

STEP 3: Classify keywords into:
- Missing Keywords (competitors rank, user does not)
- Weak Keywords (user ranks position 10+)
- Untapped Topics (entire clusters missing)

STEP 4: Group ALL keywords into Pillars (broad) and Clusters (specific subtopics). Each cluster = 1 article.

STEP 5: Assign intent: informational / commercial / transactional / navigational

STEP 6: Score each cluster 1-100 based on: traffic potential, ranking difficulty, relevance, monetization potential.
- High Priority: 80-100
- Medium Priority: 50-79
- Low Priority: below 50

STEP 7: For each cluster generate: article title, target keywords, word count, content angle.

STEP 8: For each cluster suggest: parent pillar link + 2-3 related cluster links with natural anchor text.

STEP 9: Identify 3-5 quick wins (low competition + high relevance).

Return STRICT JSON only (no markdown, no code fences):
{
  "summary": {
    "totalMissingKeywords": 45,
    "totalClusters": 9,
    "topOpportunity": "string describing the #1 opportunity"
  },
  "pillars": [
    {
      "pillarName": "Broad pillar topic",
      "clusters": [
        {
          "clusterName": "Specific subtopic",
          "priorityScore": 85,
          "intent": "informational",
          "keywords": ["keyword 1", "keyword 2", "keyword 3"],
          "articleTitle": "SEO-optimized title under 60 chars",
          "wordCount": 1500,
          "contentAngle": "What makes this article unique vs competitors",
          "internalLinks": {
            "pillar": "suggested anchor text for pillar link",
            "relatedClusters": ["related cluster 1", "related cluster 2"]
          }
        }
      ]
    }
  ],
  "quickWins": [
    {
      "keyword": "low competition keyword",
      "reason": "why this is a quick win"
    }
  ]
}

RULES:
- EXACTLY 3 pillars, each with EXACTLY 3 clusters (9 clusters total — no more)
- Keep the JSON compact — short descriptions, max 3 keywords per cluster
- Every cluster must have a unique article title
- Priority scores must be realistic (not all 90+)
- Quick wins: exactly 3 items
- Do NOT output raw keyword dumps — always cluster and prioritize
- KEEP THE RESPONSE UNDER 4000 TOKENS — be concise`;

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
