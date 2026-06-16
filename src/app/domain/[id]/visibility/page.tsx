"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface PromptRow { id: string; text: string; source: string; active: boolean }
interface EngineBreakdown { engine: string; prompts: number; mentionRate: number; citationRate: number; score: number }
interface PerPrompt { promptText: string; engines: Record<string, { mentioned: boolean; cited: boolean }> }
interface Latest {
  runId: string;
  startedAt: string;
  overallScore: number;
  mentionRate: number;
  citationRate: number;
  engines: EngineBreakdown[];
  topCompetitors: Array<{ domain: string; count: number }>;
  perPrompt: PerPrompt[];
}
interface VisibilityData {
  prompts: PromptRow[];
  latest: Latest | null;
  history: Array<{ runId: string; startedAt: string; overallScore: number }>;
  runningRun: unknown | null;
}

const ENGINE_LABELS: Record<string, string> = {
  perplexity: "Perplexity",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
};
const ENGINE_ORDER = ["chatgpt", "perplexity", "gemini", "claude"];

function scoreColor(score: number): string {
  if (score >= 60) return "#16a34a";
  if (score >= 30) return "#d97706";
  return "#dc2626";
}

export default function VisibilityPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [data, setData] = useState<VisibilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}/visibility`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [domainId]);

  useEffect(() => { load(); }, [load]);

  async function runScan() {
    setScanning(true);
    setError("");
    try {
      const res = await fetch(`/api/domains/${domainId}/visibility/run`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Scan failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    }
    setScanning(false);
  }

  async function addPrompt() {
    if (!newPrompt.trim()) return;
    await fetch(`/api/domains/${domainId}/visibility/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newPrompt.trim() }),
    });
    setNewPrompt("");
    load();
  }

  async function seedPrompts() {
    await fetch(`/api/domains/${domainId}/visibility/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: true }),
    });
    load();
  }

  async function deletePrompt(promptId: string) {
    await fetch(`/api/domains/${domainId}/visibility/prompts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId }),
    });
    load();
  }

  const latest = data?.latest || null;
  const activePrompts = data?.prompts.filter((p) => p.active) || [];

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">AI Visibility</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">AI Visibility Tracking</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              See whether AI assistants (ChatGPT, Perplexity, Gemini, Claude) mention or cite your brand.
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanning || activePrompts.length === 0}
            className="btn-primary px-5 py-2.5 text-sm cursor-pointer whitespace-nowrap"
          >
            {scanning ? "Scanning all engines…" : "Run scan (20 credits)"}
          </button>
        </div>

        {error && (
          <div className="card-static p-4 mb-6" style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626" }}>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="card-static p-16 text-center fade-in"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>
        ) : (
          <>
            {/* Score hero */}
            {latest ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card-static p-6 fade-in flex flex-col items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>AI Visibility Score</p>
                  <p className="text-5xl font-bold" style={{ color: scoreColor(latest.overallScore) }}>{latest.overallScore}</p>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>out of 100</p>
                </div>
                <div className="card-static p-6 fade-in flex flex-col items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Mention rate</p>
                  <p className="text-4xl font-bold">{latest.mentionRate}%</p>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>answers naming your brand</p>
                </div>
                <div className="card-static p-6 fade-in flex flex-col items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Citation rate</p>
                  <p className="text-4xl font-bold">{latest.citationRate}%</p>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>answers citing your site</p>
                </div>
              </div>
            ) : (
              <div className="card-static p-10 text-center mb-6 fade-in">
                <p className="text-sm mb-1 font-medium">No scans yet</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {activePrompts.length === 0
                    ? "Add or auto-generate prompts below, then run your first scan."
                    : "Run a scan to see how AI assistants answer for your brand."}
                </p>
              </div>
            )}

            {/* Per-engine breakdown */}
            {latest && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...latest.engines].sort((a, b) => ENGINE_ORDER.indexOf(a.engine) - ENGINE_ORDER.indexOf(b.engine)).map((e) => (
                  <div key={e.engine} className="card-static p-4 fade-in">
                    <p className="text-sm font-semibold mb-2">{ENGINE_LABELS[e.engine] || e.engine}</p>
                    <p className="text-2xl font-bold" style={{ color: scoreColor(e.score) }}>{e.score}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {e.mentionRate}% mention · {e.citationRate}% cited
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Per-prompt matrix */}
            {latest && latest.perPrompt.length > 0 && (
              <div className="card-static p-5 mb-6 fade-in overflow-x-auto">
                <p className="text-sm font-semibold mb-3">Per-question results</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: "var(--text-muted)" }}>
                      <th className="text-left font-medium pb-2">Question</th>
                      {ENGINE_ORDER.map((k) => <th key={k} className="font-medium pb-2 px-2 text-center">{ENGINE_LABELS[k]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {latest.perPrompt.map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-light)" }}>
                        <td className="py-2 pr-3" style={{ maxWidth: 420 }}>{row.promptText}</td>
                        {ENGINE_ORDER.map((k) => {
                          const cell = row.engines[k];
                          const symbol = !cell ? "·" : cell.cited ? "★" : cell.mentioned ? "●" : "○";
                          const color = !cell ? "var(--border)" : cell.cited ? "#16a34a" : cell.mentioned ? "#16a34a" : "var(--border)";
                          const title = !cell ? "not tested" : cell.cited ? "cited as source" : cell.mentioned ? "mentioned" : "not mentioned";
                          return <td key={k} className="py-2 px-2 text-center text-base" style={{ color }} title={title}>{symbol}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>★ cited as a source · ● mentioned · ○ not mentioned</p>
              </div>
            )}

            {/* Top cited sources */}
            {latest && latest.topCompetitors.length > 0 && (
              <div className="card-static p-5 mb-6 fade-in">
                <p className="text-sm font-semibold mb-1">Sources AI cited instead</p>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>The domains AI engines cited most across your questions — these are who you&apos;re competing with for AI visibility.</p>
                <div className="flex flex-wrap gap-2">
                  {latest.topCompetitors.map((c) => (
                    <span key={c.domain} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                      {c.domain} <span style={{ color: "var(--text-muted)" }}>×{c.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {data && data.history.length > 1 && (
              <div className="card-static p-5 mb-6 fade-in">
                <p className="text-sm font-semibold mb-3">Score over time</p>
                <div className="flex items-end gap-2 h-24">
                  {data.history.map((h) => (
                    <div key={h.runId} className="flex-1 flex flex-col items-center justify-end" title={`${h.overallScore} · ${new Date(h.startedAt).toLocaleDateString()}`}>
                      <div style={{ width: "100%", height: `${Math.max(4, h.overallScore)}%`, background: scoreColor(h.overallScore), borderRadius: 4 }} />
                      <span className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{h.overallScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompts management */}
            <div className="card-static p-5 fade-in">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-sm font-semibold">Tracked questions ({activePrompts.length})</p>
                {activePrompts.length === 0 && (
                  <button onClick={seedPrompts} className="btn-primary px-3 py-1.5 text-xs cursor-pointer">Auto-generate prompts</button>
                )}
              </div>
              <div className="space-y-2 mb-3">
                {activePrompts.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                    <span className="text-sm flex-1">{p.text}</span>
                    {p.source === "auto" && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--border-light)", color: "var(--text-muted)" }}>auto</span>}
                    <button onClick={() => deletePrompt(p.id)} className="text-xs cursor-pointer" style={{ color: "var(--critical, #dc2626)" }}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addPrompt(); }}
                  placeholder="Add a question buyers ask AI (e.g. best running shoes for flat feet)"
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                />
                <button onClick={addPrompt} disabled={!newPrompt.trim()} className="btn-primary px-4 py-2 text-sm cursor-pointer">Add</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
