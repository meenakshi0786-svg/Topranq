"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface AhrefsData {
  connected: boolean;
  error?: string;
  domain: string;
  country: string;
  domainRating: { rating: number; rank: number };
  backlinks: { live: number; allTime: number; referringDomains: number; referringDomainsAllTime: number };
  overview: { organicKeywords: number; organicTraffic: number; trafficValue: number };
  topKeywords: Array<{
    keyword: string; volume: number; position: number;
    traffic: number; cpc: number; url: string; keyword_difficulty: number;
  }>;
  topPages: Array<{
    url: string; organic_traffic: number; organic_keywords: number;
    top_keyword: string; top_keyword_volume: number; top_keyword_position: number;
  }>;
  quickWins: Array<{
    keyword: string; volume: number; position: number;
    traffic: number; cpc: number; url: string; keyword_difficulty: number;
  }>;
}

type Tab = "keywords" | "pages" | "quickwins" | "backlinks";

export default function AhrefsPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("us");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AhrefsData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("keywords");

  async function fetchData() {
    if (!domain.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/domains/${domainId}/ahrefs?domain=${encodeURIComponent(domain.trim())}&country=${country}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Failed to fetch data");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href={`/domain/${domainId}`}><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Ahrefs</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Input */}
        <div className="card-static p-7 mb-6 fade-in">
          <h1 className="text-lg font-bold mb-1">Ahrefs Site Explorer</h1>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Pull organic keywords, backlinks, and traffic data from Ahrefs.
          </p>

          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ background: "var(--bg-main)", border: "1px solid var(--border-light)" }}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ background: "var(--bg-main)", border: "1px solid var(--border-light)" }}
              >
                <option value="us">US</option>
                <option value="gb">UK</option>
                <option value="in">India</option>
                <option value="ca">Canada</option>
                <option value="au">Australia</option>
                <option value="de">Germany</option>
                <option value="fr">France</option>
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading || !domain.trim()}
              className="btn-primary px-6 py-2 text-sm cursor-pointer"
              style={{ opacity: loading || !domain.trim() ? 0.5 : 1 }}
            >
              {loading ? "Fetching..." : "Analyze"}
            </button>
          </div>
        </div>

        {error && (
          <div className="card-static p-5 mb-6 fade-in" style={{ borderLeft: "3px solid var(--critical)" }}>
            <p className="text-sm" style={{ color: "var(--critical)" }}>{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 fade-in">
              <MetricCard label="Domain Rating" value={String(data.domainRating.rating)} sub={`Rank #${data.domainRating.rank.toLocaleString()}`} color="var(--accent)" />
              <MetricCard label="Organic Traffic" value={fmtNum(data.overview.organicTraffic)} sub="/month est." color="var(--success)" />
              <MetricCard label="Organic Keywords" value={fmtNum(data.overview.organicKeywords)} sub="ranking" color="var(--accent)" />
              <MetricCard label="Referring Domains" value={fmtNum(data.backlinks.referringDomains)} sub={`${fmtNum(data.backlinks.live)} backlinks`} color="#7C5CFC" />
              <MetricCard label="Traffic Value" value={`$${fmtNum(data.overview.trafficValue)}`} sub="/month est." color="var(--high)" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
              {([
                ["keywords", "Keywords", data.topKeywords.length],
                ["pages", "Pages", data.topPages.length],
                ["quickwins", "Quick Wins", data.quickWins.length],
                ["backlinks", "Backlinks", null],
              ] as [Tab, string, number | null][]).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="px-4 py-2 text-sm rounded-md cursor-pointer transition-colors flex-1"
                  style={{
                    background: tab === key ? "var(--accent)" : "transparent",
                    color: tab === key ? "#fff" : "var(--text-secondary)",
                    fontWeight: tab === key ? 600 : 400,
                  }}
                >
                  {label}{count !== null ? ` (${count})` : ""}
                </button>
              ))}
            </div>

            {/* Keywords Tab */}
            {tab === "keywords" && (
              <div className="card-static overflow-hidden fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-light)" }}>
                      <th className="text-left px-5 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Keyword</th>
                      <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Position</th>
                      <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Volume</th>
                      <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Traffic</th>
                      <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>KD</th>
                      <th className="text-right px-5 py-3 font-medium" style={{ color: "var(--text-muted)" }}>CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topKeywords.map((kw, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td className="px-5 py-3">
                          <div className="font-medium">{kw.keyword}</div>
                          <div className="text-xs truncate max-w-[300px]" style={{ color: "var(--text-muted)" }}>{kw.url}</div>
                        </td>
                        <td className="text-right px-3 py-3">
                          <PositionBadge position={kw.position} />
                        </td>
                        <td className="text-right px-3 py-3 tabular-nums">{fmtNum(kw.volume)}</td>
                        <td className="text-right px-3 py-3 tabular-nums">{fmtNum(kw.traffic)}</td>
                        <td className="text-right px-3 py-3">
                          <KdBadge kd={kw.keyword_difficulty} />
                        </td>
                        <td className="text-right px-5 py-3 tabular-nums">${kw.cpc.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pages Tab */}
            {tab === "pages" && (
              <div className="card-static overflow-hidden fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-light)" }}>
                      <th className="text-left px-5 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Page URL</th>
                      <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Traffic</th>
                      <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Keywords</th>
                      <th className="text-left px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Top Keyword</th>
                      <th className="text-right px-5 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((page, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td className="px-5 py-3">
                          <div className="text-xs truncate max-w-[350px] font-medium">{page.url}</div>
                        </td>
                        <td className="text-right px-3 py-3 tabular-nums">{fmtNum(page.organic_traffic)}</td>
                        <td className="text-right px-3 py-3 tabular-nums">{fmtNum(page.organic_keywords)}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs">{page.top_keyword}</span>
                          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>({fmtNum(page.top_keyword_volume)})</span>
                        </td>
                        <td className="text-right px-5 py-3">
                          <PositionBadge position={page.top_keyword_position} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick Wins Tab */}
            {tab === "quickwins" && (
              <div className="fade-in">
                {data.quickWins.length === 0 ? (
                  <div className="card-static p-10 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No quick wins found (keywords ranking 4–20 with 50+ search volume).</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                      Keywords ranking 4–20 with decent search volume — small optimizations can push these to the top.
                    </p>
                    <div className="card-static overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-light)" }}>
                            <th className="text-left px-5 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Keyword</th>
                            <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Position</th>
                            <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Volume</th>
                            <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Traffic</th>
                            <th className="text-right px-3 py-3 font-medium" style={{ color: "var(--text-muted)" }}>KD</th>
                            <th className="text-left px-5 py-3 font-medium" style={{ color: "var(--text-muted)" }}>URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.quickWins.map((kw, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                              <td className="px-5 py-3 font-medium">{kw.keyword}</td>
                              <td className="text-right px-3 py-3">
                                <PositionBadge position={kw.position} />
                              </td>
                              <td className="text-right px-3 py-3 tabular-nums">{fmtNum(kw.volume)}</td>
                              <td className="text-right px-3 py-3 tabular-nums">{fmtNum(kw.traffic)}</td>
                              <td className="text-right px-3 py-3">
                                <KdBadge kd={kw.keyword_difficulty} />
                              </td>
                              <td className="px-5 py-3">
                                <div className="text-xs truncate max-w-[250px]" style={{ color: "var(--text-muted)" }}>{kw.url}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Backlinks Tab */}
            {tab === "backlinks" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-in">
                <div className="card-static p-6 text-center">
                  <p className="text-2xl font-bold mb-1 tabular-nums" style={{ color: "var(--accent)" }}>{fmtNum(data.backlinks.live)}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Live Backlinks</p>
                </div>
                <div className="card-static p-6 text-center">
                  <p className="text-2xl font-bold mb-1 tabular-nums" style={{ color: "#7C5CFC" }}>{fmtNum(data.backlinks.referringDomains)}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Referring Domains</p>
                </div>
                <div className="card-static p-6 text-center">
                  <p className="text-2xl font-bold mb-1 tabular-nums" style={{ color: "var(--text-secondary)" }}>{fmtNum(data.backlinks.allTime)}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>All-Time Backlinks</p>
                </div>
                <div className="card-static p-6 text-center">
                  <p className="text-2xl font-bold mb-1 tabular-nums" style={{ color: "var(--text-secondary)" }}>{fmtNum(data.backlinks.referringDomainsAllTime)}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>All-Time Ref. Domains</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card-static p-5 text-center">
      <p className="text-2xl font-bold mb-0.5 tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs font-medium mb-0.5">{label}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  const color = position <= 3 ? "var(--success)" : position <= 10 ? "var(--accent)" : position <= 20 ? "var(--high)" : "var(--text-muted)";
  const bg = position <= 3 ? "var(--success-bg, #e6f9ef)" : position <= 10 ? "#eef1fd" : position <= 20 ? "var(--high-bg)" : "var(--bg-main)";
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums" style={{ color, background: bg }}>
      {Math.round(position * 10) / 10}
    </span>
  );
}

function KdBadge({ kd }: { kd: number }) {
  const color = kd <= 20 ? "var(--success)" : kd <= 50 ? "var(--high)" : "var(--critical)";
  return (
    <span className="text-xs font-bold tabular-nums" style={{ color }}>
      {kd}
    </span>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
