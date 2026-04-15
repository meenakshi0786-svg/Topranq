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

/**
 * Suggest 3 pillar-topic candidates based on GSC queries the site already ranks for.
 * Reasoning: pages ranked 4-30 are the "striking distance" zone — a pillar built around
 * those topics will likely lift existing rankings rather than starting from scratch.
 */
export async function suggestPillarsFromGSC(
  domainUrl: string,
  queries: GSCQuery[],
): Promise<PillarSuggestion[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  // Focus on striking-distance queries (rank 4-30) ordered by impressions
  const strikingDistance = queries
    .filter((q) => q.impressions > 0 && q.position >= 2 && q.position <= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 40);
  const candidates = strikingDistance.length > 0 ? strikingDistance : queries.slice(0, 40);
  if (candidates.length === 0) return [];

  const queryList = candidates
    .map((q) => `- "${q.query}" (pos ${q.position.toFixed(1)}, ${q.impressions} impressions, ${q.clicks} clicks)`)
    .join("\n");

  const prompt = `You are an SEO content strategist for ${domainUrl}.

Below are Google Search Console queries this site already ranks for, focused on the "striking distance" zone (positions 2-30) where pillar content has the highest lift potential:

${queryList}

TASK: Group these queries into THREE distinct pillar-topic candidates. Each pillar should be a broad authoritative topic that naturally encompasses 8-15 of the listed queries. Pick pillars that the site is already showing topical authority for — not generic topics.

Return STRICT JSON only (no markdown, no prose):
{
  "suggestions": [
    {
      "pillarTopic": "Specific pillar topic title",
      "rationale": "1-2 sentences on why this pillar fits — cite actual query patterns from the list",
      "supportingQueries": ["query 1", "query 2", "query 3", "query 4", "query 5"]
    }
  ]
}

RULES:
- Return exactly 3 suggestions
- pillarTopic is a broad "ultimate guide"-style title, not a rephrased single query
- supportingQueries must be verbatim strings from the input list (5-10 each)
- Each pillar must be genuinely distinct; no overlap`;

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
