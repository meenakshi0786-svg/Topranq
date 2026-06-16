// Scoring: roll per-result detections up into an AI Visibility Score (0-100)
// plus per-engine breakdowns and the most-cited competing sources.

import type { EngineKey } from "./engines";

export interface ResultRow {
  engine: string;
  mentioned: boolean;
  cited: boolean;
  competitors?: string[];
}

export interface EngineBreakdown {
  engine: string;
  prompts: number;
  mentionRate: number; // 0-100
  citationRate: number; // 0-100
  score: number; // 0-100
}

export interface VisibilityScore {
  overallScore: number; // 0-100
  mentionRate: number; // % of prompts mentioned in at least one engine
  citationRate: number; // % of prompts cited in at least one engine
  engines: EngineBreakdown[];
  topCompetitors: Array<{ domain: string; count: number }>;
}

// A mention is worth 60% of an engine's score, a citation (stronger signal) 40% on top.
const MENTION_WEIGHT = 0.6;
const CITATION_WEIGHT = 0.4;

export function scoreEngine(rows: ResultRow[]): number {
  if (!rows.length) return 0;
  const mention = rows.filter((r) => r.mentioned).length / rows.length;
  const citation = rows.filter((r) => r.cited).length / rows.length;
  return Math.round((mention * MENTION_WEIGHT + citation * CITATION_WEIGHT) * 100);
}

export function computeScore(rows: ResultRow[], promptIds: string[] | number): VisibilityScore {
  const promptCount = typeof promptIds === "number" ? promptIds : promptIds.length;

  const engineKeys = [...new Set(rows.map((r) => r.engine))] as EngineKey[];
  const engines: EngineBreakdown[] = engineKeys.map((engine) => {
    const er = rows.filter((r) => r.engine === engine);
    const mentionRate = er.length ? Math.round((er.filter((r) => r.mentioned).length / er.length) * 100) : 0;
    const citationRate = er.length ? Math.round((er.filter((r) => r.cited).length / er.length) * 100) : 0;
    return { engine, prompts: er.length, mentionRate, citationRate, score: scoreEngine(er) };
  });

  const overallScore = engines.length
    ? Math.round(engines.reduce((s, e) => s + e.score, 0) / engines.length)
    : 0;

  // Cross-engine "any engine" rates, per prompt is approximated at the row level
  // (each row is one prompt×engine); we report the simple share of rows here.
  const mentionRate = rows.length ? Math.round((rows.filter((r) => r.mentioned).length / rows.length) * 100) : 0;
  const citationRate = rows.length ? Math.round((rows.filter((r) => r.cited).length / rows.length) * 100) : 0;

  // Aggregate the most-cited competing source domains.
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const c of r.competitors || []) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  }
  const topCompetitors = [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  void promptCount;
  return { overallScore, mentionRate, citationRate, engines, topCompetitors };
}
