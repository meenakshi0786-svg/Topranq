"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

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
  const [llmsDownloaded, setLlmsDownloaded] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  usePageTitle("AI Readiness (GEO)");

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

  function downloadAsset(action: string) {
    window.location.href = `/api/domains/${domainId}/geo?action=${action}`;
    setLlmsDownloaded(true);
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
            {loading ? "Refreshing..." : "Refresh"}
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
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map((i) => (
                <div key={i} className="card-static p-7 animate-pulse">
                  <div className="w-24 h-3 rounded mb-4" style={{ background: "var(--border-light)" }} />
                  <div className="w-20 h-8 rounded mb-2" style={{ background: "var(--border-light)" }} />
                  <div className="w-40 h-3 rounded" style={{ background: "var(--border-light)" }} />
                </div>
              ))}
            </div>
            <div className="card-static p-7 animate-pulse">
              <div className="w-32 h-3 rounded mb-4" style={{ background: "var(--border-light)" }} />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-12 rounded-lg" style={{ background: "var(--border-light)" }} />
                ))}
              </div>
            </div>
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
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-2xl font-bold tabular-nums" style={{ color: report.aiCrawlers.blocked.length === 0 ? "#22c55e" : "#f97316" }}>
                        {report.aiCrawlers.allowed.length}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        of {report.aiCrawlers.allowed.length + report.aiCrawlers.blocked.length} bots allowed
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {report.aiCrawlers.allowed.map((bot) => (
                        <span key={bot} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "var(--low-bg)", color: "var(--success)" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          {bot}
                        </span>
                      ))}
                      {report.aiCrawlers.blocked.map((bot) => (
                        <span key={bot} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "var(--critical-bg)", color: "var(--critical)" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          {bot}
                        </span>
                      ))}
                    </div>
                    {report.aiCrawlers.wildcardBlock && (
                      <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                        Wildcard disallow — all bots blocked
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
                                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ wordBreak: "break-word", color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2 }}>
                                      {page.title || page.url}
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginLeft: 4, verticalAlign: "middle" }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                    </a>
                                    <p className="text-[11px] mb-1.5" style={{ color: "var(--text-muted)", wordBreak: "break-all" }}>{page.url}</p>
                                    <p className="text-[11px]" style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>{page.suggestion}</p>
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

            {/* GEO AI Assets Toolkit */}
            <div className="mb-5">
              <div className="card-static p-7 fade-in" style={{ background: "linear-gradient(135deg, #4F6EF705, #7C5CFC05)", border: "1px solid #4F6EF720" }}>
                <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  AI Optimization Toolkit
                </h2>
                <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
                  Generate files that help AI engines understand, retrieve, and cite your site.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <AssetCard
                    title="llms.txt"
                    desc="Standard AI-optimized index with grouped URLs, about section, and key topics."
                    tag="Standard"
                    onClick={() => downloadAsset("llms-txt")}
                    guide={{
                      whatItIs: "The standard file AI crawlers look for — like robots.txt but for LLMs. Contains your site summary, grouped page index, key topics, capabilities, and use cases.",
                      whereToUpload: "Root of your website → your-domain.com/llms.txt (same directory as robots.txt and sitemap.xml).",
                      howToUploadWP: [
                        "Go to your WordPress admin panel",
                        "Install and activate the File Manager plugin (or use FTP / cPanel)",
                        "Navigate to the root directory where wp-config.php lives",
                        "Upload the downloaded llms.txt file",
                        "Verify by visiting your-domain.com/llms.txt",
                      ],
                      howToUploadShopify: [
                        "Go to Shopify Admin → Online Store → Themes",
                        "Click Actions → Edit code",
                        "Under Templates, click Add a new template",
                        "Create a page template named llms-txt",
                        "Paste your llms.txt content into the template",
                        "Go to Pages → Add page, set URL handle to llms.txt and assign the template",
                        "Verify at your-domain.com/pages/llms.txt",
                      ],
                      whoReadsIt: "GPTBot (ChatGPT), ClaudeBot (Claude), PerplexityBot (Perplexity), Google-Extended (AI Overviews), and any LLM crawler that checks for it.",
                      impact: "Baseline for AI discovery. Without it, AI engines guess what your site is about. With it, you control the narrative.",
                    }}
                  />
                </div>

                    {llmsDownloaded && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>
                            Your llms.txt is ready to be uploaded
                          </p>
                        </div>
                        <button
                          onClick={() => setShowUploadGuide(!showUploadGuide)}
                          className="flex items-center gap-2 text-xs font-semibold cursor-pointer"
                          style={{ color: "var(--accent)" }}
                        >
                          How to add this to your store
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: showUploadGuide ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {showUploadGuide && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* WordPress Guide */}
                            <div className="p-5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                              <div className="flex items-center gap-2 mb-4">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#21759b"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.178.25-2.3.69-3.318L8.08 20.26A8.57 8.57 0 013.443 12zm8.557 8.557c-.879 0-1.723-.141-2.514-.396l2.67-7.758 2.736 7.497c.018.044.04.085.063.124a8.525 8.525 0 01-2.955.533z" /></svg>
                                <p className="text-sm font-bold">WordPress</p>
                              </div>
                              <ol className="space-y-2.5 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>1.</span> Open your WordPress admin panel</li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>2.</span> Install the <strong>File Manager</strong> plugin (or use FTP / cPanel)</li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>3.</span> Go to the root directory where <code style={{ background: "var(--bg-white)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>wp-config.php</code> lives</li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>4.</span> Upload the <code style={{ background: "var(--bg-white)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>llms.txt</code> file</li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>5.</span> Verify at <code style={{ background: "var(--bg-white)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>your-domain.com/llms.txt</code></li>
                              </ol>
                            </div>

                            {/* Shopify Guide */}
                            <div className="p-5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                              <div className="flex items-center gap-2 mb-4">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#96bf48"><path d="M15.337 3.178c-.07-.024-.138.018-.158.088-.018.06-.3 1.03-.3 1.03a3.25 3.25 0 00-.87-.33c-.03-.39-.07-.95-.14-1.28-.19-.96-.76-1.46-1.45-1.46h-.06c-.05-.06-.12-.12-.18-.16C11.677.7 11.157.84 10.737 1.38c-.54.7-.95 1.74-1.07 2.5a13.33 13.33 0 00-1.41.44c-.43.14-.44.15-.5.56-.04.3-1.17 9.02-1.17 9.02l8.76 1.52.04-.02V3.26c-.01-.04-.02-.07-.05-.08z" /></svg>
                                <p className="text-sm font-bold">Shopify</p>
                              </div>
                              <ol className="space-y-2.5 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>1.</span> Go to <strong>Online Store</strong> &rarr; <strong>Themes</strong> &rarr; <strong>Edit code</strong></li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>2.</span> Under <strong>Templates</strong>, click <strong>Add a new template</strong></li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>3.</span> Name it <code style={{ background: "var(--bg-white)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>llms-txt</code></li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>4.</span> Paste your llms.txt content into the template</li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>5.</span> Go to <strong>Pages</strong> &rarr; <strong>Add page</strong></li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>6.</span> Set URL handle to <code style={{ background: "var(--bg-white)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>llms.txt</code> and assign the template</li>
                                <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>7.</span> Verify at <code style={{ background: "var(--bg-white)", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>your-domain.com/pages/llms.txt</code></li>
                              </ol>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

interface AssetGuide {
  whatItIs: string;
  whereToUpload: string;
  howToUploadWP: string[];
  howToUploadShopify: string[];
  whoReadsIt: string;
  impact: string;
}

function AssetCard({ title, desc, tag, onClick, guide }: { title: string; desc: string; tag: string; onClick: () => void; guide: AssetGuide }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
      <div className="p-4 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#4F6EF715" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold">{title}</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "#4F6EF715", color: "#4F6EF7" }}>{tag}</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{desc}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white cursor-pointer"
              style={{ background: "#4F6EF7" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Generate
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs cursor-pointer"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
            >
              Guide
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
          <div className="space-y-2.5 mt-2">
            <GuideRow label="What it is" text={guide.whatItIs} />
            <GuideRow label="Where to upload" text={guide.whereToUpload} />
            <HowToUploadSection wpSteps={guide.howToUploadWP} shopifySteps={guide.howToUploadShopify} />
            <GuideRow label="Who reads it" text={guide.whoReadsIt} />
            <GuideRow label="Impact" text={guide.impact} />
          </div>
        </div>
      )}
    </div>
  );
}

function GuideRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--accent)" }}>{label}</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>{text}</p>
    </div>
  );
}

function HowToUploadSection({ wpSteps, shopifySteps }: { wpSteps: string[]; shopifySteps: string[] }) {
  const [showWP, setShowWP] = useState(false);
  const [showShopify, setShowShopify] = useState(false);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>How to upload</p>
      <div className="space-y-1.5">
        {/* WordPress */}
        <button onClick={() => setShowWP(!showWP)} className="w-full flex items-center gap-2 p-2.5 rounded-md text-left cursor-pointer" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#21759b"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.178.25-2.3.69-3.318L8.08 20.26A8.57 8.57 0 013.443 12zm8.557 8.557c-.879 0-1.723-.141-2.514-.396l2.67-7.758 2.736 7.497c.018.044.04.085.063.124a8.525 8.525 0 01-2.955.533z" /></svg>
          <span className="flex-1 text-xs font-semibold">WordPress</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showWP ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {showWP && (
          <ol className="space-y-1.5 pl-3 py-2">
            {wpSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <span className="font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Shopify */}
        <button onClick={() => setShowShopify(!showShopify)} className="w-full flex items-center gap-2 p-2.5 rounded-md text-left cursor-pointer" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#96bf48"><path d="M15.337 3.178c-.07-.024-.138.018-.158.088-.018.06-.3 1.03-.3 1.03a3.25 3.25 0 00-.87-.33c-.03-.39-.07-.95-.14-1.28-.19-.96-.76-1.46-1.45-1.46h-.06c-.05-.06-.12-.12-.18-.16C11.677.7 11.157.84 10.737 1.38c-.54.7-.95 1.74-1.07 2.5a13.33 13.33 0 00-1.41.44c-.43.14-.44.15-.5.56-.04.3-1.17 9.02-1.17 9.02l8.76 1.52.04-.02V3.26c-.01-.04-.02-.07-.05-.08z" /></svg>
          <span className="flex-1 text-xs font-semibold">Shopify</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showShopify ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {showShopify && (
          <ol className="space-y-1.5 pl-3 py-2">
            {shopifySteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <span className="font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
