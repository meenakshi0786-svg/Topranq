"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

interface DomainSummary {
  id: string;
  domainUrl: string;
  status: string;
  createdAt: string;
  latestAudit: {
    id: string;
    status: string;
    overallScore: number | null;
    pagesCrawled: number;
    completedAt: string | null;
  } | null;
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<{
    plan: string;
    email?: string;
    isDemo?: boolean;
    credits: { total: number; used: number; remaining: number };
  } | null>(null);

  useEffect(() => {
    // Check if logged_in cookie exists client-side
    const hasLoginCookie = document.cookie.includes("logged_in=1");
    if (!hasLoginCookie) {
      // No cookie — check if we have a stored session hint
      const savedEmail = localStorage.getItem("ranqapex_email");
      if (savedEmail) {
        // Had a session before — cookie expired, show sign-in prompt
        setLoading(false);
        return;
      }
    }

    Promise.all([
      fetch("/api/domains").then((r) => r.json()),
      fetch("/api/credits").then((r) => r.json()),
    ]).then(([d, c]) => {
      setDomains(d);
      setCredits(c);
      setLoading(false);
      // Save email for session recovery
      if (c?.email && c.email !== "demo@ranqapex.com") {
        localStorage.setItem("ranqapex_email", c.email);
      }
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-1.5 rounded-lg hover:bg-[var(--border-light)] transition-colors" title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* Sign-in banner for demo/unauthenticated users */}
        {credits?.isDemo && (
          <div className="mb-6 p-4 rounded-xl flex items-center justify-between fade-in" style={{ background: "linear-gradient(135deg, #fef9c3, #fef3c7)", border: "1px solid #f59e0b40" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#f59e0b20" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#92400e" }}>You&apos;re not signed in</p>
                <p className="text-xs" style={{ color: "#a16207" }}>Sign in with Google to access your domains, articles, and saved data.</p>
              </div>
            </div>
            <button
              onClick={() => { window.location.href = "/api/auth/google"; }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer shrink-0"
              style={{ background: "#fff", border: "1px solid #e5e7eb", color: "#374151" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Your Domains</h1>
          <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
            Add Domain
          </Link>
        </div>

        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="card-static p-20 text-center fade-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--border-light)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-lg font-semibold mb-2">No domains yet</p>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              Add your first domain to start analyzing
            </p>
            <Link href="/" className="btn-primary inline-block px-6 py-2.5 text-sm">
              Add Domain
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((domain, i) => {
              const hostname = (() => {
                try { return new URL(domain.domainUrl).hostname; } catch { return domain.domainUrl; }
              })();
              return (
                <Link
                  key={domain.id}
                  href={`/domain/${domain.id}`}
                  className="card block p-5 fade-in"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: "var(--accent)" }}
                      >
                        {hostname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{hostname}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {domain.latestAudit
                            ? `${domain.latestAudit.pagesCrawled} pages`
                            : "No audit yet"}
                          {domain.latestAudit?.completedAt &&
                            ` · ${new Date(domain.latestAudit.completedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    {domain.latestAudit?.status === "complete" &&
                    domain.latestAudit.overallScore !== null ? (
                      <ScoreBadge score={domain.latestAudit.overallScore} />
                    ) : domain.latestAudit ? (
                      <span
                        className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize"
                        style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                      >
                        {domain.latestAudit.status}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--high)" : "var(--critical)";
  const bg = score >= 80 ? "var(--low-bg)" : score >= 60 ? "var(--high-bg)" : "var(--critical-bg)";
  const label = score >= 80 ? "Good" : score >= 60 ? "Fair" : score >= 40 ? "Poor" : "Critical";
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-2xl font-bold tracking-tight" style={{ color }}>{score}</span>
      <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: bg, color }}>
        {label}
      </span>
    </div>
  );
}
