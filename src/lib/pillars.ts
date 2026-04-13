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
