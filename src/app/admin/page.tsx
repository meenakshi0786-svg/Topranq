"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "free" | "dollar1" | "dollar5">("all");
  const [search, setSearch] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (!res.ok) {
        setError("Failed to load admin data");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUsers(data.users);
      setSummary(data.summary);
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
