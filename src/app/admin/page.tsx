"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { TrendChart } from "@/components/trend-chart";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  planPurchasedAt: string | null;
  daysRemaining: number | null;
  planExpired: boolean;
  createdAt: string | null;
  domainCount: number;
  articleCount: number;
  isDemo: boolean;
  isAdmin: boolean;
}

interface Summary {
  total: number;
  free: number;
  dollar1: number;
  dollar5: number;
  activePaid: number;
  totalRevenue: number;
  totalDomains: number;
  totalArticles: number;
}

interface VisitorData {
  summary: {
    liveNow: number;
    pageViewsToday: number;
    pageViews7d: number;
    pageViews30d: number;
    uniqueToday: number;
    unique7d: number;
    unique30d: number;
    newVisitorsToday: number;
    returningVisitorsToday: number;
    bounceRate: number;
    avgPagesPerSession: number;
    totalSessions30d: number;
  };
  frequency: { once: number; two_three: number; four_seven: number; eight_plus: number };
  exitPages: { path: string; count: number }[];
  topCountries: { country: string | null; count: number }[];
  topPages: { path: string; count: number }[];
  topReferers: { referer: string; count: number }[];
  dailyTrend: { day: string; pageviews: number; visitors: number }[];
}

interface FunnelData {
  today: { visitors: number; signups: number; conversionRate: number };
  overall: {
    visitors30d: number;
    signups: number;
    signups30d: number;
    withDomain: number;
    withArticle: number;
    paid: number;
    dollar1: number;
    dollar5: number;
    revenue: number;
  };
  funnel: { stage: string; count: number; fromPrev: number | null }[];
}

