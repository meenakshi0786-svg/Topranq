"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CubeLoader } from "@/components/cube-loader";
import { usePageTitle } from "@/components/page-title";

interface Cluster {
  id: string;
  clusterTopic: string;
  clusterKeywords: string[];
  reason: string | null;
  articleId: string | null;
  orderIndex: number;
}

interface Pillar {
  id: string;
  topic: string;
  description: string | null;
  pillarArticleId: string | null;
  createdAt: string;
  clusters: Cluster[];
}

interface PillarSuggestion {
  pillarTopic: string;
  rationale: string;
  supportingQueries: string[];
  recommendedFormat?: string;
  competitiveAdvantage?: string;
}

interface InterlinkSuggestion {
  id: string;
  articleId: string;
  articleTitle: string;
  find: string;
  replace: string;
  targetSlug: string;
  targetTitle: string;
  direction: "pillar→cluster" | "cluster→pillar" | "cluster↔cluster";
}

interface GSCKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  position: number;
}

export default function PillarsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domainId = params.id as string;

  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedTopic, setSeedTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null); // id of item being generated
  const [interlinkLoading, setInterlinkLoading] = useState<string | null>(null); // pillarId
  const [interlinkSuggestions, setInterlinkSuggestions] = useState<Record<string, InterlinkSuggestion[]>>({});
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [applyingLinks, setApplyingLinks] = useState(false);
  const [suggestions, setSuggestions] = useState<PillarSuggestion[] | null>(null);
  const [gscKeywords, setGscKeywords] = useState<GSCKeyword[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  usePageTitle("Pillars & Clusters");

  const fetchPillars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${domainId}/pillars`);
      if (res.ok) setPillars(await res.json());
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  useEffect(() => { fetchPillars(); }, [fetchPillars]);

  const runSuggest = useCallback(async () => {
    setSuggestError(null);
    setSuggestLoading(true);
    setSuggestions(null);
    setGscKeywords([]);
    try {
      const res = await fetch(`/api/domains/${domainId}/pillars/suggest`);
      const d = await res.json();
      if (!res.ok) {
        setSuggestError(d.error || "Failed to generate suggestions");
        return;
      }
      setSuggestions(d.suggestions || []);
      setGscKeywords(d.keywords || []);
    } catch {
      setSuggestError("Failed to generate suggestions");
    } finally {
      setSuggestLoading(false);
    }
  }, [domainId]);

  // Also trigger automatically when arriving from the onboarding panel (?suggest=1)
  useEffect(() => {
    if (searchParams.get("suggest") === "1") runSuggest();
  }, [searchParams, runSuggest]);

  async function createPillar(overrideTopic?: string) {
    const topic = (overrideTopic ?? seedTopic).trim();
    if (!topic) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/domains/${domainId}/pillars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedTopic: topic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create pillar");
        return;
      }
      setSeedTopic("");
      setSuggestions(null);
      await fetchPillars();
    } finally {
      setCreating(false);
    }
  }

  async function generateArticle(pillarId: string, clusterId: string | null, isPillar: boolean) {
    const key = isPillar ? `pillar-${pillarId}` : `cluster-${clusterId}`;
    setGenerating(key);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/clusters/${clusterId || "none"}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPillar }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        alert("Server returned an unexpected response. The article may be taking too long to generate — please try again.");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Generation failed");
        return;
      }
      const result = await res.json();
      // Immediately update the UI with the new article ID
      setPillars((prev) => prev.map((p) => {
        if (p.id !== pillarId) return p;
        if (isPillar) return { ...p, pillarArticleId: result.articleId };
        return {
          ...p,
          clusters: p.clusters.map((c) =>
            c.id === clusterId ? { ...c, articleId: result.articleId } : c
          ),
        };
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  }

  async function deletePillar(pillarId: string) {
    if (!confirm("Delete this pillar and all its clusters?")) return;
    await fetch(`/api/domains/${domainId}/pillars?pillarId=${pillarId}`, { method: "DELETE" });
    await fetchPillars();
  }

  async function fetchInterlinkSuggestions(pillarId: string) {
    setInterlinkLoading(pillarId);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/interlink`);
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to get suggestions"); return; }
      const suggestions = data.suggestions || [];
      setInterlinkSuggestions(prev => ({ ...prev, [pillarId]: suggestions }));
      // Auto-select all
      setSelectedSuggestions(new Set(suggestions.map((s: InterlinkSuggestion) => s.id)));
    } catch {
      alert("Failed to get interlink suggestions");
    } finally {
      setInterlinkLoading(null);
    }
  }

  function toggleSuggestion(id: string) {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function applySelectedSuggestions(pillarId: string) {
    const suggestions = interlinkSuggestions[pillarId] || [];
    const toApply = suggestions.filter(s => selectedSuggestions.has(s.id));
    if (toApply.length === 0) return;

    setApplyingLinks(true);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/interlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: toApply.map(s => ({ articleId: s.articleId, find: s.find, replace: s.replace })) }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to apply"); return; }
      alert(`Applied ${data.applied} internal links successfully!`);
      // Clear suggestions for this pillar
      setInterlinkSuggestions(prev => { const next = { ...prev }; delete next[pillarId]; return next; });
    } catch {
      alert("Failed to apply links");
    } finally {
      setApplyingLinks(false);
    }
  }

  function allArticlesGenerated(pillar: Pillar): boolean {
    if (!pillar.pillarArticleId) return false;
    return pillar.clusters.every(c => !!c.articleId);
  }

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Dashboard
          </Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Pillars &amp; Clusters</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
            Topic Strategy
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Pillars &amp; Clusters</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Build topical authority: one comprehensive pillar page with supporting cluster articles that all link back to it.
          </p>
        </div>

        {/* Create a new pillar strategy — GSC + Products driven, with seed-topic fallback */}
        <div className="card-static p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Create a new pillar strategy
              </h2>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                We&apos;ll analyze your Google Search Console rankings and imported products to suggest 3 pillar topics.
              </p>
            </div>
            <button
              onClick={runSuggest}
              disabled={suggestLoading || creating}
              className="px-6 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40 shrink-0"
              style={{ background: "#4F6EF7" }}
            >
              {suggestLoading ? "Analyzing..." : "Generate"}
            </button>
          </div>

          {suggestError && (
            <p className="text-xs mb-3" style={{ color: "#ef4444" }}>{suggestError}</p>
          )}

          {suggestLoading && (
            <div className="my-6">
              <CubeLoader label="Analyzing GSC + products..." sublabel="Grouping your top queries into pillar candidates" />
            </div>
          )}

          {/* GSC Keyword Research table */}
          {gscKeywords.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Keyword Research
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  from Google Search Console
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-light)" }}>
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      <th className="text-left px-4 py-2.5 font-semibold" style={{ color: "var(--text-secondary)" }}>Keyword</th>
                      <th className="text-right px-4 py-2.5 font-semibold" style={{ color: "var(--text-secondary)" }}>Clicks</th>
                      <th className="text-right px-4 py-2.5 font-semibold" style={{ color: "var(--text-secondary)" }}>Impressions</th>
                      <th className="text-right px-4 py-2.5 font-semibold" style={{ color: "var(--text-secondary)" }}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscKeywords.map((kw, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-light)" }}>
                        <td className="px-4 py-2" style={{ color: "var(--text-primary)" }}>{kw.keyword}</td>
                        <td className="px-4 py-2 text-right tabular-nums" style={{ color: "#4F6EF7" }}>{kw.clicks}</td>
                        <td className="px-4 py-2 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{kw.impressions}</td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-bold tabular-nums"
                            style={{
                              background: kw.position <= 10 ? "#dcfce7" : kw.position <= 20 ? "#fef9c3" : "#fee2e2",
                              color: kw.position <= 10 ? "#166534" : kw.position <= 20 ? "#854d0e" : "#991b1b",
                            }}
                          >
                            {kw.position}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                Keywords at position 4-20 are great opportunities for pillar content.
              </p>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  disabled={creating}
                  onClick={() => createPillar(s.pillarTopic)}
                  className="text-left p-4 rounded-lg cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
                >
                  <p className="text-sm font-semibold mb-1">{s.pillarTopic}</p>
                  {s.recommendedFormat && (
                    <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1.5" style={{ background: "#4F6EF715", color: "#4F6EF7" }}>
                      {s.recommendedFormat}
                    </span>
                  )}
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>{s.rationale}</p>
                  {s.competitiveAdvantage && (
                    <p className="text-[11px] mb-1.5" style={{ color: "var(--success)" }}>
                      Edge: {s.competitiveAdvantage}
                    </p>
                  )}
                  {s.supportingQueries.length > 0 && (
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Keywords: {s.supportingQueries.slice(0, 3).join(" · ")}
                      {s.supportingQueries.length > 3 ? ` +${s.supportingQueries.length - 3}` : ""}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Manual seed topic fallback */}
          <details className="mt-2">
            <summary className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
              Or enter your own seed topic
            </summary>
            <div className="flex gap-3 mt-3">
              <input
                type="text"
                value={seedTopic}
                onChange={(e) => setSeedTopic(e.target.value)}
                placeholder="e.g. Organic skincare for sensitive skin"
                className="flex-1 px-4 py-3 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                disabled={creating}
                onKeyDown={(e) => e.key === "Enter" && createPillar()}
              />
              <button
                onClick={() => createPillar()}
                disabled={creating || !seedTopic.trim()}
                className="px-6 py-3 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40"
                style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
              >
                {creating ? "Planning..." : "Generate Plan"}
              </button>
            </div>
          </details>

          {error && (
            <p className="text-xs mt-3" style={{ color: "#ef4444" }}>{error}</p>
          )}
          {creating && (
            <div className="mt-6">
              <CubeLoader label="Designing pillar & cluster strategy..." sublabel="Picking high-authority subtopics" />
            </div>
          )}
        </div>

        {/* Pillars list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="card-static p-6 animate-pulse">
                <div className="w-16 h-4 rounded mb-3" style={{ background: "var(--border-light)" }} />
                <div className="w-64 h-5 rounded mb-2" style={{ background: "var(--border-light)" }} />
                <div className="w-96 h-3 rounded mb-5" style={{ background: "var(--border-light)" }} />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-20 rounded-lg" style={{ background: "var(--border-light)" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : pillars.length === 0 ? (
          <div className="card-static p-12 text-center">
            <p className="text-base font-semibold mb-1">No pillars yet</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Enter a topic above to generate your first pillar-cluster plan.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pillars.map((pillar) => (
              <div key={pillar.id} className="card-static p-6 fade-in">
                {/* Pillar header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2" style={{ background: "#4F6EF715", color: "#4F6EF7" }}>
                      Pillar
                    </div>
                    <h3 className="text-lg font-bold mb-1">{pillar.topic}</h3>
                    {pillar.description && (
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{pillar.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deletePillar(pillar.id)}
                    className="text-xs cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Delete
                  </button>
                </div>

                {/* Pillar action */}
                <div className="mb-5 p-4 rounded-lg flex items-center justify-between" style={{ background: "#4F6EF708", border: "1px dashed #4F6EF740" }}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "#4F6EF7" }}>Pillar article</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {pillar.pillarArticleId
                        ? "Already generated — view in Articles"
                        : "3000-word comprehensive guide covering everything"}
                    </p>
                  </div>
                  {pillar.pillarArticleId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#dcfce7", color: "#166534" }}>
                        Generated ✓
                      </span>
                      <Link
                        href={`/domain/${domainId}/articles/${pillar.pillarArticleId}`}
                        className="text-xs font-semibold px-4 py-2 rounded-lg"
                        style={{ background: "#22c55e", color: "#fff" }}
                      >
                        View article
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateArticle(pillar.id, null, true)}
                      disabled={generating === `pillar-${pillar.id}`}
                      className="text-xs font-semibold px-4 py-2 rounded-lg text-white cursor-pointer disabled:opacity-40"
                      style={{ background: "#4F6EF7" }}
                    >
                      {generating === `pillar-${pillar.id}` ? "Generating..." : "Generate pillar"}
                    </button>
                  )}
                </div>

                {/* Clusters */}
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                  Supporting clusters ({pillar.clusters.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pillar.clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="p-4 rounded-lg"
                      style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
                    >
                      <p className="text-sm font-semibold mb-1">{cluster.clusterTopic}</p>
                      {cluster.reason && (
                        <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                          {cluster.reason}
                        </p>
                      )}
                      {cluster.clusterKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {cluster.clusterKeywords.slice(0, 4).map((kw, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-white)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {cluster.articleId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold px-3 py-1 rounded" style={{ background: "#dcfce7", color: "#166534" }}>
                            Generated ✓
                          </span>
                          <Link
                            href={`/domain/${domainId}/articles/${cluster.articleId}`}
                            className="text-[11px] font-semibold px-3 py-1 rounded"
                            style={{ background: "#22c55e", color: "#fff" }}
                          >
                            View
                          </Link>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateArticle(pillar.id, cluster.id, false)}
                          disabled={generating === `cluster-${cluster.id}`}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-40"
                          style={{ background: "#4F6EF715", color: "#4F6EF7" }}
                        >
                          {generating === `cluster-${cluster.id}` ? "Generating..." : "Generate article"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Internal Linking CTA */}
                <div className="mt-5 p-4 rounded-lg" style={{
                  background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
                  border: "1px solid #22c55e40",
                }}>
                  {interlinkSuggestions[pillar.id] ? (
                    /* Suggestions loaded — show them */
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                          <p className="text-xs font-bold" style={{ color: "#166534" }}>
                            {interlinkSuggestions[pillar.id].length} Link Suggestions
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {selectedSuggestions.size} selected
                          </span>
                          <button
                            onClick={() => applySelectedSuggestions(pillar.id)}
                            disabled={applyingLinks || selectedSuggestions.size === 0}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white cursor-pointer disabled:opacity-40"
                            style={{ background: "#22c55e" }}
                          >
                            {applyingLinks ? "Applying..." : "Apply Selected"}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                        {interlinkSuggestions[pillar.id].map(s => (
                          <div
                            key={s.id}
                            className="cursor-pointer"
                            onClick={() => toggleSuggestion(s.id)}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              background: selectedSuggestions.has(s.id) ? "#dcfce7" : "var(--bg-white)",
                              border: `1px solid ${selectedSuggestions.has(s.id) ? "#22c55e40" : "var(--border-light)"}`,
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span style={{
                                width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                                border: selectedSuggestions.has(s.id) ? "none" : "1.5px solid var(--border)",
                                background: selectedSuggestions.has(s.id) ? "#22c55e" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {selectedSuggestions.has(s.id) && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                                    background: s.direction === "pillar→cluster" ? "#4F6EF715" : s.direction === "cluster→pillar" ? "#7C5CFC15" : "#22c55e15",
                                    color: s.direction === "pillar→cluster" ? "#4F6EF7" : s.direction === "cluster→pillar" ? "#7C5CFC" : "#22c55e",
                                  }}>
                                    {s.direction}
                                  </span>
                                  <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                                    in &ldquo;{s.articleTitle.slice(0, 40)}&rdquo;
                                  </span>
                                </div>
                                <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
                                  <span style={{ textDecoration: "line-through", color: "var(--critical)" }}>{s.find.slice(0, 60)}</span>
                                </p>
                                <p className="text-[11px]" style={{ color: "#166534" }}>
                                  → {s.replace.slice(0, 80)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#22c55e15" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: "#166534" }}>Internal Linking</p>
                          <p className="text-[11px]" style={{ color: "#15803d" }}>Get AI suggestions to interlink your pillar and cluster articles.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => fetchInterlinkSuggestions(pillar.id)}
                        disabled={interlinkLoading === pillar.id || ((pillar.pillarArticleId ? 1 : 0) + pillar.clusters.filter(c => c.articleId).length) < 2}
                        className="text-xs font-semibold px-4 py-2 rounded-lg text-white cursor-pointer disabled:opacity-40 shrink-0"
                        style={{ background: "#22c55e" }}
                      >
                        {interlinkLoading === pillar.id ? "Analyzing..." : "Get Link Suggestions"}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
