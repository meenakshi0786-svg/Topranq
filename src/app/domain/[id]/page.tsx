"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface DomainData {
  domain: { id: string; domainUrl: string; status: string };
  latestAudit: {
    id: string;
    status: string;
    overallScore: number | null;
    scoresJson: {
      overall: number;
      categories: Array<{ category: string; label: string; score: number; issueCount: number }>;
    } | null;
    pagesCrawled: number;
    pagesFound: number;
    completedAt: string | null;
  } | null;
  stats: {
    pages: number;
    issues: { critical: number; high: number; medium: number; low: number; total: number };
    keywordClusters: number;
    articles: number;
  };
  recentActions: Array<{
    id: string; agentName: string; actionType: string;
    outputSummary: string; qualityGatePassed: boolean; timestamp: string;
  }>;
}

export default function DomainOverview() {
  const params = useParams();
  const domainId = params.id as string;
  const [data, setData] = useState<DomainData | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}`);
    if (res.ok) { setData(await res.json()); }
    return (await res.json?.())?.latestAudit?.status;
  }, [domainId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(`/api/domains/${domainId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (!stopped) setData(d);
        const status = d.latestAudit?.status;
        if (status === "complete" || status === "failed" || !status) {
          if (interval) clearInterval(interval);
        }
      } catch { /* retry */ }
    }

    poll();
    interval = setInterval(poll, 2000);
    return () => { stopped = true; if (interval) clearInterval(interval); };
  }, [domainId]);

  useEffect(() => {
    fetch("/api/credits").then((r) => r.json()).then((c) => setPlan(c.plan)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="animate-pulse mb-3" style={{ color: "var(--accent)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  const { domain, latestAudit, stats, recentActions } = data;
  const hostname = (() => { try { return new URL(domain.domainUrl).hostname; } catch { return domain.domainUrl; } })();
  const isRunning = latestAudit && !["complete", "failed"].includes(latestAudit.status);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">{hostname}</span>
          </div>
          <button
            onClick={async () => {
              await fetch(`/api/domains/${domainId}/crawl`, { method: "POST" });
              window.location.reload();
            }}
            className="btn-primary px-5 py-2 text-sm cursor-pointer"
          >
            Re-run Audit
          </button>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Progress */}
        {isRunning && (
          <div className="card-static p-12 mb-8 text-center fade-in">
            <div className="animate-pulse mb-4" style={{ color: "var(--accent)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <p className="text-lg font-semibold mb-2">
              {latestAudit.status === "queued" ? "Preparing audit..." :
               latestAudit.status === "crawling" ? "Crawling pages..." : "Analyzing issues..."}
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              {latestAudit.pagesCrawled} of {latestAudit.pagesFound || "?"} pages processed
            </p>
            <div className="w-full max-w-xs mx-auto h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  background: "var(--accent)",
                  width: latestAudit.pagesFound ? `${Math.min(100, (latestAudit.pagesCrawled / latestAudit.pagesFound) * 100)}%` : "15%",
                }}
              />
            </div>
          </div>
        )}

        {/* Score section */}
        {latestAudit?.status === "complete" && latestAudit.scoresJson && (
          <>
            <div className="grid grid-cols-12 gap-5 mb-5">
              {/* Score */}
              <div className="col-span-12 md:col-span-3 card-static p-7 flex flex-col items-center justify-center fade-in">
                <ScoreCircle score={latestAudit.scoresJson.overall} />
                <p className="mt-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Overall Score
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {stats.pages} pages analyzed
                </p>
              </div>

              {/* Severity cards */}
              <div className="col-span-12 md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3">
                <SeverityCard label="Critical" count={stats.issues.critical} color="var(--critical)" bg="var(--critical-bg)" />
                <SeverityCard label="High" count={stats.issues.high} color="var(--high)" bg="var(--high-bg)" />
                <SeverityCard label="Medium" count={stats.issues.medium} color="var(--medium)" bg="var(--medium-bg)" />
                <SeverityCard label="Low" count={stats.issues.low} color="var(--low)" bg="var(--low-bg)" />
              </div>
            </div>

            {/* Category scores */}
            <div className="card-static p-7 mb-5 fade-in">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>
                Category Breakdown
              </h2>
              <div className="space-y-4">
                {latestAudit.scoresJson.categories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-4">
                    <span className="text-sm w-40 shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {cat.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${cat.score}%`, background: getScoreColor(cat.score) }}
                      />
                    </div>
                    <span className="text-sm font-bold w-9 text-right tabular-nums" style={{ color: getScoreColor(cat.score) }}>
                      {cat.score}
                    </span>
                    <span className="text-xs w-16 text-right" style={{ color: "var(--text-muted)" }}>
                      {cat.issueCount} issue{cat.issueCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Free plan nudge */}
        {plan === "free" && latestAudit?.status === "complete" && (
          <div className="p-4 rounded-xl mb-6 flex items-center justify-between fade-in" style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Unlock full potential
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                You&apos;re on the Free plan (25 pages, 3 articles/mo). Upgrade to crawl up to 2,000 pages and publish 100 articles.
              </p>
            </div>
            <Link href="/pricing" className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0" style={{ background: "var(--accent)" }}>
              View Plans
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <NavCard href={`/domain/${domainId}/audit`} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" title="Audit" desc={`${stats.issues.total} issues`} />
          <NavCard href={`/domain/${domainId}/search-console`} icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" title="Search Console" desc="GSC data" />
          <NavCard href={`/domain/${domainId}/agents`} icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" title="Strategy AI Agents" desc="Deploy agents" />
          <NavCard href={`/domain/${domainId}/connectors`} icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" title="Connectors" desc="Publish to CMS" />
        </div>

        {/* Recent activity */}
        {recentActions.length > 0 && (
          <div className="card-static p-7 fade-in">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActions.slice(0, 5).map((action) => (
                <div key={action.id} className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: getAgentColor(action.agentName) }}
                  >
                    {action.agentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium capitalize">{action.agentName}</span>
                      {action.qualityGatePassed ? (
                        <span className="text-xs font-medium" style={{ color: "var(--success)" }}>Passed</span>
                      ) : (
                        <span className="text-xs font-medium" style={{ color: "var(--critical)" }}>Failed</span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {action.outputSummary?.slice(0, 120)}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const size = 110;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-light)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight" style={{ color }}>{score}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>/100</span>
      </div>
    </div>
  );
}

function SeverityCard({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div className="card-static p-5 text-center fade-in">
      <p className="text-2xl font-bold mb-1 tracking-tight tabular-nums" style={{ color }}>{count}</p>
      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function NavCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card p-5 block">
      <div className="mb-3" style={{ color: "var(--accent)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
    </Link>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--high)";
  return "var(--critical)";
}

function ExportCard({ domainId, hasAudit }: { domainId: string; hasAudit: boolean }) {
  return (
    <button
      onClick={() => {
        if (hasAudit) {
          window.open(`/api/domains/${domainId}/export`, "_blank");
        }
      }}
      className={`card p-5 block text-left w-full ${!hasAudit ? "opacity-50" : "cursor-pointer"}`}
      disabled={!hasAudit}
    >
      <div className="mb-3" style={{ color: "var(--accent)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      </div>
      <h3 className="font-semibold text-sm mb-0.5">Export Report</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {hasAudit ? "Download HTML" : "Run audit first"}
      </p>
    </button>
  );
}

function getAgentColor(name: string): string {
  const colors: Record<string, string> = {
    orchestrator: "#4F6EF7",
    crawler: "#7C5CFC",
    auditor: "#E5890A",
    strategist: "#30A46C",
    writer: "#E5484D",
  };
  return colors[name] || "#9AA0B4";
}
