"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface GEOReport {
  domain: { id: string; url: string };
  overallScore: number;
  pagesAnalyzed: number;
  aiCrawlers: {
    checked: boolean;
    allowed: string[];
    blocked: string[];
    wildcardBlock: boolean;
  };
  hasLlmsTxt: boolean;
  pageScores: Array<{
    pageId: string;
    url: string;
    title: string | null;
    score: number;
    checks: Record<string, boolean>;
    suggestions: string[];
  }>;
  topIssues: Array<{
    issue: string;
    affectedCount: number;
    recommendation: string;
    severity: "high" | "medium" | "low";
    affectedPages: Array<{ url: string; title: string | null; suggestion: string }>;
  }>;
}

export default function GEOPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [report, setReport] = useState<GEOReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${domainId}/geo`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load GEO report");
        return;
      }
      setReport(await res.json());
    } catch {
      setError("Failed to load GEO report");
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function downloadLlmsTxt() {
    window.location.href = `/api/domains/${domainId}/geo?action=llms-txt`;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Dashboard
            </Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">GEO</span>
          </div>
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="btn-primary px-5 py-2 text-sm cursor-pointer disabled:opacity-40"
          >
            {loading ? "Refreshing..." : "Re-run"}
          </button>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ background: "rgba(124, 92, 252, 0.1)", color: "#7C5CFC" }}
          >
            Generative Engine Optimization
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">AI Readiness</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            How well your site can be found, extracted, and cited by ChatGPT, Perplexity, Claude, and Google AI Overviews.
          </p>
        </div>

        {loading && (
          <div className="card-static p-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Analyzing your pages...</p>
          </div>
        )}

        {error && (
          <div className="card-static p-10 text-center">
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{error}</p>
            <Link
              href={`/domain/${domainId}/audit`}
              className="inline-block px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Run an audit first
            </Link>
          </div>
        )}

        {report && !loading && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Score */}
              <div className="card-static p-7 flex flex-col items-center justify-center fade-in">
                <GEOScoreCircle score={report.overallScore} />
                <p className="mt-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  AI Readiness Score
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {report.pagesAnalyzed} pages analyzed
                </p>
              </div>

              {/* AI Crawler Status */}
              <div className="card-static p-6 fade-in">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                  AI Crawler Access
                </p>
                {report.aiCrawlers.checked ? (
                  <>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-2xl font-bold tabular-nums" style={{ color: report.aiCrawlers.blocked.length === 0 ? "#22c55e" : "#f97316" }}>
                        {report.aiCrawlers.allowed.length}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        of {report.aiCrawlers.allowed.length + report.aiCrawlers.blocked.length} bots allowed
                      </span>
                    </div>
                    {report.aiCrawlers.blocked.length > 0 && (
                      <p className="text-xs" style={{ color: "#f97316" }}>
                        Blocked: {report.aiCrawlers.blocked.join(", ")}
                      </p>
                    )}
                    {report.aiCrawlers.wildcardBlock && (
                      <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                        Wildcard disallow — all bots blocked
                      </p>
                    )}
                    {report.aiCrawlers.blocked.length === 0 && !report.aiCrawlers.wildcardBlock && (
                      <p className="text-xs" style={{ color: "#22c55e" }}>
                        All major AI engines can crawl your site
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Could not fetch robots.txt
                  </p>
                )}
              </div>

            </div>

            {/* Row 2: Top issues + Pages by score side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Top issues */}
              {report.topIssues.length > 0 && (
                <div className="card-static p-7 fade-in">
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                    Top issues
                  </h2>
                  <div className="space-y-3">
                    {report.topIssues.map((issue, i) => {
                      const isOpen = expandedIssue === i;
                      return (
                        <div key={i} className="rounded-lg overflow-hidden" style={{ background: "var(--bg)" }}>
                          <button
                            onClick={() => setExpandedIssue(isOpen ? null : i)}
                            className="w-full flex items-start gap-4 p-4 text-left cursor-pointer"
                          >
                            <SeverityBadge severity={issue.severity} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold mb-1">{issue.issue}</p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                {issue.recommendation}
                              </p>
                              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                                Affects {issue.affectedCount} page{issue.affectedCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", marginTop: 4, flexShrink: 0 }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {isOpen && issue.affectedPages.length > 0 && (
                            <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
                              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                                Affected pages
                              </p>
                              <div className="space-y-2">
                                {issue.affectedPages.map((page, j) => (
                                  <div key={j} className="p-2.5 rounded-md" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
                                    <p className="text-xs font-medium" style={{ wordBreak: "break-word" }}>{page.title || page.url}</p>
                                    <p className="text-[11px] mb-1.5" style={{ color: "var(--text-muted)", wordBreak: "break-all" }}>{page.url}</p>
                                    <p className="text-[11px]" style={{ color: "var(--accent)", wordBreak: "break-word" }}>{page.suggestion}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-page scores */}
              <div className="card-static p-7 fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Pages by score
                </h2>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Lowest first — fix these to improve AI readiness
                </span>
              </div>
              <div className="space-y-2">
                {report.pageScores.map((page) => {
                  const isExpanded = expandedPage === page.pageId;
                  return (
                    <div
                      key={page.pageId}
                      className="rounded-lg overflow-hidden"
                      style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
                    >
                      <button
                        onClick={() => setExpandedPage(isExpanded ? null : page.pageId)}
                        className="w-full p-4 flex items-center gap-4 text-left cursor-pointer"
                      >
                        <div
                          className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm"
                          style={{
                            background: page.score >= 80 ? "#dcfce7" : page.score >= 60 ? "#fef9c3" : "#fee2e2",
                            color: page.score >= 80 ? "#166534" : page.score >= 60 ? "#854d0e" : "#991b1b",
                          }}
                        >
                          {page.score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {page.title || "Untitled"}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {page.url}
                          </p>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
                          {/* Checks */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                            <CheckPill label="Title" ok={page.checks.hasClearTitle} />
                            <CheckPill label="Meta desc" ok={page.checks.hasMetaDescription} />
                            <CheckPill label="H1" ok={page.checks.hasH1} />
                            <CheckPill label="Content ≥300w" ok={page.checks.hasMinContent} />
                            <CheckPill label="Schema" ok={page.checks.hasSchema} />
                            <CheckPill label="FAQ schema" ok={page.checks.hasFaqSchema} />
                            <CheckPill label="Article schema" ok={page.checks.hasArticleSchema} />
                            <CheckPill label="Canonical" ok={page.checks.canonicalSet} />
                          </div>

                          {/* Suggestions */}
                          {page.suggestions.length > 0 && (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                                Fix suggestions
                              </p>
                              <ul className="space-y-1.5">
                                {page.suggestions.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                                    <span style={{ color: "var(--accent)" }}>→</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>

            {/* Row 3: llms.txt status + llms.txt generator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* llms.txt status */}
              <div className="card-static p-7 fade-in">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                  llms.txt
                </p>
                {report.hasLlmsTxt ? (
                  <>
                    <p className="text-sm font-semibold mb-2" style={{ color: "#22c55e" }}>
                      Detected
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      AI engines can find your content instructions.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold mb-2" style={{ color: "#f97316" }}>
                      Not detected
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      AI engines can&apos;t find content instructions for your site.
                    </p>
                  </>
                )}
              </div>

              {/* llms.txt generator */}
              <div className="card-static p-7 fade-in" style={{ background: "linear-gradient(135deg, #4F6EF705, #7C5CFC05)", border: "1px solid #4F6EF720" }}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#4F6EF715" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">llms.txt generator</h3>
                    <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                      Auto-generate an <code style={{ background: "var(--bg)", padding: "2px 4px", borderRadius: 3 }}>llms.txt</code> file from your crawled pages.
                      Upload it to your site root at <code style={{ background: "var(--bg)", padding: "2px 4px", borderRadius: 3 }}>/llms.txt</code> so AI engines know what to index.
                    </p>
                    <button
                      onClick={downloadLlmsTxt}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                      style={{ background: "#4F6EF7" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download llms.txt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GEOScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="40" fill="none" stroke="var(--border-light)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>/ 100</span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "high" | "medium" | "low" }) {
  const config = {
    high: { bg: "#fee2e2", color: "#991b1b", label: "High" },
    medium: { bg: "#fef9c3", color: "#854d0e", label: "Medium" },
    low: { bg: "#dcfce7", color: "#166534", label: "Low" },
  }[severity];
  return (
    <span
      className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function CheckPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
      style={{
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {ok ? <polyline points="20 6 9 17 4 12" /> : <line x1="18" y1="6" x2="6" y2="18" />}
      </svg>
      <span className="font-medium">{label}</span>
    </div>
  );
}
