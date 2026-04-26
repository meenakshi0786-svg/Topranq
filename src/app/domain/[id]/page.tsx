"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CubeLoader } from "@/components/cube-loader";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { usePageTitle } from "@/components/page-title";

const LANGUAGES = [
  "English", "French", "Spanish", "German", "Italian", "Portuguese",
  "Dutch", "Russian", "Japanese", "Chinese", "Korean", "Arabic",
  "Hindi", "Turkish", "Polish", "Swedish", "Danish", "Norwegian",
  "Finnish", "Czech", "Romanian", "Hungarian", "Greek", "Thai",
  "Vietnamese", "Indonesian", "Malay", "Hebrew", "Ukrainian",
];

interface DomainData {
  domain: { id: string; domainUrl: string; status: string; language: string | null };
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
  const searchParams = useSearchParams();
  const domainId = params.id as string;
  const [data, setData] = useState<DomainData | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const autoAuditTriggered = useRef(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}`);
    if (!res.ok) return;
    const d = await res.json();
    setData(d);
    return d?.latestAudit?.status;
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

  // Auto-start audit when redirected from Google sign-in
  useEffect(() => {
    if (
      searchParams.get("autoaudit") === "true" &&
      data &&
      !data.latestAudit &&
      !autoAuditTriggered.current
    ) {
      autoAuditTriggered.current = true;
      fetch(`/api/domains/${domainId}/crawl`, { method: "POST" }).then(() => {
        window.history.replaceState({}, "", `/domain/${domainId}`);
        window.location.reload();
      });
    }
  }, [searchParams, data, domainId]);

  const hostname = data ? (() => { try { return new URL(data.domain.domainUrl).hostname; } catch { return data.domain.domainUrl; } })() : "";
  usePageTitle(hostname ? `${hostname} — Dashboard` : "Loading...");

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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Language</label>
              <select
                value={data?.domain.language || "English"}
                onChange={async (e) => {
                  const lang = e.target.value;
                  await fetch(`/api/domains/${domainId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ language: lang }),
                  });
                  setData((prev) => prev ? { ...prev, domain: { ...prev.domain, language: lang } } : prev);
                }}
                className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)" }}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
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
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">

        {/* Audit failed banner */}
        {latestAudit?.status === "failed" && (
          <div className="p-5 rounded-xl mb-5 fade-in" style={{ background: "var(--critical-bg)", border: "1px solid var(--critical)" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--critical)" }}>Audit failed</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {(latestAudit as unknown as { errorMessage?: string })?.errorMessage || "The crawl encountered an error. This can happen if the site is unreachable, blocks crawlers, or has an unusual structure."}
                </p>
              </div>
              <button
                onClick={async () => {
                  await fetch(`/api/domains/${domainId}/crawl`, { method: "POST" });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer shrink-0"
                style={{ background: "var(--critical)" }}
              >
                Retry Audit
              </button>
            </div>
          </div>
        )}

        {/* No audit yet */}
        {!latestAudit && (
          <div className="card-static p-10 text-center mb-5 fade-in">
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No audit yet</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Click &quot;Re-run Audit&quot; to crawl this site and generate your SEO report.</p>
            <button
              onClick={async () => {
                await fetch(`/api/domains/${domainId}/crawl`, { method: "POST" });
                window.location.reload();
              }}
              className="btn-primary px-5 py-2.5 text-sm cursor-pointer"
            >
              Start Audit
            </button>
          </div>
        )}

        {/* Onboarding (Connect GSC + Add Products) — lives above the score */}
        {latestAudit?.status === "complete" && (
          <OnboardingPanel
            domainId={domainId}
            domainUrl={domain.domainUrl}
            justConnectedGsc={searchParams.get("gscConnected") === "1"}
          />
        )}

        {/* Progress */}
        {isRunning && (
          <div className="card-static p-12 mb-8 fade-in">
            <CubeLoader
              label={
                latestAudit.status === "queued" ? "Preparing audit..." :
                latestAudit.status === "crawling" ? "Crawling your website..." :
                "Analyzing issues..."
              }
              sublabel={`${latestAudit.pagesCrawled} of ${latestAudit.pagesFound || "?"} pages processed`}
            />
            <div className="w-full max-w-xs mx-auto h-1.5 rounded-full overflow-hidden mt-6" style={{ background: "var(--border-light)" }}>
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
        {/* NOTE: "Search Console", "Strategy AI Agents" and "Connectors" are temporarily hidden.
            To restore: uncomment the NavCards below and change md:grid-cols-4 to match the new count. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <NavCard href={`/domain/${domainId}/audit`} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" title="Audit" desc={`${stats.issues.total} issues`} />
          <NavCard href={`/domain/${domainId}/geo`} icon="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" title="GEO" desc="AI readiness" />
          <NavCard href={`/domain/${domainId}/pillars`} icon="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" title="Pillars" desc="Topic clusters" />
          <NavCard href={`/domain/${domainId}/articles`} icon="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" title="Articles" desc="Generated content" />
          {/* <NavCard href={`/domain/${domainId}/search-console`} icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" title="Search Console" desc="GSC data" /> */}
          {/* <NavCard href={`/domain/${domainId}/agents`} icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" title="Strategy AI Agents" desc="Deploy agents" /> */}
          {/* <NavCard href={`/domain/${domainId}/connectors`} icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" title="Connectors" desc="Publish to CMS" /> */}
        </div>

        {/* Guided flow for new users */}
        {!latestAudit || latestAudit.status !== "complete" ? null : (
          <div className="card-static p-5 mb-8 fade-in" style={{ background: "linear-gradient(135deg, #4F6EF705, #7C5CFC05)", border: "1px solid #4F6EF720" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>
              Recommended next steps
            </p>
            <div className="flex items-center gap-2 flex-wrap text-[11px]" style={{ color: "var(--text-muted)" }}>
              {[
                { label: "Audit", done: true },
                { label: "Keyword Planner", done: false, href: `/domain/${domainId}/keyword-planner` },
                { label: "Generate Pillars", done: false, href: `/domain/${domainId}/pillars` },
                { label: "Write Articles", done: false, href: `/domain/${domainId}/pillars` },
                { label: "Interlink", done: false, href: `/domain/${domainId}/pillars` },
                { label: "Publish", done: false, href: `/domain/${domainId}/articles` },
              ].map((step, i) => (
                <span key={step.label} className="flex items-center gap-2">
                  {step.href ? (
                    <a href={step.href} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)", color: "var(--accent)" }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "var(--border-light)", color: "var(--text-muted)" }}>{i + 1}</span>
                      {step.label}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium" style={{ background: "#dcfce7", border: "1px solid #22c55e40", color: "#166534" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      {step.label}
                    </span>
                  )}
                  {i < 5 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>}
                </span>
              ))}
            </div>
          </div>
        )}

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
