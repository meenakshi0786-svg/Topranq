"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface AnalyticsData {
  rankings: Array<{ query: string; position: number; clicks: number; impressions: number; ctr: number; page: string }>;
  trafficByPage: Array<{ url: string; clicks: number; impressions: number; position: number }>;
  articleROI: Array<{ title: string; slug: string; status: string; clicks: number; impressions: number; position: number; createdAt: string }>;
  trends: { totalClicks: number; totalImpressions: number; avgPosition: number; avgCtr: number; pagesRanking: number; queriesTracked: number };
}

export default function AnalyticsPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rankings" | "traffic" | "roi">("rankings");
  const [sortField, setSortField] = useState<string>("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}/analytics`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [domainId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const sortIcon = (field: string) => sortField === field ? (sortDir === "desc" ? " \u2193" : " \u2191") : "";

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Analytics</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Analytics</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Rankings, traffic, and content ROI from Search Console data</p>

        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : !data ? (
          <div className="card-static p-16 text-center fade-in">
            <p className="text-base font-semibold mb-1">No analytics data</p>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Connect Search Console and fetch data first.</p>
            <Link href={`/domain/${domainId}/search-console`} className="btn-primary inline-block px-5 py-2 text-sm">
              Go to Search Console
            </Link>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 fade-in">
              <MetricCard label="Total Clicks" value={data.trends.totalClicks.toLocaleString()} color="var(--accent)" />
              <MetricCard label="Impressions" value={data.trends.totalImpressions.toLocaleString()} color="#7C5CFC" />
              <MetricCard label="Avg Position" value={data.trends.avgPosition.toFixed(1)} color="#E5890A" />
              <MetricCard label="Avg CTR" value={`${data.trends.avgCtr.toFixed(1)}%`} color="var(--success)" />
              <MetricCard label="Ranking Pages" value={data.trends.pagesRanking.toString()} color="var(--accent)" />
              <MetricCard label="Queries" value={data.trends.queriesTracked.toString()} color="#7C5CFC" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--border-light)" }}>
              {([
                { key: "rankings" as const, label: "Rankings" },
                { key: "traffic" as const, label: "Traffic by Page" },
                { key: "roi" as const, label: "Content ROI" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{
                    background: activeTab === tab.key ? "var(--bg-white)" : "transparent",
                    color: activeTab === tab.key ? "var(--text)" : "var(--text-muted)",
                    boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "rankings" && (
              <div className="card-static overflow-hidden fade-in">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                      <th className="text-left text-xs font-bold uppercase tracking-wider px-5 py-3 cursor-pointer" style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("query")}>Query{sortIcon("query")}</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 cursor-pointer" style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("position")}>Pos{sortIcon("position")}</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 cursor-pointer" style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("clicks")}>Clicks{sortIcon("clicks")}</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 cursor-pointer hidden md:table-cell" style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("impressions")}>Impr{sortIcon("impressions")}</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 cursor-pointer hidden md:table-cell" style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("ctr")}>CTR{sortIcon("ctr")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortArray(data.rankings, sortField, sortDir).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td className="px-5 py-3 text-sm">{r.query}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums">
                          <PositionBadge position={r.position} />
                        </td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums font-medium">{r.clicks}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums hidden md:table-cell" style={{ color: "var(--text-muted)" }}>{r.impressions}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums hidden md:table-cell" style={{ color: "var(--text-muted)" }}>{r.ctr.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rankings.length === 0 && (
                  <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No ranking data available</div>
                )}
              </div>
            )}

            {activeTab === "traffic" && (
              <div className="card-static overflow-hidden fade-in">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                      <th className="text-left text-xs font-bold uppercase tracking-wider px-5 py-3" style={{ color: "var(--text-muted)" }}>Page</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 cursor-pointer" style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("clicks")}>Clicks{sortIcon("clicks")}</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Impressions</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider px-5 py-3 hidden md:table-cell" style={{ color: "var(--text-muted)" }}>Avg Pos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortArray(data.trafficByPage, sortField, sortDir).map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td className="px-5 py-3 text-sm truncate max-w-[300px] font-mono" style={{ fontSize: "12px" }}>{p.url}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums font-medium">{p.clicks}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums hidden md:table-cell" style={{ color: "var(--text-muted)" }}>{p.impressions}</td>
                        <td className="px-5 py-3 text-sm text-right tabular-nums hidden md:table-cell">
                          <PositionBadge position={p.position} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.trafficByPage.length === 0 && (
                  <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No traffic data available</div>
                )}
              </div>
            )}

            {activeTab === "roi" && (
              <div className="space-y-3 fade-in">
                {data.articleROI.length === 0 ? (
                  <div className="card-static p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No articles with search data yet. Publish articles and wait for Search Console data.
                  </div>
                ) : data.articleROI.map((a, i) => (
                  <div key={i} className="card-static p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{a.title}</p>
                        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>/{a.slug}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded capitalize" style={{
                        background: a.status === "published" ? "var(--low-bg)" : "var(--medium-bg)",
                        color: a.status === "published" ? "var(--success)" : "var(--medium)",
                      }}>{a.status}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Clicks</p>
                        <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{a.clicks}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Impressions</p>
                        <p className="text-sm font-bold" style={{ color: "#7C5CFC" }}>{a.impressions}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Position</p>
                        <p className="text-sm font-bold"><PositionBadge position={a.position} /></p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Published</p>
                        <p className="text-sm font-medium">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-static p-4 text-center">
      <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  const color = position <= 3 ? "var(--success)" : position <= 10 ? "var(--accent)" : position <= 20 ? "var(--high)" : "var(--text-muted)";
  return <span className="font-bold tabular-nums" style={{ color }}>{position.toFixed(1)}</span>;
}

function sortArray<T extends Record<string, unknown>>(arr: T[], field: string, dir: "asc" | "desc"): T[] {
  return [...arr].sort((a, b) => {
    const av = a[field] as number | string;
    const bv = b[field] as number | string;
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}
