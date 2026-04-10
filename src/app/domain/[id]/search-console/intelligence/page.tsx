"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

// ── Types ─────────────────────────────────────────────────────────────

interface KeywordItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  insight: string;
  action: string;
  suggestedTitle?: string;
  intent?: string;
  pages?: string[];
}

interface PageItem {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issue?: string;
  fix?: string;
  role?: string;
  queryCount?: number;
}

interface PriorityTask {
  rank: number;
  action: string;
  impact: string;
  effort: string;
  agent: string;
}

interface IntelligenceData {
  hasData: boolean;
  error?: string;
  summary?: { totalQueries: number; totalPages: number; totalClicks: number; totalImpressions: number };
  keywordInsights?: {
    highOpportunity: KeywordItem[];
    quickWins: KeywordItem[];
    contentGaps: KeywordItem[];
    highIntent: KeywordItem[];
    informational: KeywordItem[];
  };
  pagePerformance?: {
    underperforming: PageItem[];
    almostRanking: PageItem[];
    highTraffic: PageItem[];
    weakPages: PageItem[];
  };
  strategy?: {
    contentPlan: {
      newTopics: Array<{ topic: string; targetKeyword: string; impressions: number; reason: string; priority: string }>;
      optimizeExisting: Array<{ page: string; currentCTR: string; impressions: number; reason: string; suggestion: string }>;
      keywordClusters: Array<{ cluster: string; keywords: string[]; totalImpressions: number }>;
    };
    linkingPlan: {
      needMoreLinks: Array<{ page: string; position: string; reason: string }>;
      authorityPages: Array<{ page: string; clicks: number; reason: string }>;
      suggestions: Array<{ from: string; to: string; anchorText: string; reason: string }>;
    };
    monetizationPlan: {
      pagesToMonetize: Array<{ page: string; traffic: number; queries: number; strategy: string; reason: string }>;
      commercialKeywords: Array<{ keyword: string; impressions: number; position: string; placementType: string }>;
    };
  };
  priorityTasks?: PriorityTask[];
}

// ── Component ─────────────────────────────────────────────────────────

