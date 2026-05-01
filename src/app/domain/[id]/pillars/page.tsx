"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CubeLoader } from "@/components/cube-loader";
import { usePageTitle } from "@/components/page-title";
import { UpgradeModal } from "@/components/upgrade-modal";

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
  status?: "pending" | "applied" | "rejected";
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
  const [actioningSuggestion, setActioningSuggestion] = useState<string | null>(null);
  const [articleUsage, setArticleUsage] = useState<{ used: number; limit: number } | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [suggestions, setSuggestions] = useState<PillarSuggestion[] | null>(null);
  const [gscKeywords, setGscKeywords] = useState<GSCKeyword[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  usePageTitle("Pillars & Clusters");

  function showToast(message: string, type: "success" | "error" = "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

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

  // Fetch article usage
  useEffect(() => {
    fetch("/api/credits").then(r => r.json()).then(data => {
      if (data.articles) setArticleUsage(data.articles);
      if (data.plan) setUserPlan(data.plan);
    }).catch(() => {});
  }, []);

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
        showToast("Server returned an unexpected response. Please try again.", "error");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403 || res.status === 401) {
          setUpgradeMessage(data.error || "");
          setShowUpgrade(true);
          return;
        }
        showToast(data.error || "Generation failed", "error");
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
      showToast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(null);
    }
  }

  const [generatingAll, setGeneratingAll] = useState<string | null>(null); // pillarId
  const [generatingAllProgress, setGeneratingAllProgress] = useState("");

  async function generateAllArticles(pillar: Pillar) {
    setGeneratingAll(pillar.id);
    const missing: Array<{ clusterId: string | null; isPillar: boolean; label: string }> = [];

    // Queue pillar article first if missing
    if (!pillar.pillarArticleId) {
      missing.push({ clusterId: null, isPillar: true, label: "Pillar: " + pillar.topic.slice(0, 30) });
    }

    // Queue missing cluster articles
    for (const c of pillar.clusters) {
      if (!c.articleId) {
        missing.push({ clusterId: c.id, isPillar: false, label: "Cluster: " + c.clusterTopic.slice(0, 30) });
      }
    }

    if (missing.length === 0) {
      // All done — fetch link suggestions
      setGeneratingAll(null);
      fetchInterlinkSuggestions(pillar.id);
      return;
    }

    for (let i = 0; i < missing.length; i++) {
      const item = missing[i];
      setGeneratingAllProgress(`Generating ${i + 1} of ${missing.length}: ${item.label}...`);

      try {
        const res = await fetch(`/api/pillars/${pillar.id}/clusters/${item.clusterId || "none"}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPillar: item.isPillar }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) continue;
        if (!res.ok) continue;

        const result = await res.json();

        // Update UI immediately
        setPillars((prev) => prev.map((p) => {
          if (p.id !== pillar.id) return p;
          if (item.isPillar) return { ...p, pillarArticleId: result.articleId };
          return {
            ...p,
            clusters: p.clusters.map((c) =>
              c.id === item.clusterId ? { ...c, articleId: result.articleId } : c
            ),
          };
        }));
      } catch {
        // Continue with next article even if one fails
      }
    }

    setGeneratingAll(null);
    setGeneratingAllProgress("");
  }

  async function deletePillar(pillarId: string) {
    if (!confirm("Delete this pillar and all its clusters?")) return;
    await fetch(`/api/domains/${domainId}/pillars?pillarId=${pillarId}`, { method: "DELETE" });
    await fetchPillars();
  }

  // Load saved suggestions for a pillar from DB
  async function loadSavedSuggestions(pillarId: string) {
    try {
      const res = await fetch(`/api/pillars/${pillarId}/interlink`);
      const data = await res.json();
      if (res.ok && data.suggestions && data.suggestions.length > 0) {
        setInterlinkSuggestions(prev => ({ ...prev, [pillarId]: data.suggestions }));
      }
    } catch { /* ignore */ }
  }

  // Generate NEW suggestions (calls AI, saves to DB)
  async function fetchInterlinkSuggestions(pillarId: string) {
    setInterlinkLoading(pillarId);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/interlink?action=generate`);
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to get suggestions", "error"); return; }
      setInterlinkSuggestions(prev => ({ ...prev, [pillarId]: data.suggestions || [] }));
    } catch {
      showToast("Failed to get interlink suggestions", "error");
    } finally {
      setInterlinkLoading(null);
    }
  }

  // Accept a single suggestion
  async function acceptSuggestion(pillarId: string, suggestionId: string) {
    setActioningSuggestion(suggestionId);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/interlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, action: "accept" }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to apply", "error"); return; }
      // Update local state
      setInterlinkSuggestions(prev => ({
        ...prev,
        [pillarId]: (prev[pillarId] || []).map(s =>
          s.id === suggestionId ? { ...s, status: "applied" as const } : s
        ),
      }));
      showToast("Link applied successfully!", "success");
    } catch {
      showToast("Failed to apply link", "error");
    } finally {
      setActioningSuggestion(null);
    }
  }

  // Reject a single suggestion
  async function rejectSuggestion(pillarId: string, suggestionId: string) {
    setActioningSuggestion(suggestionId);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/interlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, action: "reject" }),
      });
      if (!res.ok) { showToast("Failed to dismiss", "error"); return; }
      setInterlinkSuggestions(prev => ({
        ...prev,
        [pillarId]: (prev[pillarId] || []).map(s =>
          s.id === suggestionId ? { ...s, status: "rejected" as const } : s
        ),
      }));
    } catch {
      showToast("Failed to dismiss", "error");
    } finally {
      setActioningSuggestion(null);
    }
  }

  // Load saved suggestions for all pillars on mount
  useEffect(() => {
    if (pillars.length > 0) {
      pillars.forEach(p => loadSavedSuggestions(p.id));
    }
  }, [pillars.length]);

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

        {/* Article usage bar */}
        {articleUsage && (
          <div className="card-static p-4 mb-6 flex items-center justify-between fade-in">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {articleUsage.used} / {articleUsage.limit} Articles Used
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {articleUsage.limit - articleUsage.used > 0
                    ? `${articleUsage.limit - articleUsage.used} remaining`
                    : "Limit reached — purchase another pack"}
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-[200px] mx-4">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, (articleUsage.used / articleUsage.limit) * 100)}%`,
                  background: articleUsage.used >= articleUsage.limit ? "var(--critical)" : articleUsage.used >= articleUsage.limit * 0.8 ? "#eab308" : "var(--accent)",
                }} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View Plans — always visible */}
              {userPlan === "free" && (
                <a href="/pricing" className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                  View Plans
                </a>
              )}
              {/* Buy More — only enabled when $1 plan limit reached, links to $5 plan */}
              {userPlan === "dollar1" && (
                <a
                  href={articleUsage.used >= articleUsage.limit ? "/pricing" : "#"}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0"
                  style={{
                    background: articleUsage.used >= articleUsage.limit ? "#22c55e" : "var(--border)",
                    cursor: articleUsage.used >= articleUsage.limit ? "pointer" : "default",
                    pointerEvents: articleUsage.used >= articleUsage.limit ? "auto" : "none",
                    opacity: articleUsage.used >= articleUsage.limit ? 1 : 0.5,
                  }}
                >
                  Upgrade to $5 Plan
                </a>
              )}
              {userPlan === "dollar5" && articleUsage.used >= articleUsage.limit && (
                <a href="/pricing" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0" style={{ background: "var(--accent)" }}>
                  Buy More
                </a>
              )}
            </div>
          </div>
        )}


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

                {/* Internal Linking — single button */}
                {interlinkSuggestions[pillar.id] && interlinkSuggestions[pillar.id].length > 0 ? (
                  /* Suggestions loaded — show with per-suggestion ✓/✗ */
                  <div className="mt-5 p-4 rounded-lg" style={{ background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)", border: "1px solid #22c55e40" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                        <p className="text-xs font-bold" style={{ color: "#166534" }}>
                          {interlinkSuggestions[pillar.id].length} Link Suggestions
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span>{interlinkSuggestions[pillar.id].filter(s => s.status === "applied").length} applied</span>
                        <span>·</span>
                        <span>{interlinkSuggestions[pillar.id].filter(s => s.status === "pending").length} pending</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 350, overflowY: "auto" }}>
                      {interlinkSuggestions[pillar.id].map(s => (
                        <div
                          key={s.id}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: s.status === "applied" ? "#dcfce7" : s.status === "rejected" ? "#f9fafb" : "var(--bg-white)",
                            border: `1px solid ${s.status === "applied" ? "#22c55e40" : s.status === "rejected" ? "#e5e7eb" : "var(--border-light)"}`,
                            opacity: s.status === "rejected" ? 0.5 : 1,
                          }}
                        >
                          <div className="flex items-start gap-2">
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
                                {s.status === "applied" && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#dcfce7", color: "#166534" }}>Applied ✓</span>
                                )}
                                {s.status === "rejected" && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#9ca3af" }}>Dismissed</span>
                                )}
                              </div>
                              <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
                                <span style={{ textDecoration: "line-through", color: "var(--critical)" }}>{s.find.slice(0, 60)}</span>
                              </p>
                              <p className="text-[11px]" style={{ color: "#166534" }}>
                                → {s.replace.slice(0, 80)}
                              </p>
                            </div>
                            {/* Accept / Reject buttons */}
                            {s.status === "pending" && (
                              <div className="flex items-center gap-1 shrink-0" style={{ marginTop: 2 }}>
                                <button
                                  onClick={() => acceptSuggestion(pillar.id, s.id)}
                                  disabled={actioningSuggestion === s.id}
                                  className="cursor-pointer disabled:opacity-40"
                                  title="Accept and apply this link"
                                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                </button>
                                <button
                                  onClick={() => rejectSuggestion(pillar.id, s.id)}
                                  disabled={actioningSuggestion === s.id}
                                  className="cursor-pointer disabled:opacity-40"
                                  title="Dismiss this suggestion"
                                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Single button */
                  <div className="mt-5">
                    <button
                      onClick={() => {
                        if (allArticlesGenerated(pillar)) {
                          fetchInterlinkSuggestions(pillar.id);
                        } else {
                          generateAllArticles(pillar);
                        }
                      }}
                      disabled={interlinkLoading === pillar.id || generatingAll === pillar.id}
                      className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
                      style={{
                        background: allArticlesGenerated(pillar) ? "#22c55e" : "#4F6EF7",
                        color: "#fff",
                        border: "none",
                      }}
                    >
                      {generatingAll === pillar.id
                        ? generatingAllProgress || "Generating articles..."
                        : interlinkLoading === pillar.id
                          ? "Analyzing articles for link suggestions..."
                          : allArticlesGenerated(pillar)
                            ? "Get Internal Link Suggestions"
                            : "Generate all articles to proceed"}
                    </button>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          padding: "12px 20px", borderRadius: 12, zIndex: 100,
          background: toast.type === "success" ? "#166534" : "#991b1b",
          color: "#fff", fontSize: 13, fontWeight: 500,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.type === "success" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          )}
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 8, opacity: 0.7 }}>✕</button>
        </div>
      )}

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          title={upgradeMessage.includes("Upgrade") ? "Upgrade Your Plan" : "Unlock Article Generation"}
          subtitle={upgradeMessage || "Purchase a plan to generate AI articles"}
        />
      )}
    </div>
  );
}
