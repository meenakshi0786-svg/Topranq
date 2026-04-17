// Pillar & cluster topic strategy helpers

interface ClusterSuggestion {
  clusterTopic: string;
  clusterKeywords: string[];
  reason: string;
}

export interface PillarPlan {
  pillarTopic: string;
  description: string;
  clusters: ClusterSuggestion[];
}

export interface PillarSuggestion {
  pillarTopic: string;
  rationale: string;
  supportingQueries: string[];
  recommendedFormat?: string;
  competitiveAdvantage?: string;
}

interface GSCQuery {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}

interface ProductHint {
  name: string;
  category?: string | null;
}

/**
 * 3-stage pillar strategy pipeline:
 *   Stage 1: Extract top 10 high-priority keywords from GSC data
 *   Stage 2: Sonnet runs competitor research per keyword (top 10 SERP via Serper)
 *   Stage 3: Opus analyzes everything and creates 3 pillar strategies
 */
export async function suggestPillarsFromGSC(
  domainUrl: string,
  queries: GSCQuery[],
  products: ProductHint[] = [],
  siteKeywords: string[] = [],
): Promise<PillarSuggestion[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const modelSonnet = process.env.OPENROUTER_MODEL_SONNET || "anthropic/claude-sonnet-4";
  const modelOpus = process.env.OPENROUTER_MODEL_OPUS || "anthropic/claude-opus-4";

  // ── STAGE 1: Extract top 10 high-priority keywords from GSC ──
  const strikingDistance = queries
    .filter((q) => q.impressions > 0 && q.position >= 2 && q.position <= 30)
    .sort((a, b) => {
      // Priority score: high impressions + low position = best opportunity
      const aScore = a.impressions * (30 - a.position);
      const bScore = b.impressions * (30 - b.position);
      return bScore - aScore;
    })
    .slice(0, 10);

  const top10 = strikingDistance.length > 0 ? strikingDistance : queries.slice(0, 10);
  if (top10.length === 0 && products.length === 0 && siteKeywords.length === 0) return [];

  console.log(`[pillar-pipeline] Stage 1: ${top10.length} high-priority keywords extracted`);

  // ── STAGE 2: Sonnet runs competitor research per keyword ──
  const serperKey = process.env.SERPER_API_KEY;
  const competitorData: Array<{ keyword: string; position: number; impressions: number; competitors: string }> = [];

  if (serperKey && top10.length > 0) {
    const serpResults = await Promise.all(
      top10.map(async (kw) => {
        try {
          const serpRes = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
            body: JSON.stringify({ q: kw.query, num: 10 }),
          });
          if (!serpRes.ok) return null;
          const serp = await serpRes.json();
          const organic = (serp.organic || []).slice(0, 10);
          const paa = (serp.peopleAlsoAsk || []).map((p: { question: string }) => p.question).slice(0, 5);
          return {
            keyword: kw.query,
            position: kw.position,
            impressions: kw.impressions,
            titles: organic.map((r: { title: string }) => r.title),
            urls: organic.map((r: { link: string }) => r.link),
            paa,
          };
        } catch { return null; }
      }),
    );

    // Use Sonnet to analyze competitor patterns across all keywords
    const serpSummary = serpResults
      .filter(Boolean)
      .map((r) => `Keyword: "${r!.keyword}" (pos ${r!.position.toFixed(1)}, ${r!.impressions} imp)\n  Top results: ${r!.titles.slice(0, 5).join(" | ")}\n  PAA: ${r!.paa.join(" | ")}`)
      .join("\n\n");

    if (serpSummary) {
      console.log(`[pillar-pipeline] Stage 2: Sonnet analyzing ${serpResults.filter(Boolean).length} keyword SERPs`);

      const sonnetPrompt = `You are an SEO competitor analyst. Analyze the following SERP data for ${domainUrl}.

For each keyword, I've pulled the top 10 Google results and People Also Ask questions.

${serpSummary}

TASK: For each keyword, identify:
1. What content format dominates (guides, listicles, comparisons, how-tos)?
2. What topics do the top results cover that ${domainUrl} could compete on?
3. What gaps exist — topics the top results miss?
4. Which keywords cluster together thematically?

Return STRICT JSON:
{
  "keywordAnalysis": [
    {
      "keyword": "the keyword",
      "dominantFormat": "guide | listicle | comparison | how-to | review",
      "topTopics": ["topic 1", "topic 2"],
      "gaps": ["gap 1", "gap 2"],
      "clustersWith": ["other keyword that groups with this one"]
    }
  ],
  "thematicClusters": [
    {
      "theme": "cluster theme name",
      "keywords": ["kw1", "kw2", "kw3"],
      "opportunity": "1-sentence description of the opportunity"
    }
  ]
}`;

      try {
        const sonnetRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelSonnet, max_tokens: 3000, messages: [{ role: "user", content: sonnetPrompt }] }),
        });
        if (sonnetRes.ok) {
          const sonnetData = await sonnetRes.json();
          const sonnetText = sonnetData.choices?.[0]?.message?.content || "";
          competitorData.push({
            keyword: "COMPETITOR_ANALYSIS",
            position: 0,
            impressions: 0,
            competitors: sonnetText,
          });
        }
      } catch (err) {
        console.warn("[pillar-pipeline] Stage 2 Sonnet failed:", err);
      }
    }
  }

  console.log(`[pillar-pipeline] Stage 3: Opus creating pillar strategies`);

  // ── STAGE 3: Opus analyzes everything and creates 3 pillar strategies ──
  const keywordList = top10
    .map((q) => `- "${q.query}" (pos ${q.position.toFixed(1)}, ${q.impressions} impressions, ${q.clicks} clicks)`)
    .join("\n");

  const competitorAnalysis = competitorData.length > 0
    ? `\n\nCOMPETITOR RESEARCH (analyzed by AI from live Google SERPs):\n${competitorData.map((c) => c.competitors).join("\n")}`
    : "";

  const productSection = products.length > 0
    ? `\n\nPRODUCT CATALOG:\n${products.slice(0, 15).map((p) => `- ${p.name}${p.category ? ` [${p.category}]` : ""}`).join("\n")}`
    : "";

  const siteSection = siteKeywords.length > 0
    ? `\n\nSITE TOPICS (from crawled pages):\n${siteKeywords.slice(0, 15).map((k) => `- ${k}`).join("\n")}`
    : "";

  const opusPrompt = `You are a senior SEO strategist performing deep analysis for ${domainUrl}.

You have three data sources:

1. TOP 10 HIGH-PRIORITY KEYWORDS from Google Search Console (real ranking data):
${keywordList}
${competitorAnalysis}
${productSection}
${siteSection}

TASK: Create exactly 3 pillar content strategies. Each pillar must:
- Be built around a cluster of the top 10 keywords (group related keywords together)
- Account for the competitor landscape (what's ranking, what gaps exist)
- Be commercially relevant to the product catalog (if provided)
- Include a specific content format recommendation (ultimate guide, comparison, how-to series)
- Be distinct from the other two strategies

Return STRICT JSON only:
{
  "suggestions": [
    {
      "pillarTopic": "Specific pillar topic title (not generic)",
      "rationale": "2-3 sentences explaining WHY this pillar — reference specific keywords, competitor gaps, and product alignment",
      "supportingQueries": ["keyword 1", "keyword 2", "keyword 3"],
      "recommendedFormat": "ultimate guide | comparison series | how-to collection | buying guide",
      "competitiveAdvantage": "1 sentence on what makes this pillar winnable vs. current SERP results"
    }
  ]
}

ANALYSIS RULES:
- Each pillar groups 3-5 of the top 10 keywords — no keyword should appear in two pillars
- Rationale must cite specific data: keyword positions, impression counts, competitor weaknesses
- pillarTopic is specific enough to be a real article title, not a vague category
- competitiveAdvantage must reference actual competitor gaps from the SERP analysis
- If products are provided, at least 2 of 3 pillars should be commercially aligned`;

  // Try Opus → Sonnet → Haiku fallback for Stage 3
  const stage3Models = [modelOpus, modelSonnet, process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku"];
  let opusText = "";
  for (const model of stage3Models) {
    try {
      const opusRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: "user", content: opusPrompt }] }),
      });
      if (!opusRes.ok) {
        console.warn(`[pillar-pipeline] Stage 3 ${model} failed (${opusRes.status}), trying next...`);
        continue;
      }
      const data = await opusRes.json();
      opusText = data.choices?.[0]?.message?.content || "";
      if (opusText.length > 100) {
        console.log(`[pillar-pipeline] Stage 3 succeeded with ${model}`);
        break;
      }
    } catch (err) {
      console.warn(`[pillar-pipeline] Stage 3 ${model} error:`, (err as Error).message);
      continue;
    }
  }
  if (!opusText) throw new Error("All models failed for Stage 3 strategy generation");
  const jsonMatch = opusText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse pillar strategies from Opus");

  const parsed = JSON.parse(jsonMatch[0]) as { suggestions?: PillarSuggestion[] };
  const suggestions = parsed.suggestions || [];
  console.log(`[pillar-pipeline] Done: ${suggestions.length} strategies generated`);
  return suggestions.filter((s) => s.pillarTopic && Array.isArray(s.supportingQueries)).slice(0, 3);
}

