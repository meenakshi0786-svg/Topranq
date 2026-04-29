"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface UserData {
  plan: string;
  email?: string;
  articles?: { used: number; limit: number };
  daysRemaining?: number | null;
  limits: { pages: number; articles: number; domains: number };
}

export default function SettingsPage() {
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
    free: "Free",
    dollar1: "$1 Plan",
    dollar5: "$5 Plan",
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
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{data?.email || "Not signed in"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan */}
            <div className="card-static p-6 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Plan</h2>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-lg font-bold">{planLabels[data?.plan || "free"] || data?.plan}</p>
                  {data?.daysRemaining !== null && data?.daysRemaining !== undefined && (
                    <p className="text-xs" style={{ color: data.daysRemaining > 7 ? "var(--text-muted)" : "var(--critical)" }}>
                      {data.daysRemaining > 0 ? `${data.daysRemaining} days remaining` : "Plan expired"}
                    </p>
                  )}
                </div>
                <Link href="/pricing" className="btn-primary px-5 py-2 text-sm">
                  {data?.plan === "free" ? "Buy a Plan" : "Buy More"}
                </Link>
              </div>

              {data && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg)" }}>
                    <p className="text-lg font-bold tabular-nums">{data.limits.pages}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pages</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg)" }}>
                    <p className="text-lg font-bold tabular-nums">{data.articles ? `${data.articles.used}/${data.articles.limit}` : data.limits.articles}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Articles Used</p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg)" }}>
                    <p className="text-lg font-bold tabular-nums">{data.limits.domains}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Domains</p>
                  </div>
                </div>
              )}
            </div>

            {/* Integrations */}
            <div className="card-static p-6 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>Integrations</h2>
              <div className="space-y-3">
                <IntegrationRow name="Google Search Console" status="Available" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationRow({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-light)" }}>
      <p className="text-sm font-medium">{name}</p>
      <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: "var(--low-bg)", color: "var(--success)" }}>
        {status}
      </span>
    </div>
  );
}
