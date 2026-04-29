"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface UserData {
  plan: string;
  email?: string;
  name?: string;
  articles?: { used: number; limit: number };
  daysRemaining?: number | null;
  planExpired?: boolean;
  limits: { pages: number; articles: number; domains: number };
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasLoginCookie = document.cookie.includes("logged_in=1");
    if (!hasLoginCookie) {
      router.replace("/?signin=1");
      return;
    }
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        if (d?.isDemo) { router.replace("/?signin=1"); return; }
        setData(d); setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const planLabels: Record<string, string> = {
    free: "Free Plan",
    dollar1: "$1 Plan — Sonnet",
    dollar5: "$5 Plan — Opus",
  };

  const planColors: Record<string, { bg: string; text: string }> = {
    free: { bg: "#f3f4f6", text: "#6b7280" },
    dollar1: { bg: "#dbeafe", text: "#1d4ed8" },
    dollar5: { bg: "#ede9fe", text: "#7c3aed" },
  };

  const initials = data?.name
    ? data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : data?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">Account</span>
          </div>
          <a href="/api/auth/logout" className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>
            Logout
          </a>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 py-10">
        {loading ? (
          <div className="card-static p-16 text-center">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Profile Card */}
            <div className="card-static p-8 fade-in" style={{ background: "var(--bg-white)" }}>
              <div className="flex items-center gap-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", color: "#fff" }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {data.name || "User"}
                  </h1>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{data.email}</p>
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: planColors[data.plan]?.bg || "#f3f4f6", color: planColors[data.plan]?.text || "#6b7280" }}
                    >
                      {planLabels[data.plan] || data.plan}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan & Usage */}
            <div className="card-static p-6 fade-in" style={{ background: "var(--bg-white)" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Plan & Usage</h2>
                <Link href="/pricing" className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>
                  {data.plan === "free" ? "Upgrade" : "Buy More"}
                </Link>
              </div>

              {data.daysRemaining !== null && data.daysRemaining !== undefined && (
                <div className="mb-5 p-3 rounded-lg" style={{ background: data.daysRemaining > 7 ? "#f0fdf4" : "#fef2f2" }}>
                  <p className="text-xs font-medium" style={{ color: data.daysRemaining > 7 ? "#166534" : "#991b1b" }}>
                    {data.planExpired ? "Your plan has expired. Upgrade to continue generating articles." : `${data.daysRemaining} days remaining on your plan`}
                  </p>
                </div>
              )}

              {/* Article usage bar */}
              {data.articles && data.articles.limit > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Articles</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {data.articles.used} / {data.articles.limit} used
                    </p>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: "var(--border-light)" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (data.articles.used / data.articles.limit) * 100)}%`,
                        background: data.articles.used >= data.articles.limit ? "#ef4444" : "linear-gradient(90deg, #4F6EF7, #7C5CFC)",
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 12, textAlign: "center", background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{data.limits.pages}</p>
                  <p style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>Pages / Audit</p>
                </div>
                <div style={{ padding: 16, borderRadius: 12, textAlign: "center", background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{data.limits.articles}</p>
                  <p style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>Articles / Plan</p>
                </div>
                <div style={{ padding: 16, borderRadius: 12, textAlign: "center", background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{data.limits.domains}</p>
                  <p style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>Domains</p>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="card-static p-6 fade-in" style={{ background: "var(--bg-white)" }}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Support</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Email Support</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>ranqapexcontact@gmail.com</p>
                  </div>
                  <a href="mailto:ranqapexcontact@gmail.com" className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                    Contact
                  </a>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Telegram Community</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Get tips, updates, and direct support</p>
                  </div>
                  <a href="https://t.me/+zoz0403pg_45NTFl" target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "#0088cc", color: "#fff" }}>
                    Join
                  </a>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card-static p-6 fade-in" style={{ background: "var(--bg-white)", border: "1px solid #fee2e2" }}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#991b1b" }}>Account</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Sign out</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sign out of your Ranqapex account on this device</p>
                </div>
                <a href="/api/auth/logout" className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  Logout
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