const PLAN_LABEL: Record<string, string> = { free: "Free", dollar1: "$1", dollar5: "$5" };
const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
  free: { bg: "#f3f4f6", text: "#6b7280" },
  dollar1: { bg: "#dbeafe", text: "#1d4ed8" },
  dollar5: { bg: "#ede9fe", text: "#7c3aed" },
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "free" | "dollar1" | "dollar5">("all");
  const [search, setSearch] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, vRes, fRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/visitors"),
        fetch("/api/admin/funnel"),
      ]);
      if (uRes.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (!uRes.ok) {
        setError("Failed to load admin data");
        setLoading(false);
        return;
      }
      const uData = await uRes.json();
      setUsers(uData.users);
      setSummary(uData.summary);
      if (vRes.ok) setVisitorData(await vRes.json());
      if (fRes.ok) setFunnelData(await fRes.json());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function changePlan(userId: string, plan: string) {
    if (!confirm(`Change this user's plan to ${PLAN_LABEL[plan] || plan}?`)) return;
    setBusyUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to update plan");
        return;
      }
      showToast(`Plan changed to ${PLAN_LABEL[plan] || plan}`);
      fetchData();
    } finally {
      setBusyUser(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This removes ALL their domains, articles, audits, and data. Cannot be undone.`)) return;
    setBusyUser(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to delete user");
        return;
      }
      showToast(`Deleted ${email}`);
      fetchData();
    } finally {
      setBusyUser(null);
    }
  }

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.plan !== filter) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Admin</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#fef3c7", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Internal</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchData} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-light)", background: "#fff", cursor: "pointer" }}>
              ↻ Refresh
            </button>
            <Link href="/dashboard" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, color: "var(--text-secondary)", textDecoration: "none" }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>
        {error && (
          <div style={{ padding: 16, marginBottom: 24, borderRadius: 12, background: "#fee2e2", color: "#991b1b" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading admin data...</div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                <Stat label="Total Users" value={summary.total} icon="users" />
                <Stat label="Free Plan" value={summary.free} icon="user" color="#6b7280" />
                <Stat label="$1 Plan" value={summary.dollar1} icon="zap" color="#1d4ed8" />
                <Stat label="$5 Plan" value={summary.dollar5} icon="star" color="#7c3aed" />
                <Stat label="Active Paid" value={summary.activePaid} icon="check" color="#16a34a" />
                <Stat label="Total Revenue" value={`$${summary.totalRevenue}`} icon="dollar" color="#16a34a" />
                <Stat label="Domains" value={summary.totalDomains} icon="globe" />
                <Stat label="Articles Generated" value={summary.totalArticles} icon="article" />
              </div>
            )}

            {/* Visitor Analytics */}
            {visitorData && (
              <section style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Site Traffic
                  </h2>
                  {visitorData.summary.liveNow > 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#16a34a" }}>
                      <span style={{ position: "relative", display: "flex", width: 8, height: 8 }}>
                        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", opacity: 0.7, animation: "ranq-ping 1.6s cubic-bezier(0,0,.2,1) infinite" }} />
                        <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                      </span>
                      {visitorData.summary.liveNow} active now
                    </div>
                  )}
                </div>

                {/* Visitor stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
                  <Stat label="Visitors Today" value={visitorData.summary.uniqueToday} icon="users" color="#4F6EF7" />
                  <Stat label="Page Views Today" value={visitorData.summary.pageViewsToday} icon="users" />
                  <Stat label="Visitors (7d)" value={visitorData.summary.unique7d} icon="users" />
                  <Stat label="Visitors (30d)" value={visitorData.summary.unique30d} icon="users" />
                </div>

                {/* New vs Returning + bounce + pages/session */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
                  <NewVsReturningCard
                    newCount={visitorData.summary.newVisitorsToday}
                    returningCount={visitorData.summary.returningVisitorsToday}
                  />
                  <Stat label="Bounce Rate (30d)" value={`${visitorData.summary.bounceRate}%`} icon="users" color={visitorData.summary.bounceRate > 60 ? "#dc2626" : "#16a34a"} />
                  <Stat label="Pages / Session" value={visitorData.summary.avgPagesPerSession} icon="users" />
                  <Stat label="Sessions (30d)" value={visitorData.summary.totalSessions30d} icon="users" />
                </div>

                {/* Daily trend chart */}
                <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: 18, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 12px" }}>
                    14-Day Trend
                  </p>
                  <TrendChart data={visitorData.dailyTrend} />
                </div>

                {/* Top countries / pages / referrers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <RankList title="Top Countries" emptyMsg="No country data yet" items={visitorData.topCountries.map(r => ({ label: r.country || "Unknown", count: r.count }))} />
                  <RankList title="Top Pages" emptyMsg="No page views yet" items={visitorData.topPages.map(r => ({ label: r.path, count: r.count }))} />
                  <RankList title="Top Referrers" emptyMsg="Mostly direct traffic" items={visitorData.topReferers.map(r => ({ label: r.referer, count: r.count }))} />
                </div>

                {/* Visit frequency + Exit pages */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <FrequencyCard frequency={visitorData.frequency} />
                  <RankList title="Top Exit Pages (30d)" emptyMsg="No exit data yet" items={visitorData.exitPages.map(r => ({ label: r.path, count: r.count }))} />
                </div>
              </section>
            )}

            {/* Conversion Funnel */}
            {funnelData && (
              <section style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "baseline", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Conversion Funnel
                  </h2>
                </div>
                <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: 24 }}>
                  <FunnelView data={funnelData} />
                </div>
              </section>
            )}

            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Users</h2>
            </div>

            {/* Filter bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {(["all", "free", "dollar1", "dollar5"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
                      cursor: "pointer",
                      background: filter === f ? "var(--accent)" : "#fff",
                      color: filter === f ? "#fff" : "var(--text-secondary)",
                      border: filter === f ? "1px solid var(--accent)" : "1px solid var(--border-light)",
                    }}
                  >
                    {f === "all" ? "All" : PLAN_LABEL[f] || f}
                    {f !== "all" && summary && (
                      <span style={{ marginLeft: 6, opacity: 0.7 }}>
                        ({f === "free" ? summary.free : f === "dollar1" ? summary.dollar1 : summary.dollar5})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email or name..."
                style={{
                  fontSize: 13, padding: "8px 14px", borderRadius: 8,
                  border: "1px solid var(--border-light)", background: "#fff",
                  width: 260, outline: "none",
                }}
              />
            </div>

            {/* Users table */}
            <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                      <th style={th}>User</th>
                      <th style={th}>Plan</th>
                      <th style={th}>Days Left</th>
                      <th style={th}>Domains</th>
                      <th style={th}>Articles</th>
                      <th style={th}>Joined</th>
                      <th style={{ ...th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No users match the filter.</td></tr>
                    ) : filtered.map((u) => {
                      const planColor = PLAN_COLOR[u.plan] || PLAN_COLOR.free;
                      const isBusy = busyUser === u.id;
                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border-light)", opacity: isBusy ? 0.5 : 1 }}>
                          <td style={td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                {(u.name || u.email).charAt(0).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                                  {u.name || "—"}
                                  {u.isAdmin && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#fef3c7", color: "#92400e" }}>ADMIN</span>}
                                  {u.isDemo && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#f3f4f6", color: "#6b7280" }}>DEMO</span>}
                                </p>
                                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={td}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: planColor.bg, color: planColor.text }}>
                              {PLAN_LABEL[u.plan] || u.plan}
                            </span>
                          </td>
                          <td style={td}>
                            {u.daysRemaining !== null ? (
                              <span style={{ fontSize: 12, color: u.daysRemaining > 7 ? "var(--text-secondary)" : "#dc2626", fontWeight: u.daysRemaining > 7 ? 400 : 600 }}>
                                {u.daysRemaining > 0 ? `${u.daysRemaining}d` : "Expired"}
                              </span>
                            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={td}>{u.domainCount}</td>
                          <td style={td}>{u.articleCount}</td>
                          <td style={td}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "—"}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <select
                                value={u.plan}
                                onChange={(e) => changePlan(u.id, e.target.value)}
                                disabled={isBusy || u.isDemo}
                                style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border-light)", background: "#fff", cursor: isBusy ? "wait" : "pointer" }}
                              >
                                <option value="free">Free</option>
                                <option value="dollar1">$1</option>
                                <option value="dollar5">$5</option>
                              </select>
                              <button
                                onClick={() => deleteUser(u.id, u.email)}
                                disabled={isBusy || u.isAdmin || u.isDemo}
                                title={u.isAdmin ? "Cannot delete admins" : u.isDemo ? "Cannot delete demo user" : "Delete user"}
                                style={{
                                  fontSize: 11, padding: "4px 8px", borderRadius: 6,
                                  border: "1px solid #fecaca",
                                  background: u.isAdmin || u.isDemo ? "#f9fafb" : "#fee2e2",
                                  color: u.isAdmin || u.isDemo ? "#9ca3af" : "#dc2626",
                                  cursor: u.isAdmin || u.isDemo || isBusy ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 16, textAlign: "center" }}>
              Showing {filtered.length} of {users.length} users · Admin actions are logged on the server.
            </p>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", borderRadius: 10, background: "#1a1a2e", color: "#fff", fontSize: 13, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "12px 16px", color: "var(--text-primary)" };

function Stat({ label, value, color = "var(--text-primary)" }: { label: string; value: number | string; icon: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color, margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

function RankList({ title, items, emptyMsg }: { title: string; items: { label: string; count: number }[]; emptyMsg: string }) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 12px" }}>{title}</p>
      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, padding: "12px 0" }}>{emptyMsg}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.slice(0, 6).map((item, i) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                <span style={{ color: "var(--text-muted)", fontWeight: 600, marginLeft: 8 }}>{item.count}</span>
              </div>
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border-light)" }}>
                <div style={{ width: `${(item.count / max) * 100}%`, height: 4, borderRadius: 2, background: "linear-gradient(90deg, #4F6EF7, #7C5CFC)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewVsReturningCard({ newCount, returningCount }: { newCount: number; returningCount: number }) {
  const total = newCount + returningCount;
  const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0;
  const retPct = total > 0 ? 100 - newPct : 0;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 8px" }}>New vs Returning</p>
      {total === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No data yet today</p>
      ) : (
        <>
          <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--border-light)", marginBottom: 8 }}>
            <div style={{ width: `${newPct}%`, background: "#4F6EF7" }} />
            <div style={{ width: `${retPct}%`, background: "#22c55e" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: "#4F6EF7", fontWeight: 600 }}>{newCount} new ({newPct}%)</span>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>{returningCount} returning ({retPct}%)</span>
          </div>
        </>
      )}
    </div>
  );
}

function FrequencyCard({ frequency }: { frequency: { once: number; two_three: number; four_seven: number; eight_plus: number } }) {
  const total = frequency.once + frequency.two_three + frequency.four_seven + frequency.eight_plus;
  const buckets = [
    { label: "1 visit", count: frequency.once, color: "#9ca3af" },
    { label: "2–3 days", count: frequency.two_three, color: "#4F6EF7" },
    { label: "4–7 days", count: frequency.four_seven, color: "#7C5CFC" },
    { label: "8+ days", count: frequency.eight_plus, color: "#16a34a" },
  ];
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, padding: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 12px" }}>Visit Frequency (30d)</p>
      {total === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, padding: "12px 0" }}>No visitors with persistent IDs yet — data will populate as people return.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {buckets.map(b => {
            const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
            return (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{b.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{b.count} ({pct}%)</span>
                </div>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border-light)" }}>
                  <div style={{ width: `${pct}%`, height: 4, borderRadius: 2, background: b.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FunnelView({ data }: { data: FunnelData }) {
  const top = data.funnel[0]?.count || 1;
  return (
    <div>
      {/* Today's quick conversion */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg)", borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
        <span style={{ color: "var(--text-secondary)" }}>
          Today: <strong style={{ color: "var(--text-primary)" }}>{data.today.visitors} visitors</strong> → <strong style={{ color: "var(--text-primary)" }}>{data.today.signups} signups</strong>
        </span>
        <span style={{ fontWeight: 700, color: data.today.conversionRate >= 5 ? "#16a34a" : "var(--text-secondary)" }}>
          {data.today.conversionRate}% conversion
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.funnel.map((step, i) => {
          const widthPct = top > 0 ? Math.max(15, (step.count / top) * 100) : 15;
          return (
            <div key={step.stage} style={{ display: "grid", gridTemplateColumns: "180px 1fr 90px", alignItems: "center", gap: 12, fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{step.stage}</span>
              <div style={{ position: "relative", height: 32, background: "var(--bg)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{
                  width: `${widthPct}%`, height: "100%",
                  background: i === 0 ? "linear-gradient(90deg, #4F6EF7, #7C5CFC)"
                    : i === data.funnel.length - 1 ? "linear-gradient(90deg, #16a34a, #22c55e)"
                    : "linear-gradient(90deg, #c7d7fe, #a5b4fc)",
                  display: "flex", alignItems: "center", paddingLeft: 12,
                  color: i === 0 || i === data.funnel.length - 1 ? "#fff" : "var(--text-primary)",
                  fontWeight: 700,
                }}>
                  {step.count}
                </div>
              </div>
              <span style={{ fontSize: 12, color: step.fromPrev != null && step.fromPrev > 0 ? "var(--text-secondary)" : "var(--text-muted)", textAlign: "right" }}>
                {step.fromPrev != null ? `${step.fromPrev}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {data.overall.revenue > 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 16, textAlign: "right" }}>
          Total revenue from paid plans: <strong style={{ color: "#16a34a" }}>${data.overall.revenue}</strong>
          {" "}({data.overall.dollar1} on $1, {data.overall.dollar5} on $5)
        </p>
      )}
    </div>
  );
}
