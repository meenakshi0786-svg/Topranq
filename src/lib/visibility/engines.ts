// AI engine querying for visibility tracking.
// All engines are reached through the existing OpenRouter key — no new accounts.
// Web-grounded models (`:online` or Perplexity Sonar) are used so results reflect
// what a real user sees in AI search, not the model's stale training memory.

export type EngineKey = "perplexity" | "chatgpt" | "gemini" | "claude";

export interface EngineDef {
  key: EngineKey;
  name: string;
  model: string; // OpenRouter model id (cost-optimized tier)
}

// Cost-optimized defaults (~$0.20/scan for 10 prompts). See RanqApex-Cost-Chart.md.
export const ENGINES: EngineDef[] = [
  { key: "perplexity", name: "Perplexity", model: "perplexity/sonar" },
  { key: "chatgpt", name: "ChatGPT", model: "openai/gpt-4o-mini:online" },
  { key: "gemini", name: "Google / Gemini", model: "google/gemini-2.5-flash:online" },
  { key: "claude", name: "Claude", model: "anthropic/claude-3.5-haiku:online" },
];

export interface EngineAnswer {
  engine: EngineKey;
  text: string;
  citations: string[]; // URLs the engine cited as sources
  error?: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Ask a single AI engine a question, returning its answer text and any cited URLs.
 * Never throws — on failure returns an EngineAnswer with `error` set so one bad
 * engine doesn't sink the whole scan.
 */
export async function queryEngine(engine: EngineDef, prompt: string): Promise<EngineAnswer> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: engine.model,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { engine: engine.key, text: "", citations: [], error: `${res.status} ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message ?? {};
    const text: string = message.content || "";

    // Collect cited URLs from both shapes OpenRouter returns:
    //  - Perplexity Sonar: top-level `citations` array of URLs
    //  - `:online` web plugin: message.annotations[].url_citation.url
    const citations = new Set<string>();
    if (Array.isArray(data.citations)) {
      for (const c of data.citations) if (typeof c === "string") citations.add(c);
    }
    if (Array.isArray(message.annotations)) {
      for (const a of message.annotations) {
        const url = a?.url_citation?.url;
        if (typeof url === "string") citations.add(url);
      }
    }

    return { engine: engine.key, text, citations: [...citations] };
  } catch (err) {
    return { engine: engine.key, text: "", citations: [], error: (err as Error).message };
  }
}
