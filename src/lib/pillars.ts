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
 * Suggest 3 pillar-topic candidates driven by GSC data and (when available)
 * the imported product catalog. Queries give us the topical authority signal;
 * products narrow the strategy to things the store actually sells.
 */
export async function suggestPillarsFromGSC(
  domainUrl: string,
  queries: GSCQuery[],
  products: ProductHint[] = [],
): Promise<PillarSuggestion[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  // Focus on striking-distance queries (rank 2-30) ordered by impressions
  const strikingDistance = queries
    .filter((q) => q.impressions > 0 && q.position >= 2 && q.position <= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 40);
  const candidates = strikingDistance.length > 0 ? strikingDistance : queries.slice(0, 40);
  if (candidates.length === 0 && products.length === 0) return [];

  const queryList = candidates
    .map((q) => `- "${q.query}" (pos ${q.position.toFixed(1)}, ${q.impressions} impressions, ${q.clicks} clicks)`)
    .join("\n");

  // Use category counts when available, fall back to a sample of product names.
  const categoryCounts = new Map<string, number>();
  const namesWithoutCategory: string[] = [];
  for (const p of products) {
    if (p.category && p.category.trim()) {
      const key = p.category.trim();
      categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
    } else {
      namesWithoutCategory.push(p.name);
    }
  }
  const productSection = products.length > 0
    ? (categoryCounts.size > 0
      ? Array.from(categoryCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([cat, n]) => `- ${cat} (${n} product${n === 1 ? "" : "s"})`)
          .join("\n")
      : namesWithoutCategory.slice(0, 15).map((n) => `- ${n}`).join("\n"))
    : "";

  const prompt = `You are an SEO content strategist for ${domainUrl}.

${queryList ? `Google Search Console queries this site already ranks for (positions 2-30, the "striking distance" zone):

${queryList}
` : ""}${productSection ? `
Products the store actually sells (from the imported catalog):

${productSection}
` : ""}
TASK: Suggest THREE distinct pillar-topic candidates. Each pillar must:
- Be a broad authoritative topic that can support a hub page plus 6-8 cluster articles
- Group 5-10 of the listed queries (when GSC data is provided)
- Be commercially sensible for this store — i.e. visitors who read the pillar would plausibly buy a product in the catalog
- Be genuinely distinct from the other two suggestions (no overlap)

Return STRICT JSON only (no markdown, no prose):
{
  "suggestions": [
    {
      "pillarTopic": "Specific pillar topic title",
      "rationale": "1-2 sentences. Reference both the ranking queries and the product category when relevant.",
      "supportingQueries": ["query 1", "query 2", "query 3", "query 4", "query 5"]
    }
  ]
}

RULES:
- Return exactly 3 suggestions
- pillarTopic is a broad "ultimate guide"-style title, not a rephrased single query
- supportingQueries must be verbatim strings from the GSC list when provided (5-10 each); if no GSC data, return []
- No overlap between suggestions`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-haiku",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse pillar suggestions from AI response");

  const parsed = JSON.parse(jsonMatch[0]) as { suggestions?: PillarSuggestion[] };
  const suggestions = parsed.suggestions || [];
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
      model: "anthropic/claude-3.5-haiku",
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
