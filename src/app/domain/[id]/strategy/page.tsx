"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface Cluster {
  clusterName: string;
  pillarKeyword: string;
  searchVolume: number;
  difficulty: number;
  intentType: string;
  keywords: Array<{ keyword: string; volume: number; difficulty: number }>;
  pagesCovering: number;
}

interface CalendarItem {
  topic: string;
  targetKeywords: string[];
  contentFormat: string;
  targetWordCount: number;
  priorityScore: number;
  reason: string;
}

interface ContentGap {
  gap: string;
  opportunity: string;
  priority: string;
}

interface StrategyData {
  hostname: string;
  niche: string;
  pagesAnalyzed: number;
  articlesCount: number;
  overallScore: number | null;
  clusters: Cluster[];
  calendar: CalendarItem[];
  contentGaps: ContentGap[];
  topPages: Array<{ url: string; title: string; wordCount: number; h1: string }>;
}

export default function StrategyPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"clusters" | "calendar" | "gaps">("clusters");
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/domains/${domainId}/strategy`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || "Failed to load");
        }
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [domainId]);

  const saveStrategy = async () => {
    if (!data) return;
    setSaving(true);
    await fetch(`/api/domains/${domainId}/strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clusters: data.clusters,
        calendar: data.calendar,
      }),
    });
    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Strategy</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Analyzing site data...</p>
          </div>
        ) : error ? (
          <div className="card-static p-16 text-center fade-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--border-light)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-base font-semibold mb-1">{error}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Run an audit first to generate strategy data.</p>
          </div>
        ) : data ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Content Strategy</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {data.niche} · {data.pagesAnalyzed} pages analyzed
                </p>
              </div>
              <button onClick={saveStrategy} disabled={saving} className="btn-primary px-5 py-2 text-sm cursor-pointer">
                {saving ? "Saving..." : "Save Strategy"}
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Keyword Clusters" value={data.clusters.length} />
              <StatCard label="Content Ideas" value={data.calendar.length} />
              <StatCard label="Content Gaps" value={data.contentGaps.length} />
              <StatCard label="Top Pages" value={data.topPages.length} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--border-light)" }}>
              {(["clusters", "calendar", "gaps"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-lg text-sm font-medium capitalize cursor-pointer transition-colors"
                  style={{
                    background: activeTab === tab ? "var(--bg-white)" : "transparent",
                    color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                    boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {tab === "clusters" ? "Keyword Clusters" : tab === "calendar" ? "Content Calendar" : "Content Gaps"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "clusters" && (
              <div className="space-y-3 fade-in">
                {data.clusters.map((cluster, i) => (
                  <div key={i} className="card-static overflow-hidden" style={{ animationDelay: `${i * 0.03}s` }}>
                    <button
                      onClick={() => setExpandedCluster(expandedCluster === cluster.pillarKeyword ? null : cluster.pillarKeyword)}
                      className="w-full p-5 text-left flex items-center gap-4 cursor-pointer hover:bg-[var(--border-light)] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-light)" }}>
                        <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                          {cluster.keywords.length + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{cluster.clusterName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Pillar: {cluster.pillarKeyword} · {cluster.pagesCovering} page{cluster.pagesCovering !== 1 ? "s" : ""} covering this topic
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                            ~{cluster.searchVolume.toLocaleString()}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>volume</p>
                        </div>
                        <DifficultyBadge value={cluster.difficulty} />
                        <IntentBadge intent={cluster.intentType} />
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform duration-200 ${expandedCluster === cluster.pillarKeyword ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>

                    {expandedCluster === cluster.pillarKeyword && (
                      <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--border-light)" }}>
                        <div className="mt-4 space-y-2">
                          {cluster.keywords.map((kw, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg)" }}>
                              <span className="text-sm flex-1">{kw.keyword}</span>
                              <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                                ~{kw.volume.toLocaleString()} vol
                              </span>
                              <DifficultyBadge value={kw.difficulty} size="sm" />
                            </div>
                          ))}
                          {cluster.keywords.length === 0 && (
                            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
                              No related phrases found — this cluster has only the pillar keyword
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {data.clusters.length === 0 && (
                  <div className="card-static p-12 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No keyword clusters detected — your site may need more content.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-3 fade-in">
                {data.calendar.map((item, i) => (
                  <div key={i} className="card-static p-5" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                        style={{ background: item.priorityScore >= 80 ? "var(--accent)" : item.priorityScore >= 60 ? "#E5890A" : "#9AA0B4" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-1">{item.topic}</p>
                        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{item.reason}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <FormatBadge format={item.contentFormat} />
                          <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
                            {item.targetWordCount.toLocaleString()} words
                          </span>
                          {item.targetKeywords.slice(0, 3).map((kw, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Link
                        href={`/domain/${domainId}/agents`}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
                        style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                      >
                        Write
                      </Link>
                    </div>
                  </div>
                ))}
                {data.calendar.length === 0 && (
                  <div className="card-static p-12 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No content suggestions — run an audit to populate this.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "gaps" && (
              <div className="space-y-3 fade-in">
                {data.contentGaps.map((gap, i) => (
                  <div key={i} className="card-static p-5" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-full rounded-full shrink-0 self-stretch" style={{
                        background: gap.priority === "high" ? "var(--critical)" : gap.priority === "medium" ? "var(--high)" : "var(--accent)",
                        minHeight: "40px",
                      }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{gap.gap}</p>
                          <span className="text-xs px-2 py-0.5 rounded-md capitalize font-medium" style={{
                            background: gap.priority === "high" ? "var(--critical-bg)" : gap.priority === "medium" ? "var(--high-bg)" : "var(--accent-light)",
                            color: gap.priority === "high" ? "var(--critical)" : gap.priority === "medium" ? "var(--high)" : "var(--accent)",
                          }}>
                            {gap.priority}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{gap.opportunity}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {data.contentGaps.length === 0 && (
                  <div className="card-static p-12 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No content gaps detected — great coverage!</p>
                  </div>
                )}
              </div>
            )}

            {/* Top pages section */}
            {data.topPages.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                  Strongest Pages
                </h2>
                <div className="card-static overflow-hidden">
                  {data.topPages.map((page, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border-light)" }}>
                      <span className="text-xs font-bold tabular-nums w-6 text-center" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.title}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{page.url}</p>
                      </div>
                      <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--text-secondary)" }}>
                        {page.wordCount.toLocaleString()} words
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-static p-5 text-center fade-in">
      <p className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: "var(--accent)" }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function DifficultyBadge({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color = value >= 70 ? "var(--critical)" : value >= 40 ? "var(--high)" : "var(--success)";
  const bg = value >= 70 ? "var(--critical-bg)" : value >= 40 ? "var(--high-bg)" : "var(--low-bg)";
  return (
    <span className={`font-medium rounded-md tabular-nums ${size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"}`}
      style={{ background: bg, color }}>
      {value}
    </span>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    informational: { bg: "var(--accent-light)", color: "var(--accent)" },
    commercial: { bg: "var(--high-bg)", color: "var(--high)" },
    transactional: { bg: "var(--low-bg)", color: "var(--success)" },
    navigational: { bg: "var(--border-light)", color: "var(--text-secondary)" },
  };
  const s = colors[intent] || colors.informational;
  return (
    <span className="text-xs font-medium px-2 py-1 rounded-md capitalize" style={{ background: s.bg, color: s.color }}>
      {intent}
    </span>
  );
}

function FormatBadge({ format }: { format: string }) {
  const labels: Record<string, string> = {
    pillar: "Pillar Page",
    "how-to": "How-to Guide",
    expansion: "Content Expansion",
    comparison: "Comparison",
    listicle: "Listicle",
  };
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--border-light)", color: "var(--text-secondary)" }}>
      {labels[format] || format}
    </span>
  );
}