export async function generatePillarPlan(
  seedTopic: string,
  domainUrl: string,
  siteKeywords: string[] = []
): Promise<PillarPlan> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const prompt = `You are an SEO content strategist. Design a pillar-cluster content strategy.

WEBSITE: ${domainUrl}
PILLAR SEED TOPIC: ${seedTopic}
${siteKeywords.length > 0 ? `SITE KEYWORDS: ${siteKeywords.slice(0, 10).join(", ")}` : ""}

TASK:
Design ONE comprehensive pillar topic and 6-8 supporting cluster subtopics. The pillar should be a broad, authoritative hub on the topic. Clusters should be focused subtopics that link back to the pillar.

Return STRICT JSON only (no markdown, no prose):
{
  "pillarTopic": "The complete, specific pillar page title",
  "description": "1-2 sentence description of what the pillar covers",
  "clusters": [
    {
      "clusterTopic": "specific subtopic title",
      "clusterKeywords": ["primary keyword", "secondary keyword", "long-tail keyword"],
      "reason": "why this subtopic supports the pillar"
    }
  ]
}

RULES:
- Pillar is a broad "ultimate guide" topic
- Each cluster is a focused subtopic (not a rewording of the pillar)
- Clusters should cover different user intents: how-to, comparison, listicle, FAQ, definition
- Output MUST be valid JSON, no other text`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse pillar plan from AI response");

  const plan = JSON.parse(jsonMatch[0]) as PillarPlan;
  if (!plan.pillarTopic || !Array.isArray(plan.clusters)) {
    throw new Error("Invalid pillar plan structure");
  }
  return plan;
}
