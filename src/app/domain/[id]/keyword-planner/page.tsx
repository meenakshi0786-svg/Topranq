"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CubeLoader } from "@/components/cube-loader";
import { usePageTitle } from "@/components/page-title";

interface Cluster {
  clusterName: string;
  priorityScore: number;
  intent: string;
  keywords: string[];
  articleTitle: string;
  wordCount: number;
  contentAngle: string;
  internalLinks: { pillar: string; relatedClusters: string[] };
}

interface Pillar {
  pillarName: string;
  clusters: Cluster[];
}

interface QuickWin {
  keyword: string;
  reason: string;
}

interface KeywordPlan {
  summary: { totalMissingKeywords: number; totalClusters: number; topOpportunity: string };
  pillars: Pillar[];
  quickWins: QuickWin[];
}

export default function KeywordPlannerPage() {
  const params = useParams();
  const domainId = params.id as string;
  usePageTitle("Magic Keyword Planner");

  const [plan, setPlan] = useState<KeywordPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch(`/api/domains/${domainId}/keyword-plan`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate plan"); return; }
      setPlan(data);
    } catch {
      setError("Failed to generate keyword plan");
    } finally {
      setLoading(false);
    }
  }

  const priorityColor = (score: number) =>
    score >= 80 ? { bg: "#dcfce7", color: "#166534", label: "High" } :
    score >= 50 ? { bg: "#fef9c3", color: "#854d0e", label: "Medium" } :
    { bg: "#fee2e2", color: "#991b1b", label: "Low" };

  const intentColor = (intent: string) =>
    intent === "transactional" ? "#ef4444" :
    intent === "commercial" ? "#f97316" :
    intent === "informational" ? "#4F6EF7" : "#6b7280";

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
        {/* Hero heading */}
        <div className="mb-8">
          <div className="fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: "linear-gradient(135deg, #4F6EF715, #7C5CFC15)", color: "var(--accent)", border: "1px solid #4F6EF730" }}>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "#22c55e" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22c55e" }} />
              </span>
              Magic Keyword Planner
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
              Keyword Gap &amp;{" "}
              <span style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Content Strategy
              </span>
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 500 }}>
              Analyze your domain vs competitors. Find missing keywords, cluster them into pillars, and get a complete content strategy.
            </p>
          </div>
        </div>

        {/* Feature cards with hover animations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", color: "#ef4444", title: "Find Keyword Gaps", desc: "Discovers keywords your competitors rank for but you don't — plus untapped topic clusters you're missing entirely." },
            { icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", color: "#4F6EF7", title: "Build Content Strategy", desc: "Groups keywords into pillar-cluster strategies with prioritized article titles, word counts, and content angles." },
            { icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#22c55e", title: "Spot Quick Wins", desc: "Identifies low-competition keywords where you can rank fast — perfect for first articles that drive traffic quickly." },
          ].map((item, i) => (
            <div
              key={item.title}
              className="card-static p-5 fade-in"
              style={{
                animationDelay: `${i * 0.1}s`,
                transition: "transform 0.3s, box-shadow 0.3s",
                cursor: "default",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 8px 25px ${item.color}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-xs)"; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${item.color}12` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* How to use — step flow */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap text-[11px]" style={{ color: "var(--text-muted)" }}>
          {["Generate Plan", "Review Pillars", "Create Content", "Auto-Link", "Publish"].map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "var(--accent)", color: "#fff" }}>{i + 1}</span>
                {step}
              </span>
              {i < 4 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>}
            </span>
          ))}
        </div>

        {!plan && !loading && (
          <div className="relative card-static p-10 text-center fade-in overflow-hidden" style={{ background: "linear-gradient(135deg, #4F6EF705, #7C5CFC05)", border: "1px solid #4F6EF720" }}>
            {/* Floating keyword bubbles — edges only, not overlapping center text */}
            {["SEO", "keywords", "ranking", "traffic", "content", "pillar", "cluster", "SERP", "backlinks", "authority", "gaps", "strategy"].map((word, i) => (
              <span
                key={word}
                className="absolute text-[10px] font-medium rounded-full float-orb pointer-events-none"
                style={{
                  left: i % 2 === 0 ? `${3 + (i * 3) % 15}%` : `${82 + (i * 3) % 15}%`,
                  top: `${10 + (i * 13) % 75}%`,
                  padding: "3px 9px",
                  background: i % 3 === 0 ? "#4F6EF708" : i % 3 === 1 ? "#7C5CFC08" : "#22c55e08",
                  color: i % 3 === 0 ? "#4F6EF750" : i % 3 === 1 ? "#7C5CFC50" : "#22c55e50",
                  border: `1px solid ${i % 3 === 0 ? "#4F6EF715" : i % 3 === 1 ? "#7C5CFC15" : "#22c55e15"}`,
                  animationDelay: `${i * 0.7}s`,
                  animationDuration: `${7 + i * 1.2}s`,
                  zIndex: 0,
                }}
              >
                {word}
              </span>
            ))}

            <div className="relative" style={{ zIndex: 1 }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 glow-pulse" style={{ background: "linear-gradient(135deg, #4F6EF720, #7C5CFC20)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  <path d="M10 7v6m3-3H7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Ready to find your keyword opportunities?</h2>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                We&apos;ll analyze your GSC data, crawled pages, and competitor SERPs to build a prioritized content strategy.
              </p>
              <button
                onClick={generate}
                className="btn-primary cursor-pointer"
                style={{
                  padding: "16px 48px",
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 14,
                  boxShadow: "0 4px 15px rgba(79, 110, 247, 0.3)",
                  transition: "all 0.3s",
                  position: "relative",
                  zIndex: 2,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(79, 110, 247, 0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 110, 247, 0.3)"; }}
              >
                Generate Keyword Plan
              </button>
            </div>
            {error && <p className="text-xs mt-4" style={{ color: "var(--critical)" }}>{error}</p>}
          </div>
        )}

        {loading && (
          <div className="card-static p-12 fade-in">
            <CubeLoader label="Analyzing keyword gaps..." sublabel="Fetching competitor SERPs, clustering keywords, and building your content strategy" />
          </div>
        )}

        {plan && (
          <div className="fade-in">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card-static p-5 text-center">
                <p className="text-3xl font-bold mb-1" style={{ color: "var(--critical)" }}>{typeof plan.summary.totalMissingKeywords === "number" ? plan.summary.totalMissingKeywords : "50+"}</p>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Missing Keywords</p>
              </div>
              <div className="card-static p-5 text-center">
                <p className="text-3xl font-bold mb-1" style={{ color: "var(--accent)" }}>{plan.summary.totalClusters}</p>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Content Clusters</p>
              </div>
              <div className="card-static p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>#1 Opportunity</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{plan.summary.topOpportunity}</p>
              </div>
            </div>

            {/* Quick Wins */}
            {plan.quickWins.length > 0 && (
              <div className="card-static p-6 mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--success)" }}>
                  ⚡ Quick Wins
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.quickWins.map((qw, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: "var(--low-bg)", border: "1px solid var(--border-light)" }}>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{qw.keyword}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{qw.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pillars */}
            <div className="space-y-4">
              {plan.pillars.map((pillar) => {
                const isOpen = expandedPillar === pillar.pillarName;
                const avgScore = Math.round(pillar.clusters.reduce((s, c) => s + c.priorityScore, 0) / pillar.clusters.length);
                const p = priorityColor(avgScore);
                return (
                  <div key={pillar.pillarName} className="card-static overflow-hidden">
                    <button
                      onClick={() => setExpandedPillar(isOpen ? null : pillar.pillarName)}
                      className="w-full p-5 flex items-center gap-4 text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--accent-light)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{pillar.pillarName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{pillar.clusters.length} clusters · avg priority {avgScore}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: p.bg, color: p.color }}>{p.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--border-light)" }}>
                        <div className="space-y-3 mt-4">
                          {pillar.clusters.map((cluster, i) => {
                            const cp = priorityColor(cluster.priorityScore);
                            return (
                              <div key={i} className="p-4 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div>
                                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{cluster.articleTitle}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: cp.bg, color: cp.color }}>{cluster.priorityScore}</span>
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: intentColor(cluster.intent), background: `${intentColor(cluster.intent)}10` }}>{cluster.intent}</span>
                                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{cluster.wordCount} words</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{cluster.contentAngle}</p>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {cluster.keywords.map((kw, j) => (
                                    <span key={j} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-white)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>{kw}</span>
                                  ))}
                                </div>
                                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                  <span className="font-medium">Links:</span> Pillar: &ldquo;{cluster.internalLinks.pillar}&rdquo;
                                  {cluster.internalLinks.relatedClusters.length > 0 && (
                                    <> · Related: {cluster.internalLinks.relatedClusters.join(", ")}</>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Regenerate */}
            <div className="mt-6 text-center">
              <button onClick={generate} disabled={loading} className="text-sm font-medium px-5 py-2.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Regenerate Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
