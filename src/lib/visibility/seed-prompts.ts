// Auto-seed a starter set of visibility prompts for a domain.
// Prompts are the natural buyer questions a shopper would ask an AI assistant,
// where this brand could plausibly be recommended. The user can edit them after.

import { db, schema } from "../db";
import { eq, desc } from "drizzle-orm";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const DEFAULT_PROMPT_COUNT = 10;

/**
 * Gather lightweight niche signal for the domain: its URL plus the strongest
 * discovered keywords (if any keyword research has been run).
 */
function gatherSignal(domainId: string, domainUrl: string): { domainUrl: string; keywords: string[] } {
  const kws = db
    .select({ keyword: schema.discoveredKeywords.keyword })
    .from(schema.discoveredKeywords)
    .where(eq(schema.discoveredKeywords.domainId, domainId))
    .orderBy(desc(schema.discoveredKeywords.relevancyScore))
    .limit(25)
    .all();
  const keywords = [...new Set(kws.map((k) => k.keyword))].slice(0, 15);
  return { domainUrl, keywords };
}

/**
 * Generate ~N buyer questions via a cheap model (no web search needed here).
 * Falls back to a generic set if the model is unavailable.
 */
export async function generateSeedPrompts(
  domainId: string,
  domainUrl: string,
  count = DEFAULT_PROMPT_COUNT,
): Promise<string[]> {
  const { keywords } = gatherSignal(domainId, domainUrl);
  const apiKey = process.env.OPENROUTER_API_KEY;

  const signalLine = keywords.length
    ? `The site ranks for / targets these topics: ${keywords.join(", ")}.`
    : `Infer the niche from the domain name.`;

  const prompt = `You are helping track a brand's visibility in AI assistants like ChatGPT and Perplexity.
Brand website: ${domainUrl}
${signalLine}

Write ${count} natural questions a real shopper or researcher would type into an AI assistant, where this brand could plausibly be recommended as an answer. Use buyer-intent phrasing ("best ... for ...", "what is a good ... to ...", "recommend a ..."). Do NOT mention the brand name in the questions. Return ONLY a JSON array of ${count} strings, nothing else.`;

  if (apiKey) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL_SONNET || "google/gemini-2.5-flash",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content: string = data.choices?.[0]?.message?.content || "";
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          const cleaned = (arr as unknown[])
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((s) => s.trim())
            .slice(0, count);
          if (cleaned.length) return cleaned;
        }
      }
    } catch {
      /* fall through to generic */
    }
  }

  // Generic fallback derived from keywords (or empty if none).
  if (keywords.length) {
    return keywords.slice(0, count).map((k) => `What is the best option for "${k}"?`);
  }
  return [];
}

/**
 * Ensure the domain has active prompts. If none exist, generate and persist a
 * seed set. Returns the active prompts.
 */
export async function ensurePrompts(domainId: string, domainUrl: string) {
  const existing = db
    .select()
    .from(schema.visibilityPrompts)
    .where(eq(schema.visibilityPrompts.domainId, domainId))
    .all();

  const active = existing.filter((p) => p.active);
  if (active.length) return active;
  if (existing.length) return active; // user deleted/deactivated all — respect that

  const seeds = await generateSeedPrompts(domainId, domainUrl);
  for (const text of seeds) {
    db.insert(schema.visibilityPrompts)
      .values({ domainId, text, source: "auto", active: true })
      .run();
  }

  return db
    .select()
    .from(schema.visibilityPrompts)
    .where(eq(schema.visibilityPrompts.domainId, domainId))
    .all()
    .filter((p) => p.active);
}
