"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface GSCData {
  connected: boolean;
  sites?: string[];
  connectedAt?: string;
  period?: { startDate: string; endDate: string; days: number };
  summary?: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
    totalQueries: number;
    totalPages: number;
  };
  topQueries?: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages?: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    queries: number;
  }>;
  quickWins?: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  message?: string;
  error?: string;
}

export default function SearchConsolePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domainId = params.id as string;

  const [gscData, setGscData] = useState<GSCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"queries" | "pages" | "quickwins">("queries");
  const [days, setDays] = useState(28);

  const justConnected = searchParams.get("connected") === "true";
  const authError = searchParams.get("error");

  const checkConnection = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}/gsc?action=status`);
    if (res.ok) {
      const data = await res.json();
      setGscData(data);
      if (data.sites?.length > 0 && !selectedSite) {
        setSelectedSite(data.sites[0]);
      }
    }
    setLoading(false);
  }, [domainId, selectedSite]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const connectGSC = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`/api/gsc/auth?domainId=${domainId}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start OAuth flow");
        setConnecting(false);
      }
    } catch {
      alert("Failed to connect. Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env");
      setConnecting(false);
    }
  };

  const fetchData = async () => {
    if (!selectedSite) return;
    setFetching(true);
    try {
      const res = await fetch(
        `/api/domains/${domainId}/gsc?action=fetch&siteUrl=${encodeURIComponent(selectedSite)}&days=${days}`
      );
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setGscData(data);
      }
    } catch {
      alert("Failed to fetch data from Google Search Console");
    }
    setFetching(false);
  };

  const disconnectGSC = async () => {
    if (!confirm("Disconnect Google Search Console?")) return;
    await fetch(`/api/domains/${domainId}/gsc`, { method: "DELETE" });
    setGscData({ connected: false });
    setSelectedSite("");
  };

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Search Console</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* Status messages */}
        {justConnected && (
          <div className="p-4 rounded-xl mb-6 fade-in" style={{ background: "var(--low-bg)", border: "1px solid var(--success)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
              Google Search Console connected successfully! Select a property and fetch data below.
            </p>
          </div>
        )}
        {authError && (
          <div className="p-4 rounded-xl mb-6 fade-in" style={{ background: "var(--critical-bg)", border: "1px solid var(--critical)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--critical)" }}>
              {authError === "denied" ? "You denied access to Google Search Console." :
               authError === "no_refresh_token" ? "Failed to get refresh token. Please try connecting again." :
               "Authentication failed. Please try again."}
            </p>
          </div>
        )}

        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : !gscData?.connected ? (
          /* Not connected — show connect card */
          <div className="card-static p-10 text-center fade-in max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: "#4285F415" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Connect Google Search Console</h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              See real search performance data — clicks, impressions, CTR, and average position for your queries and pages. Find quick-win keywords ranking on page 2 that are close to breaking through.
            </p>
            <button
              onClick={connectGSC}
              disabled={connecting}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer inline-flex items-center gap-2"
              style={{ background: "#4285F4" }}
            >
              {connecting ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
                  Connect with Google
                </>
              )}
            </button>
            <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
              Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.
              <br />Read-only access — we never modify your Search Console data.
            </p>
          </div>
        ) : (
          /* Connected — show data */
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Search Console</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Real search performance data from Google
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={disconnectGSC}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Site selector + fetch controls */}
            <div className="card-static p-5 mb-6 flex items-center gap-4 flex-wrap fade-in">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Property</label>
                {gscData.sites && gscData.sites.length > 0 ? (
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                  >
                    {gscData.sites.map((site) => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    placeholder="https://example.com/ or sc-domain:example.com"
                    className="px-3 py-1.5 rounded-lg text-sm min-w-[300px]"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Period</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={28}>Last 28 days</option>
                  <option value={90}>Last 3 months</option>
                </select>
              </div>
              <button
                onClick={fetchData}
                disabled={fetching || !selectedSite}
                className="btn-primary px-5 py-1.5 text-sm cursor-pointer"
              >
                {fetching ? "Fetching..." : "Fetch Data"}
              </button>
            </div>

            {/* Summary cards */}
            {gscData.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-in">
                <MetricCard label="Total Clicks" value={gscData.summary.totalClicks.toLocaleString()} color="var(--accent)" />
                <MetricCard label="Impressions" value={gscData.summary.totalImpressions.toLocaleString()} color="#7C5CFC" />
                <MetricCard label="Avg CTR" value={`${gscData.summary.avgCtr}%`} color="var(--success)" />
                <MetricCard label="Avg Position" value={gscData.summary.avgPosition.toString()} color="#E5890A" />
              </div>
            )}

            {/* Data tabs */}
            {gscData.topQueries && (
              <>
                <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "var(--border-light)" }}>
                  {([
                    { id: "queries" as const, label: `Queries (${gscData.topQueries?.length || 0})` },
                    { id: "pages" as const, label: `Pages (${gscData.topPages?.length || 0})` },
                    { id: "quickwins" as const, label: `Quick Wins (${gscData.quickWins?.length || 0})` },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                      style={{
                        background: activeTab === tab.id ? "var(--bg-white)" : "transparent",
                        color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                        boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Queries tab */}
                {activeTab === "queries" && (
                  <div className="card-static overflow-hidden fade-in">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
                      <div className="col-span-5">Query</div>
                      <div className="col-span-2 text-right">Clicks</div>
                      <div className="col-span-2 text-right">Impressions</div>
                      <div className="col-span-1 text-right">CTR</div>
                      <div className="col-span-2 text-right">Position</div>
                    </div>
                    {gscData.topQueries?.map((q, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b text-sm" style={{ borderColor: "var(--border-light)" }}>
                        <div className="col-span-5 truncate font-medium">{q.query}</div>
                        <div className="col-span-2 text-right tabular-nums font-semibold" style={{ color: "var(--accent)" }}>{q.clicks}</div>
                        <div className="col-span-2 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{q.impressions.toLocaleString()}</div>
                        <div className="col-span-1 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{(q.ctr * 100).toFixed(1)}%</div>
                        <div className="col-span-2 text-right">
                          <PositionBadge position={q.position} />
                        </div>
                      </div>
                    ))}
                    {(!gscData.topQueries || gscData.topQueries.length === 0) && (
                      <div className="p-12 text-center">
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No query data yet. Click "Fetch Data" to pull from Google.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pages tab */}
                {activeTab === "pages" && (
                  <div className="card-static overflow-hidden fade-in">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
                      <div className="col-span-5">Page</div>
                      <div className="col-span-2 text-right">Clicks</div>
                      <div className="col-span-2 text-right">Impressions</div>
                      <div className="col-span-1 text-right">CTR</div>
                      <div className="col-span-2 text-right">Position</div>
                    </div>
                    {gscData.topPages?.map((p, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b text-sm" style={{ borderColor: "var(--border-light)" }}>
                        <div className="col-span-5 truncate" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {new URL(p.page).pathname}
                        </div>
                        <div className="col-span-2 text-right tabular-nums font-semibold" style={{ color: "var(--accent)" }}>{p.clicks}</div>
                        <div className="col-span-2 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{p.impressions.toLocaleString()}</div>
                        <div className="col-span-1 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{(p.ctr * 100).toFixed(1)}%</div>
                        <div className="col-span-2 text-right">
                          <PositionBadge position={p.position} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Wins tab */}
                {activeTab === "quickwins" && (
                  <div className="fade-in">
                    <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                      Keywords ranking between positions 4-20 with decent impressions — these are close to page 1 and worth optimizing for.
                    </p>
                    <div className="space-y-2">
                      {gscData.quickWins?.map((q, i) => (
                        <div key={i} className="card-static p-4" style={{ animationDelay: `${i * 0.02}s` }}>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold mb-0.5">{q.query}</p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {q.clicks} clicks · {q.impressions.toLocaleString()} impressions · {(q.ctr * 100).toFixed(1)}% CTR
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <PositionBadge position={q.position} size="lg" />
                              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                {q.position <= 10 ? "Page 1!" : `Page ${Math.ceil(q.position / 10)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!gscData.quickWins || gscData.quickWins.length === 0) && (
                        <div className="card-static p-12 text-center">
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No quick wins found in current data.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No data yet prompt */}
            {!gscData.topQueries && gscData.connected && (
              <div className="card-static p-12 text-center fade-in">
                <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: "#4285F415" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <p className="text-base font-semibold mb-1">Connected — ready to fetch data</p>
                <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
                  Select your Search Console property above and click &quot;Fetch Data&quot; to pull your search performance metrics.
                </p>
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
    <div className="card-static p-5 text-center">
      <p className="text-2xl font-bold tracking-tight tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function PositionBadge({ position, size = "sm" }: { position: number; size?: "sm" | "lg" }) {
  const rounded = Math.round(position * 10) / 10;
  const color = position <= 3 ? "var(--success)" : position <= 10 ? "var(--accent)" : position <= 20 ? "var(--high)" : "var(--text-muted)";
  const bg = position <= 3 ? "var(--low-bg)" : position <= 10 ? "var(--accent-light)" : position <= 20 ? "var(--high-bg)" : "var(--border-light)";

  return (
    <span
      className={`font-bold tabular-nums rounded-md ${size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5"}`}
      style={{ background: bg, color }}
    >
      #{rounded}
    </span>
  );
}
