// Orchestrator: run a full AI visibility scan for a domain.
// Queries every active prompt across all engines, detects mentions/citations,
// stores per-result rows, and finalizes the run with an overall score.

import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { ENGINES, queryEngine } from "./engines";
import { deriveBrand, detect } from "./detect";
import { ensurePrompts } from "./seed-prompts";
import { computeScore } from "./score";

// A scan = ~10 prompts × 4 web-grounded engines. Articles cost 3 credits;
// a scan is far heavier (~$0.20 real API cost), so it's priced at 20.
export const VISIBILITY_SCAN_CREDITS = 20;

export interface ScanSummary {
  runId: string;
  overallScore: number;
  mentionRate: number;
  citationRate: number;
  promptCount: number;
  engines: ReturnType<typeof computeScore>["engines"];
  topCompetitors: ReturnType<typeof computeScore>["topCompetitors"];
}

export async function runVisibilityScan(domainId: string, domainUrl: string): Promise<ScanSummary> {
  const prompts = await ensurePrompts(domainId, domainUrl);
  if (!prompts.length) {
    throw new Error("No active prompts to scan. Add at least one prompt first.");
  }

  const brand = deriveBrand(domainUrl);
  const engineKeys = ENGINES.map((e) => e.key);

  const run = db
    .insert(schema.visibilityRuns)
    .values({
      domainId,
      status: "running",
      promptCount: prompts.length,
      engines: JSON.stringify(engineKeys),
    })
    .returning()
    .get();

  try {
    const allRows: Array<{ engine: string; mentioned: boolean; cited: boolean; competitors: string[] }> = [];

    // Sequential across prompts, parallel across the 4 engines (caps concurrency at 4).
    for (const p of prompts) {
      const answers = await Promise.all(ENGINES.map((e) => queryEngine(e, p.text)));
      for (const ans of answers) {
        const d = detect(ans, brand);
        allRows.push({ engine: ans.engine, mentioned: d.mentioned, cited: d.cited, competitors: d.competitors });
        db.insert(schema.visibilityResults)
          .values({
            runId: run.id,
            promptId: p.id,
            promptText: p.text,
            engine: ans.engine,
            mentioned: d.mentioned,
            cited: d.cited,
            citationUrl: d.citationUrl,
            competitors: JSON.stringify(d.competitors),
            rawSnippet: (ans.error ? `[error] ${ans.error}` : ans.text).slice(0, 500),
          })
          .run();
      }
    }

    const score = computeScore(allRows, prompts.length);

    db.update(schema.visibilityRuns)
      .set({
        status: "complete",
        overallScore: score.overallScore,
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.visibilityRuns.id, run.id))
      .run();

    return {
      runId: run.id,
      overallScore: score.overallScore,
      mentionRate: score.mentionRate,
      citationRate: score.citationRate,
      promptCount: prompts.length,
      engines: score.engines,
      topCompetitors: score.topCompetitors,
    };
  } catch (err) {
    db.update(schema.visibilityRuns)
      .set({ status: "failed", errorMessage: (err as Error).message, completedAt: new Date().toISOString() })
      .where(eq(schema.visibilityRuns.id, run.id))
      .run();
    throw err;
  }
}
