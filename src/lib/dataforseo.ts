// DataForSEO integration — real search volume, keyword difficulty, top-ranking
// competitor, and "People Also Ask" for a batch of keywords.
//
// Uses three endpoints (all "live" so results come back in one request):
//   1. keywords_data/google_ads/search_volume/live  → monthly volume + CPC + competition
//   2. dataforseo_labs/google/bulk_keyword_difficulty/live → 0-100 difficulty
//   3. serp/google/organic/live/advanced (per top keyword) → PAA + top competitor
//
// Auth is HTTP Basic with login:password (base64). Set DATAFORSEO_LOGIN /
// DATAFORSEO_PASSWORD in the environment.

const BASE = "https://api.dataforseo.com/v3";

export interface KeywordMetric {
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  competition: number | null; // 0-1 (Google Ads competition index)
  topCompetitor: string | null; // domain ranking #1 organically
}

export interface KeywordMetricsResult {
  metrics: KeywordMetric[];
  peopleAlsoAsk: string[]; // up to 4 FAQ questions (from the highest-volume keyword)
}

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not set");
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dfsPost(path: string, task: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([task]),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DataForSEO ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const result = json?.tasks?.[0]?.result;
  if (json?.tasks?.[0]?.status_code && json.tasks[0].status_code >= 40000) {
    throw new Error(`DataForSEO ${path}: ${json.tasks[0].status_message || "task error"}`);
  }
  return result;
}

/**
 * Fetch volume + difficulty + CPC + top competitor + PAA for up to ~100 keywords.
 * locationName/languageName scope the market (default US / English).
 */
export async function keywordMetrics(
  keywords: string[],
  locationName = "United States",
  languageName = "English",
  // How many keywords get a full SERP lookup (top competitor + PAA). SERP is
  // billed per keyword, so free/Starter uses the default 5; Pro can pass a
  // higher number (or Infinity) to enrich every keyword.
  serpDepth = 5,
): Promise<KeywordMetricsResult> {
  const list = [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 100);
  if (!list.length) return { metrics: [], peopleAlsoAsk: [] };

  const byKeyword = new Map<string, KeywordMetric>();
  for (const k of list) byKeyword.set(k, { keyword: k, volume: null, difficulty: null, cpc: null, competition: null, topCompetitor: null });

  // 1. Search volume (Google Ads) + 2. Bulk difficulty (Labs) — run together.
  const [volumeRes, difficultyRes] = await Promise.all([
    dfsPost("/keywords_data/google_ads/search_volume/live", {
      keywords: list,
      location_name: locationName,
      language_name: languageName,
    }).catch(() => null),
    dfsPost("/dataforseo_labs/google/bulk_keyword_difficulty/live", {
      keywords: list,
      location_name: locationName,
      language_name: languageName,
    }).catch(() => null),
  ]);

  for (const row of (volumeRes as Array<Record<string, unknown>>) || []) {
    const kw = String(row.keyword || "").toLowerCase();
    const m = byKeyword.get(kw);
    if (!m) continue;
    m.volume = typeof row.search_volume === "number" ? row.search_volume : null;
    m.cpc = typeof row.cpc === "number" ? row.cpc : null;
    m.competition = typeof row.competition_index === "number" ? row.competition_index / 100 : null;
  }

  const diffItems = ((difficultyRes as Array<Record<string, unknown>>)?.[0]?.items as Array<Record<string, unknown>>) || [];
  for (const it of diffItems) {
    const kw = String(it.keyword || "").toLowerCase();
    const m = byKeyword.get(kw);
    if (m) m.difficulty = typeof it.keyword_difficulty === "number" ? it.keyword_difficulty : null;
  }

  // 3. SERP for the highest-volume keyword → PAA + top competitor for a few keywords.
  const sorted = [...byKeyword.values()].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const peopleAlsoAsk: string[] = [];
  const serpTargets = sorted.slice(0, Math.max(0, serpDepth)); // SERP is billed per keyword
  await Promise.all(
    serpTargets.map(async (m) => {
      try {
        const serp = (await dfsPost("/serp/google/organic/live/advanced", {
          keyword: m.keyword,
          location_name: locationName,
          language_name: languageName,
          depth: 10,
        })) as Array<Record<string, unknown>>;
        const items = (serp?.[0]?.items as Array<Record<string, unknown>>) || [];
        const firstOrganic = items.find((i) => i.type === "organic");
        if (firstOrganic?.domain) m.topCompetitor = String(firstOrganic.domain);
        if (peopleAlsoAsk.length < 4) {
          const paa = items.find((i) => i.type === "people_also_ask");
          const paaItems = (paa?.items as Array<Record<string, unknown>>) || [];
          for (const q of paaItems) {
            if (peopleAlsoAsk.length >= 4) break;
            if (q.title) peopleAlsoAsk.push(String(q.title));
          }
        }
      } catch {
        // best-effort per keyword
      }
    }),
  );

  return { metrics: sorted, peopleAlsoAsk };
}
