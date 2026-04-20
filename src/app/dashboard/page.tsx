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
    credits: { total: number; used: number; remaining: number };
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/domains").then((r) => r.json()),
      fetch("/api/credits").then((r) => r.json()),
    ]).then(([d, c]) => {
      setDomains(d);
      setCredits(c);
      setLoading(false);
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
            {credits && (
              <>
                <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                  {credits.credits.remaining} / {credits.credits.total} credits
                </span>
                {credits.plan === "free" ? (
                  <Link href="/pricing" className="text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ background: "var(--accent)" }}>
                    Upgrade
                  </Link>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize" style={{ background: "var(--border-light)", color: "var(--text-secondary)" }}>
                    {credits.plan}
                  </span>
                )}
              </>
            )}
            <Link href="/settings" className="p-1.5 rounded-lg hover:bg-[var(--border-light)] transition-colors" title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
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
