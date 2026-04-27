"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CubeLoader } from "@/components/cube-loader";
import { usePageTitle } from "@/components/page-title";

interface DiscoveredKeyword {
  keyword: string;
  difficulty: "Low" | "Medium" | "High";
  intent: "informational" | "commercial" | "transactional" | "navigational";
  relevancyScore: number;
  source: "competitor_gap" | "paa" | "related" | "gsc_weak" | "gsc_opportunity";
  sourceDetail?: string;
  competitorUrl?: string;
  runId?: string;
  isLatestRun?: boolean;
}

interface SuggestedPillar {
  topic: string;
  description: string;
  clusters: Array<{
    clusterTopic: string;
    clusterKeywords: string[];
    reason: string;
  }>;
}

type FilterDifficulty = "all" | "Low" | "Medium" | "High";
type ModalStep = "grouping" | "confirm" | "creating" | "done";

export default function KeywordPlannerPage() {
  const params = useParams();
  const router = useRouter();
  const domainId = params.id as string;
  usePageTitle("Magic Keyword Planner");

  const [keywords, setKeywords] = useState<DiscoveredKeyword[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterDifficulty>("all");
  const [latestRunId, setLatestRunId] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("grouping");
  const [suggestedPillars, setSuggestedPillars] = useState<SuggestedPillar[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load previous keywords on mount
  useEffect(() => {
    fetch(`/api/domains/${domainId}/keyword-discovery`)
      .then(r => r.json())
      .then(data => {
        if (data.keywords && data.keywords.length > 0) {
          setKeywords(data.keywords);
          setLatestRunId(data.latestRunId);
          // Auto-select latest run keywords
          const latestIndices = new Set<number>();
          data.keywords.forEach((kw: DiscoveredKeyword, i: number) => {
            if (kw.isLatestRun) latestIndices.add(i);
          });
          setSelected(latestIndices);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrevious(false));
  }, [domainId]);

  async function discover() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/domains/${domainId}/keyword-discovery`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Discovery failed"); return; }
      const newKws = (data.keywords || []) as DiscoveredKeyword[];
      const newRunId = data.runId;

      // Mark existing keywords as not latest
      const existingUpdated = keywords.map(kw => ({ ...kw, isLatestRun: false }));

      // Deduplicate: remove old keywords that match new ones
      const newKeywordTexts = new Set(newKws.map(k => k.keyword.toLowerCase()));
      const filtered = existingUpdated.filter(kw => !newKeywordTexts.has(kw.keyword.toLowerCase()));

      // Combine: new keywords first, then previous
      const combined = [...newKws, ...filtered];
      setKeywords(combined);
      setLatestRunId(newRunId);

      // Auto-select new keywords
      const newIndices = new Set<number>();
      combined.forEach((kw, i) => {
        if (kw.isLatestRun) newIndices.add(i);
      });
      setSelected(newIndices);
    } catch {
      setError("Failed to discover keywords");
    } finally {
      setLoading(false);
    }
  }

  function toggleKeyword(index: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredKeywords.map((_, i) => keywords.indexOf(filteredKeywords[i]))));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function openContentPipeline() {
    const selectedKeywords = keywords.filter((_, i) => selected.has(i));
    if (selectedKeywords.length === 0) return;

    setShowModal(true);
    setModalStep("grouping");
    setModalError(null);

    try {
      const res = await fetch(`/api/domains/${domainId}/keyword-discovery/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: selectedKeywords }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error || "Grouping failed"); return; }
      setSuggestedPillars(data.pillars || []);
      setModalStep("confirm");
    } catch {
      setModalError("Failed to group keywords");
    }
  }

  async function confirmAndCreate() {
    setModalStep("creating");
    setModalError(null);
    try {
      const res = await fetch(`/api/domains/${domainId}/keyword-discovery/create-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillars: suggestedPillars }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error || "Failed to create plan"); setModalStep("confirm"); return; }
      setModalStep("done");
    } catch {
      setModalError("Failed to create plan");
      setModalStep("confirm");
    }
  }

  const filteredKeywords = filter === "all" ? keywords : keywords.filter(k => k.difficulty === filter);

  const difficultyStyle = (d: string) =>
    d === "Low" ? { bg: "#dcfce7", color: "#166534" } :
    d === "Medium" ? { bg: "#fef9c3", color: "#854d0e" } :
    { bg: "#fee2e2", color: "#991b1b" };

  const intentIcon = (intent: string) =>
    intent === "informational" ? "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" :
    intent === "commercial" ? "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" :
    intent === "transactional" ? "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" :
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a2 2 0 110-4 2 2 0 010 4z";

  const sourceLabel = (s: string) => {
    const map: Record<string, { text: string; bg: string; color: string }> = {
      competitor_gap: { text: "GAP", bg: "#fee2e2", color: "#991b1b" },
      paa: { text: "PAA", bg: "#dbeafe", color: "#1e40af" },
      related: { text: "RELATED", bg: "#e0e7ff", color: "#3730a3" },
      gsc_weak: { text: "WEAK POS", bg: "#fef9c3", color: "#854d0e" },
      gsc_opportunity: { text: "CTR OPP", bg: "#dcfce7", color: "#166534" },
    };
    return map[s] || { text: s, bg: "#f3f4f6", color: "#6b7280" };
  };

  const gapCount = keywords.filter(k => k.source === "competitor_gap").length;
  const lowCount = keywords.filter(k => k.difficulty === "Low").length;
  const avgRelevancy = keywords.length > 0 ? Math.round(keywords.reduce((s, k) => s + k.relevancyScore, 0) / keywords.length) : 0;

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Dashboard</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">Keyword Planner</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-8 fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: "linear-gradient(135deg, #4F6EF715, #7C5CFC15)", color: "var(--accent)", border: "1px solid #4F6EF730" }}>
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "#22c55e" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22c55e" }} />
            </span>
            Magic Keyword Planner
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Discover{" "}
            <span style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Keyword Opportunities
            </span>
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 520 }}>
            Find low-hanging keywords from competitor gaps, SERP weaknesses, and search trends. Select the ones you want and build your content pipeline.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", color: "#ef4444", title: "Competitor Gap Analysis", desc: "Finds keywords your competitors rank for but you don't." },
            { icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", color: "#4F6EF7", title: "SERP Weakness Detection", desc: "Spots page 1 results with thin, outdated, or weak content you can beat." },
            { icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#22c55e", title: "Low-Hanging Fruit", desc: "Keywords where you can realistically rank with one well-written article." },
          ].map((item, i) => (
            <div key={item.title} className="card-static p-5 fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${item.color}12` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Discover button */}
        {keywords.length === 0 && !loading && !loadingPrevious && (
          <div className="card-static p-10 text-center fade-in" style={{ background: "linear-gradient(135deg, #4F6EF705, #7C5CFC05)", border: "1px solid #4F6EF720" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 glow-pulse" style={{ background: "linear-gradient(135deg, #4F6EF720, #7C5CFC20)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                <path d="M10 7v6m3-3H7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Ready to find keyword opportunities?</h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              We&apos;ll analyze competitor SERPs, find keyword gaps, and surface low-hanging opportunities you can rank for.
            </p>
            <button onClick={discover} className="btn-primary cursor-pointer" style={{ padding: "16px 48px", fontSize: 16, fontWeight: 600, borderRadius: 14, boxShadow: "0 4px 15px rgba(79, 110, 247, 0.3)" }}>
              Discover Keywords
            </button>
            {error && <p className="text-xs mt-4" style={{ color: "var(--critical)" }}>{error}</p>}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card-static p-12 fade-in">
            <CubeLoader label="Discovering keyword opportunities..." sublabel="Analyzing competitor SERPs, PAA questions, and related searches" />
          </div>
        )}

        {/* Keywords discovered — pills UI */}
        {keywords.length > 0 && !loading && (
          <div className="fade-in">
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card-static p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{keywords.length}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Keywords Found</p>
              </div>
              <div className="card-static p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: "#166534" }}>{lowCount}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Low Difficulty</p>
              </div>
              <div className="card-static p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: "#991b1b" }}>{gapCount}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Competitor Gaps</p>
              </div>
              <div className="card-static p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{avgRelevancy}%</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Relevancy</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {/* Difficulty filters */}
                {(["all", "Low", "Medium", "High"] as FilterDifficulty[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{
                      background: filter === f ? "var(--accent)" : "var(--bg)",
                      color: filter === f ? "#fff" : "var(--text-secondary)",
                      border: `1px solid ${filter === f ? "var(--accent)" : "var(--border-light)"}`,
                    }}
                  >
                    {f === "all" ? `All (${keywords.length})` : `${f} (${keywords.filter(k => k.difficulty === f).length})`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {selected.size} of {keywords.length} selected
                </span>
                <button onClick={selectAll} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                  Select All
                </button>
                <button onClick={deselectAll} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                  Clear
                </button>
              </div>
            </div>

            {/* Keyword pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }} className="mb-6">
              {filteredKeywords.map((kw) => {
                const realIndex = keywords.indexOf(kw);
                const isSelected = selected.has(realIndex);
                const ds = difficultyStyle(kw.difficulty);
                const sl = sourceLabel(kw.source);

                return (
                  <button
                    key={realIndex}
                    onClick={() => toggleKeyword(realIndex)}
                    className="cursor-pointer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: isSelected ? "2px solid #4F6EF7" : "1px solid var(--border-light)",
                      background: isSelected ? "#4F6EF708" : "var(--bg-white)",
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                  >
                    {/* Checkbox indicator */}
                    <span style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: isSelected ? "none" : "1.5px solid var(--border)",
                      background: isSelected ? "#4F6EF7" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </span>

                    {/* Intent icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d={intentIcon(kw.intent)} />
                    </svg>

                    {/* Keyword text */}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                      {kw.keyword}
                    </span>

                    {/* Difficulty badge */}
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                      background: ds.bg, color: ds.color, flexShrink: 0,
                    }}>
                      {kw.difficulty}
                    </span>

                    {/* Source badge */}
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                      background: sl.bg, color: sl.color, letterSpacing: "0.05em", flexShrink: 0,
                    }}>
                      {sl.text}
                    </span>

                    {/* Relevancy score */}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                      {kw.relevancyScore}%
                    </span>

                    {/* Run badge */}
                    {!kw.isLatestRun && kw.runId && (
                      <span style={{
                        fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                        background: "#f3f4f6", color: "#6b7280", letterSpacing: "0.03em", flexShrink: 0,
                      }}>
                        PREV
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Generate Content Plan button */}
            {selected.size > 0 && (
              <div className="text-center mb-6">
                <button
                  onClick={openContentPipeline}
                  className="btn-primary cursor-pointer"
                  style={{ padding: "14px 40px", fontSize: 15, fontWeight: 600, borderRadius: 12, boxShadow: "0 4px 15px rgba(79, 110, 247, 0.3)" }}
                >
                  Generate Content Plan from {selected.size} Keywords
                </button>
              </div>
            )}

            {/* Rediscover */}
            <div className="text-center">
              <button onClick={discover} disabled={loading} className="text-sm font-medium px-5 py-2.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Rediscover Keywords
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Content Pipeline Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <div style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", margin: 16, borderRadius: 16, background: "var(--bg-white)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            {/* Modal header */}
            <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {modalStep === "grouping" ? "Organizing Keywords..." :
                   modalStep === "confirm" ? "Review Content Plan" :
                   modalStep === "creating" ? "Creating Pillars..." : "Plan Created!"}
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  {modalStep === "grouping" ? "AI is grouping your keywords into pillar-cluster structure" :
                   modalStep === "confirm" ? `${suggestedPillars.length} pillars with ${suggestedPillars.reduce((s, p) => s + p.clusters.length, 0)} clusters` :
                   modalStep === "creating" ? "Saving to your content pipeline..." : "Your pillars and clusters are ready"}
                </p>
              </div>
              {(modalStep === "confirm" || modalStep === "done") && (
                <button onClick={() => setShowModal(false)} className="cursor-pointer" style={{ background: "none", border: "none", padding: 4 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Modal body */}
            <div style={{ padding: 24 }}>
              {/* Grouping step — loading */}
              {modalStep === "grouping" && !modalError && (
                <div style={{ padding: "40px 0" }}>
                  <CubeLoader label="Grouping keywords into pillars..." sublabel="Analyzing topic relationships and creating content clusters" />
                </div>
              )}

              {/* Confirm step — show pillar groupings */}
              {modalStep === "confirm" && (
                <div>
                  {suggestedPillars.map((pillar, pi) => (
                    <div key={pi} style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-light)" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{pillar.topic}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>{pillar.description}</p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)" }}>
                          PILLAR
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {pillar.clusters.map((cluster, ci) => (
                          <div key={ci} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{cluster.clusterTopic}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {cluster.clusterKeywords.map((kw, ki) => (
                                <span key={ki} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#4F6EF710", color: "#4F6EF7", border: "1px solid #4F6EF720" }}>
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={confirmAndCreate}
                    className="btn-primary cursor-pointer"
                    style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 600, borderRadius: 12, marginTop: 8 }}
                  >
                    Confirm &amp; Create Pillars
                  </button>
                </div>
              )}

              {/* Creating step */}
              {modalStep === "creating" && (
                <div style={{ padding: "40px 0" }}>
                  <CubeLoader label="Creating pillars and clusters..." sublabel="Setting up your content pipeline" />
                </div>
              )}

              {/* Done step */}
              {modalStep === "done" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "#dcfce7" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>Content Plan Created!</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
                    Your pillars and clusters are ready. Go to Pillars to start generating articles.
                  </p>
                  <button
                    onClick={() => router.push(`/domain/${domainId}/pillars`)}
                    className="btn-primary cursor-pointer"
                    style={{ padding: "12px 32px", fontSize: 14, fontWeight: 600, borderRadius: 12 }}
                  >
                    Go to Pillars →
                  </button>
                </div>
              )}

              {/* Error display */}
              {modalError && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: 13 }}>
                  {modalError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