export default function GSCIntelligencePage() {
  const params = useParams();
  const domainId = params.id as string;

  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"priority" | "keywords" | "pages" | "content" | "linking" | "monetization">("priority");

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${domainId}/gsc-intelligence`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [domainId]);

  useEffect(() => { fetchIntelligence(); }, [fetchIntelligence]);

  const agentColors: Record<string, { bg: string; text: string }> = {
    "Blog Writer": { bg: "#4F6EF715", text: "#4F6EF7" },
    "Internal Linker": { bg: "#7C5CFC15", text: "#7C5CFC" },
    "Product Infuser": { bg: "#E5890A15", text: "#E5890A" },
  };

  const impactColors: Record<string, { bg: string; text: string }> = {
    High: { bg: "#fef2f2", text: "#dc2626" },
    Medium: { bg: "#fffbeb", text: "#d97706" },
    Low: { bg: "#ecfdf5", text: "#16a34a" },
  };

  const sections = [
    { id: "priority" as const, label: "Priority Tasks", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { id: "keywords" as const, label: "Keyword Insights", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { id: "pages" as const, label: "Page Analysis", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "content" as const, label: "Content Plan", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { id: "linking" as const, label: "Linking Plan", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" },
    { id: "monetization" as const, label: "Monetization", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  function pathname(url: string): string {
    try { return new URL(url).pathname; } catch { return url; }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}/search-console`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Search Console</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-bold">SEO Intelligence</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Hero */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">SEO Intelligence Engine</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              AI-powered analysis of your Google Search Console data. Actionable insights for your Blog Writer, Internal Linker, and Product Infuser agents.
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card-static p-16 text-center">
            <svg className="animate-spin mx-auto mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Analyzing your GSC data...</p>
          </div>
        )}

        {/* No data */}
        {!loading && (!data?.hasData) && (
          <div className="card-static p-12 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" className="mx-auto mb-4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <h3 className="text-base font-bold mb-2">No GSC Data Available</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
              {data?.error || "Connect Google Search Console and fetch data first, then come back for AI-powered insights."}
            </p>
            <Link
              href={`/domain/${domainId}/search-console`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Go to Search Console
            </Link>
          </div>
        )}

        {/* Data loaded */}
        {!loading && data?.hasData && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Keywords Analyzed", value: data.summary?.totalQueries || 0, color: "#4F6EF7" },
                { label: "Pages Analyzed", value: data.summary?.totalPages || 0, color: "#7C5CFC" },
                { label: "Total Clicks", value: data.summary?.totalClicks || 0, color: "#22c55e" },
                { label: "Total Impressions", value: (data.summary?.totalImpressions || 0).toLocaleString(), color: "#E5890A" },
              ].map((s) => (
                <div key={s.label} className="card-static p-4 text-center">
                  <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    background: activeSection === s.id ? "var(--accent)" : "transparent",
                    color: activeSection === s.id ? "white" : "var(--text-muted)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
                  {s.label}
                </button>
              ))}
            </div>

            {/* ═══ PRIORITY TASKS ═══ */}
            {activeSection === "priority" && data.priorityTasks && (
              <div className="space-y-3">
                <h2 className="text-base font-bold mb-1">Top 10 Actions by Impact</h2>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  These are the highest-impact actions you can take right now, ranked by potential traffic gain.
                </p>
                {data.priorityTasks.map((task) => {
                  const ac = agentColors[task.agent] || agentColors["Blog Writer"];
                  const ic = impactColors[task.impact] || impactColors.Medium;
                  return (
                    <div key={task.rank} className="card-static p-4 fade-in" style={{ animationDelay: `${task.rank * 0.03}s` }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--accent)" }}>
                          {task.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-2">{task.action}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: ac.bg, color: ac.text }}>{task.agent}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: ic.bg, color: ic.text }}>Impact: {task.impact}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>Effort: {task.effort}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══ KEYWORD INSIGHTS ═══ */}
            {activeSection === "keywords" && data.keywordInsights && (
              <div className="space-y-6">
                {/* Quick Wins */}
                <Section title="Quick Wins" subtitle="Keywords ranking 4-10 — small improvements can push to top 3" color="#22c55e" items={data.keywordInsights.quickWins} renderItem={(q, i) => (
                  <KeywordCard key={i} q={q} />
                )} />

                {/* High Opportunity */}
                <Section title="High Opportunity" subtitle="High impressions but low CTR — massive traffic potential" color="#dc2626" items={data.keywordInsights.highOpportunity} renderItem={(q, i) => (
                  <KeywordCard key={i} q={q} />
                )} />

                {/* Content Gaps */}
                <Section title="Content Gaps" subtitle="Queries getting impressions but no dedicated page exists" color="#7C5CFC" items={data.keywordInsights.contentGaps} renderItem={(q, i) => (
                  <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-bold">{q.query}</p>
                      <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>{q.impressions} imp</span>
                    </div>
                    {q.suggestedTitle && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Suggested title:</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "#7C5CFC10", color: "#7C5CFC" }}>{q.suggestedTitle}</span>
                      </div>
                    )}
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{q.action}</p>
                  </div>
                )} />

                {/* High Intent */}
                <Section title="Commercial Intent" subtitle="Users ready to buy — great for product placement" color="#E5890A" items={data.keywordInsights.highIntent} renderItem={(q, i) => (
                  <KeywordCard key={i} q={q} />
                )} />

                {/* Informational */}
                <Section title="Informational Queries" subtitle="Users looking to learn — build authority with guides" color="#3b82f6" items={data.keywordInsights.informational} renderItem={(q, i) => (
                  <KeywordCard key={i} q={q} />
                )} />
              </div>
            )}

            {/* ═══ PAGE ANALYSIS ═══ */}
            {activeSection === "pages" && data.pagePerformance && (
              <div className="space-y-6">
                <Section title="High Traffic Pages" subtitle="Your strongest pages — use these to pass authority" color="#22c55e" items={data.pagePerformance.highTraffic} renderItem={(p, i) => (
                  <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{pathname(p.page)}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.role}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold tabular-nums" style={{ color: "#22c55e" }}>{p.clicks} clicks</span>
                        <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{p.impressions} imp</span>
                      </div>
                    </div>
                  </div>
                )} />

                <Section title="Underperforming Pages" subtitle="High impressions but low CTR — fix titles and descriptions" color="#dc2626" items={data.pagePerformance.underperforming} renderItem={(p, i) => (
                  <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <p className="text-sm font-medium truncate mb-1">{pathname(p.page)}</p>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-bold" style={{ color: "#dc2626" }}>{(p.ctr * 100).toFixed(1)}% CTR</span>
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{p.impressions} impressions</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.fix}</p>
                  </div>
                )} />

                <Section title="Almost Ranking (Page 1 Candidates)" subtitle="Position 5-15 — small push can move to page 1" color="#d97706" items={data.pagePerformance.almostRanking} renderItem={(p, i) => (
                  <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-sm font-medium truncate">{pathname(p.page)}</p>
                      <PositionBadge position={p.position} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.fix}</p>
                  </div>
                )} />

                <Section title="Weak Pages" subtitle="Low visibility — needs content or link improvement" color="#9ca3af" items={data.pagePerformance.weakPages} renderItem={(p, i) => (
                  <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <p className="text-sm font-medium truncate mb-1">{pathname(p.page)}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.fix}</p>
                  </div>
                )} />
              </div>
            )}

            {/* ═══ CONTENT PLAN ═══ */}
            {activeSection === "content" && data.strategy?.contentPlan && (
              <div className="space-y-6">
                {/* New topics */}
                <div>
                  <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: "#4F6EF7" }} />
                    New Blog Topics
                  </h3>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Based on content gaps — keywords getting impressions with no dedicated page</p>
                  <div className="space-y-2">
                    {data.strategy.contentPlan.newTopics.map((t, i) => {
                      const pc = impactColors[t.priority.charAt(0).toUpperCase() + t.priority.slice(1)] || impactColors.Medium;
                      return (
                        <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-bold">{t.topic}</p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md capitalize shrink-0" style={{ background: pc.bg, color: pc.text }}>{t.priority}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Target:</span>
                            <code className="text-xs px-2 py-0.5 rounded-md" style={{ background: "#4F6EF710", color: "#4F6EF7" }}>{t.targetKeyword}</code>
                            <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{t.impressions} impressions</span>
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optimize existing */}
                {data.strategy.contentPlan.optimizeExisting.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#E5890A" }} />
                      Pages to Optimize
                    </h3>
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Existing pages with high impressions but low engagement</p>
                    <div className="space-y-2">
                      {data.strategy.contentPlan.optimizeExisting.map((p, i) => (
                        <div key={i} className="card-static p-4 fade-in">
                          <p className="text-sm font-medium truncate mb-1">{pathname(p.page)}</p>
                          <div className="flex items-center gap-3 mb-1.5 text-xs">
                            <span style={{ color: "#dc2626" }}>CTR: {p.currentCTR}</span>
                            <span style={{ color: "var(--text-muted)" }}>{p.impressions} impressions</span>
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyword clusters */}
                {data.strategy.contentPlan.keywordClusters.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#7C5CFC" }} />
                      Keyword Clusters
                    </h3>
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Group related keywords to build topical authority</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.strategy.contentPlan.keywordClusters.map((c, i) => (
                        <div key={i} className="card-static p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold capitalize">{c.cluster}</p>
                            <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{c.totalImpressions} imp</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.keywords.map((kw, j) => (
                              <span key={j} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ LINKING PLAN ═══ */}
            {activeSection === "linking" && data.strategy?.linkingPlan && (
              <div className="space-y-6">
                {/* Link suggestions */}
                {data.strategy.linkingPlan.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: "#7C5CFC" }} />
                      Link Suggestions
                    </h3>
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Pass authority from strong pages to pages that need a boost</p>
                    <div className="space-y-2">
                      {data.strategy.linkingPlan.suggestions.map((s, i) => (
                        <div key={i} className="card-static p-4 fade-in">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>{pathname(s.from)}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" className="shrink-0"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            <span className="text-xs font-medium truncate" style={{ color: "#7C5CFC" }}>{pathname(s.to)}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Anchor:</span>
                            <code className="text-xs px-2 py-0.5 rounded-md" style={{ background: "#7C5CFC10", color: "#7C5CFC" }}>&ldquo;{s.anchorText}&rdquo;</code>
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pages needing links */}
                <Section title="Pages That Need More Links" subtitle="Boost these pages by adding internal links to them" color="#d97706" items={data.strategy.linkingPlan.needMoreLinks} renderItem={(p, i) => (
                  <div key={i} className="card-static p-4 fade-in">
                    <p className="text-sm font-medium truncate mb-1">{pathname(p.page)}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.reason}</p>
                  </div>
                )} />

                {/* Authority pages */}
                <Section title="Authority Pages (Link FROM)" subtitle="These pages have the most traffic — link from them to boost weaker pages" color="#22c55e" items={data.strategy.linkingPlan.authorityPages} renderItem={(p, i) => (
                  <div key={i} className="card-static p-4 fade-in flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pathname(p.page)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.reason}</p>
                    </div>
                    <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "#22c55e" }}>{p.clicks} clicks</span>
                  </div>
                )} />
              </div>
            )}

            {/* ═══ MONETIZATION ═══ */}
            {activeSection === "monetization" && data.strategy?.monetizationPlan && (
              <div className="space-y-6">
                <Section title="Pages to Monetize" subtitle="High-traffic pages where product mentions would be natural" color="#E5890A" items={data.strategy.monetizationPlan.pagesToMonetize} renderItem={(p, i) => {
                  const stratLabels: Record<string, string> = { "soft-mention": "Soft Mention", "comparison-table": "Comparison Table", "listicle-with-products": "Product Listicle", "soft-cta": "Soft CTA" };
                  return (
                    <div key={i} className="card-static p-4 fade-in">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-medium truncate">{pathname(p.page)}</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0" style={{ background: "#E5890A15", color: "#E5890A" }}>{stratLabels[p.strategy] || p.strategy}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        <span>{p.traffic} clicks</span>
                        <span>{p.queries} keywords</span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.reason}</p>
                    </div>
                  );
                }} />

                <Section title="Commercial Keywords" subtitle="Keywords with buying intent — ideal for product placement" color="#d97706" items={data.strategy.monetizationPlan.commercialKeywords} renderItem={(kw, i) => {
                  const typeLabels: Record<string, string> = { "comparison-table": "Comparison", "listicle-with-products": "Product List", "soft-cta": "Soft CTA" };
                  return (
                    <div key={i} className="card-static p-4 fade-in flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{kw.keyword}</p>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{kw.impressions} impressions · Position {kw.position}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>{typeLabels[kw.placementType] || kw.placementType}</span>
                    </div>
                  );
                }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Reusable components ──────────────────────────────────────────────

function Section<T>({ title, subtitle, color, items, renderItem }: {
  title: string;
  subtitle: string;
  color: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-bold mb-0.5 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {title}
        <span className="text-xs font-normal px-1.5 py-0.5 rounded-md tabular-nums" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>{items.length}</span>
      </h3>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
      <div className="space-y-2">{items.map(renderItem)}</div>
    </div>
  );
}

function KeywordCard({ q }: { q: KeywordItem }) {
  return (
    <div className="card-static p-4 fade-in">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p className="text-sm font-bold">{q.query}</p>
        <PositionBadge position={q.position} />
      </div>
      <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{q.clicks} clicks</span>
        <span>{q.impressions} impressions</span>
        <span>{(q.ctr * 100).toFixed(1)}% CTR</span>
      </div>
      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{q.insight}</p>
      <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>{q.action}</p>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  const color = position <= 3 ? "#22c55e" : position <= 10 ? "#4F6EF7" : position <= 20 ? "#d97706" : "#9ca3af";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums shrink-0" style={{ background: color + "15", color }}>
      #{position.toFixed(1)}
    </span>
  );
}
