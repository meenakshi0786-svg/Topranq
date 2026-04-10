"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface UserData {
  plan: string;
  credits: { total: number; used: number; remaining: number };
  limits: { credits: number; pages: number; articles: number; domains: number };
}

export default function SettingsPage() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const planLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    agency: "Agency",
  };

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Settings</span>
        </div>
      </header>

      <div className="max-w-[900px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Settings</h1>

        {loading ? (
          <div className="card-static p-16 text-center">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account */}
            <div className="card-static p-6 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Account</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>demo@ranqapex.com</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Member since</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>March 2026</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan */}
            <div className="card-static p-6 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Plan & Billing</h2>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-lg font-bold">{planLabels[data?.plan || "free"]} Plan</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {data?.plan === "free" ? "No payment method on file" : "Billed monthly"}
                  </p>
                </div>
                <Link href="/pricing" className="btn-primary px-5 py-2 text-sm">
                  {data?.plan === "free" ? "Upgrade" : "Change Plan"}
                </Link>
              </div>

              {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <LimitCard label="Credits" used={data.credits.used} total={data.limits.credits} />
                  <LimitCard label="Pages" used={0} total={data.limits.pages} />
                  <LimitCard label="Articles/mo" used={0} total={data.limits.articles} />
                  <LimitCard label="Domains" used={0} total={data.limits.domains} />
                </div>
              )}
            </div>

            {/* Credits */}
            <div className="card-static p-6 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Credits</h2>
              {data && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {data.credits.remaining} of {data.credits.total} credits remaining
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: data.credits.remaining > 0 ? "var(--success)" : "var(--critical)" }}>
                      {Math.round((data.credits.remaining / data.credits.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-4" style={{ background: "var(--border-light)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (data.credits.used / data.credits.total) * 100)}%`,
                        background: data.credits.remaining > 0 ? "var(--accent)" : "var(--critical)",
                      }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Credits reset monthly. Need more? Top up anytime — $10 for 15 credits on any paid plan.
                  </p>
                </>
              )}
            </div>

            {/* API Keys */}
            <div className="card-static p-6 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Integrations</h2>
              <div className="space-y-3">
                <IntegrationRow name="Google Search Console" envVar="GOOGLE_CLIENT_ID" />
                <IntegrationRow name="Ahrefs" envVar="AHREFS_API_KEY" />
                <IntegrationRow name="Anthropic (Claude)" envVar="ANTHROPIC_API_KEY" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LimitCard({ label, used, total }: { label: string; used: number; total: number }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg)" }}>
      <p className="text-lg font-bold tabular-nums">{total === -1 ? "\u221e" : total}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function IntegrationRow({ name, envVar }: { name: string; envVar: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{envVar}</p>
      </div>
      <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: "var(--low-bg)", color: "var(--success)" }}>
        Set in .env
      </span>
    </div>
  );
}
