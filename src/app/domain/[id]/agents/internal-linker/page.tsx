"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

// ── Types ─────────────────────────────────────────────────────────────

interface CreditInfo {
  plan: string;
  credits: { total: number; used: number; remaining: number };
}

interface AgentJob {
  id: string;
  agentType: string;
  status: string;
  config: Record<string, unknown>;
  output: Record<string, unknown> | null;
  creditsUsed: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface LinkerResult {
  suggestions: Array<{
    sourceUrl: string;
    sourceTitle: string;
    targetUrl: string;
    targetTitle: string;
    anchorText: string;
    reason: string;
    priority: string;
  }>;
  orphanPages: Array<{ url: string; title: string }>;
  stats: {
    totalPages: number;
    totalExistingLinks: number;
    orphanCount: number;
    suggestionsGenerated: number;
    avgLinksPerPage: number;
  };
  articleLinking?: {
    linksAdded: Array<{ fromAnchor: string; toUrl: string; reason: string; section: string; confidence: number }>;
    skippedOpportunities: Array<{ suggestedAnchor: string; suggestedTargetTopic: string; reason: string }>;
    counts: { totalLinks: number; uniqueTargets: number };
    linkReport: {
      totalLinksAdded: number;
      entries: Array<{ url: string; anchorText: string; section: string; justification: string }>;
      qualityChecks: {
        allRelevant: boolean;
        noGenericAnchors: boolean;
        noKeywordStuffing: boolean;
        evenDistribution: boolean;
        passed: boolean;
      };
    };
  };
}

// ── Component ─────────────────────────────────────────────────────────

export default function InternalLinkerPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [maxSuggestions, setMaxSuggestions] = useState(20);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<LinkerResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"overview" | "suggestions" | "orphans">("overview");
  const [showHtmlSnippets, setShowHtmlSnippets] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState<Array<{ suggestion: string; status: string; message: string }> | null>(null);
  const [connectors, setConnectors] = useState<Array<{ platform: string; siteUrl: string; status: string }>>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const [creditsRes, jobsRes, connRes] = await Promise.all([
      fetch("/api/credits"),
      fetch(`/api/agents/jobs?domainId=${domainId}`),
      fetch(`/api/domains/${domainId}/connectors`),
    ]);
    if (creditsRes.ok) setCredits(await creditsRes.json());
    if (jobsRes.ok) {
      const all: AgentJob[] = await jobsRes.json();
      setJobs(all.filter((j) => j.agentType === "internal_linker"));
    }
    if (connRes.ok) setConnectors(await connRes.json());
  }, [domainId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-show latest result
  useEffect(() => {
    if (result || jobs.length === 0) return;
    const latest = jobs.find((j) => j.status === "complete" && j.output);
    if (latest) setResult(latest.output as unknown as LinkerResult);
  }, [jobs, result]);

  function showResult(r: LinkerResult) {
    setResult(r);
    setActiveResultTab("overview");
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function deploy() {
    setDeploying(true);
    setResult(null);
    try {
      const res = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, agentType: "internal_linker", config: { maxSuggestions } }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Deployment failed");
      } else {
        showResult(data.output as LinkerResult);
      }
      await fetchData();
    } catch {
      alert("Something went wrong");
    } finally {
      setDeploying(false);
    }
  }

  // ── Option 1: CSV Export ──
  function downloadCSV() {
    if (!result?.suggestions) return;
    const header = "Priority,Source Page,Source URL,Target Page,Target URL,Anchor Text,HTML Snippet,Reason\n";
    const rows = result.suggestions.map((s) =>
      [
        s.priority,
        `"${s.sourceTitle.replace(/"/g, '""')}"`,
        s.sourceUrl,
        `"${s.targetTitle.replace(/"/g, '""')}"`,
        s.targetUrl,
        `"${s.anchorText.replace(/"/g, '""')}"`,
        `"<a href=""${s.targetUrl}"">${s.anchorText}</a>"`,
        `"${s.reason.replace(/"/g, '""')}"`,
      ].join(",")
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `internal-link-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Option 2: Copy HTML snippet ──
  function copySnippet(idx: number, html: string) {
    navigator.clipboard.writeText(html);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  // ── Option 5: Send email ──
  async function sendEmailReport() {
    if (!emailTo || !result) return;
    setEmailSending(true);
    try {
      const res = await fetch("/api/internal-linker/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: emailTo,
          recipientName: emailName,
          domainUrl: window.location.hostname,
          suggestions: result.suggestions,
          orphanPages: result.orphanPages,
          stats: result.stats,
        }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => { setShowEmailModal(false); setEmailSent(false); setEmailTo(""); setEmailName(""); }, 2000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send email");
      }
    } catch {
      alert("Failed to send email");
    } finally {
      setEmailSending(false);
    }
  }

  // ── Option 4: Push to CMS ──
  async function pushToCMS(platform: string) {
    if (!result?.suggestions) return;
    setPushing(true);
    setPushResults(null);
    try {
      const res = await fetch("/api/internal-linker/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, suggestions: result.suggestions, platform }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushResults(data.results);
      } else {
        alert(data.error || "Push failed");
      }
    } catch {
      alert("Push failed");
    } finally {
      setPushing(false);
    }
  }

  const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: "#fef2f2", text: "#dc2626", label: "High Priority" },
    medium: { bg: "#fffbeb", text: "#d97706", label: "Medium" },
    low: { bg: "#ecfdf5", text: "#16a34a", label: "Low" },
  };

  // Health score (simple heuristic from stats)
  const healthScore = result?.stats
    ? Math.max(0, Math.min(100, Math.round(
        100
        - (result.stats.orphanCount / Math.max(1, result.stats.totalPages)) * 50
        - Math.max(0, 3 - result.stats.avgLinksPerPage) * 15
      )))
    : null;

  const healthColor = healthScore !== null
    ? healthScore >= 70 ? "#22c55e" : healthScore >= 40 ? "#f59e0b" : "#ef4444"
    : "#999";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}/agents`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Agents</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">Internal Linker</span>
          </div>
          {credits && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /></svg>
              {Math.floor(credits.credits.remaining)} credits
            </span>
          )}
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* ── Hero Section ── */}
        <div className="mb-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#7C5CFC15" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">Internal Linker</h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: 600 }}>
                Internal links connect pages on your website to each other. They help Google discover your pages, understand your site structure, and pass ranking power between pages.
              </p>
            </div>
          </div>

          {/* How it works — 3 step visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Scan Your Site",
                desc: "We crawl all your pages and map every existing internal link between them.",
                icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
              },
              {
                step: "2",
                title: "Find Gaps",
                desc: "We identify orphan pages (pages with no links pointing to them) and missed linking opportunities.",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
              },
              {
                step: "3",
                title: "Get Suggestions",
                desc: "Get actionable suggestions with the exact anchor text and page pairs to link, sorted by priority.",
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
              },
            ].map((s) => (
              <div key={s.step} className="p-5 rounded-xl" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "#7C5CFC" }}>
                    {s.step}
                  </div>
                  <h3 className="text-sm font-bold">{s.title}</h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Run Analysis Card ── */}
        <div className="card-static p-6 mb-8 fade-in" style={{ border: "2px solid #7C5CFC30" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-base font-bold mb-1">Run Link Analysis</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Scans all crawled pages on your domain, maps existing links, finds orphan pages, and generates linking suggestions ranked by impact.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Depth</label>
                <select
                  value={maxSuggestions}
                  onChange={(e) => setMaxSuggestions(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", minWidth: 140 }}
                >
                  <option value={10}>Quick (10)</option>
                  <option value={20}>Standard (20)</option>
                  <option value={50}>Deep (50)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>&nbsp;</label>
                <button
                  onClick={deploy}
                  disabled={deploying}
                  className="px-6 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40 flex items-center gap-2"
                  style={{ background: "#7C5CFC", minWidth: 160 }}
                >
                  {deploying ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                      Scanning...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Run Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Costs 7 credits per run. {credits ? `You have ${Math.floor(credits.credits.remaining)} credits remaining.` : ""}
          </p>
        </div>

        {/* ── Results Section ── */}
        <div ref={resultRef}>
          {result && (
            <div className="fade-in">
              {/* Empty state */}
              {(!result.stats || result.stats.totalPages === 0) ? (
                <div className="card-static p-10 text-center mb-8">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" className="mx-auto mb-4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <h3 className="text-base font-bold mb-2">No Pages Found</h3>
                  <p className="text-sm mb-4" style={{ color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
                    You need to run an audit first so we can crawl your pages. Once we have your site&apos;s pages, we can analyze the internal link structure.
                  </p>
                  <Link
                    href={`/domain/${domainId}/audit`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    Run Audit First
                  </Link>
                </div>
              ) : (
                <>
                  {/* Health Score + Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 mb-6">
                    {/* Health Score Circle */}
                    <div className="card-static p-6 flex flex-col items-center justify-center">
                      <div className="relative w-24 h-24 mb-3">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-light)" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke={healthColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(healthScore || 0) * 2.64} 264`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold tabular-nums" style={{ color: healthColor }}>{healthScore}</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: healthColor }}>
                        {healthScore !== null && healthScore >= 70 ? "Healthy" : healthScore !== null && healthScore >= 40 ? "Needs Work" : "Poor"}
                      </p>
                      <p className="text-xs mt-1 text-center" style={{ color: "var(--text-muted)" }}>Link Health Score</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Pages Scanned", value: result.stats.totalPages, icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "#7C5CFC" },
                        { label: "Existing Links", value: result.stats.totalExistingLinks, icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101", color: "#3b82f6" },
                        { label: "Orphan Pages", value: result.stats.orphanCount, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z", color: result.stats.orphanCount > 0 ? "#ef4444" : "#22c55e" },
                        { label: "Avg Links / Page", value: result.stats.avgLinksPerPage, icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", color: result.stats.avgLinksPerPage >= 3 ? "#22c55e" : "#f59e0b" },
                      ].map((stat) => (
                        <div key={stat.label} className="card-static p-4 flex flex-col items-center text-center">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: stat.color + "12" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={stat.icon} /></svg>
                          </div>
                          <p className="text-xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
                    {[
                      { id: "overview" as const, label: "Suggestions", count: result.suggestions?.length || 0 },
                      { id: "orphans" as const, label: "Orphan Pages", count: result.orphanPages?.length || 0 },
                      { id: "suggestions" as const, label: "Link Report", count: result.articleLinking?.linkReport?.totalLinksAdded || 0 },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveResultTab(tab.id)}
                        className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all flex items-center justify-center gap-2"
                        style={{
                          background: activeResultTab === tab.id ? "#7C5CFC" : "transparent",
                          color: activeResultTab === tab.id ? "white" : "var(--text-muted)",
                        }}
                      >
                        {tab.label}
                        {tab.count > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md font-bold tabular-nums"
                            style={{
                              background: activeResultTab === tab.id ? "rgba(255,255,255,0.2)" : "var(--bg)",
                              color: activeResultTab === tab.id ? "white" : "var(--text-muted)",
                            }}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* ── Action Bar (Options 1-5) ── */}
                  <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
                    {/* Option 1: Download CSV */}
                    <button
                      onClick={downloadCSV}
                      disabled={!result.suggestions?.length}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-30 transition-all"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      Download CSV
                    </button>

                    {/* Option 2: Show HTML Snippets */}
                    <button
                      onClick={() => setShowHtmlSnippets(!showHtmlSnippets)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        background: showHtmlSnippets ? "#7C5CFC" : "var(--bg)",
                        border: showHtmlSnippets ? "1px solid #7C5CFC" : "1px solid var(--border)",
                        color: showHtmlSnippets ? "white" : "var(--text-primary)",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                      {showHtmlSnippets ? "Hide HTML" : "Show HTML Snippets"}
                    </button>

                    {/* Option 4: Push to CMS */}
                    {connectors.filter((c) => c.status === "connected").length > 0 && (
                      <button
                        onClick={() => { setShowPushModal(true); setPushResults(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                        Push to CMS
                      </button>
                    )}

                    {/* Option 5: Email Report */}
                    <button
                      onClick={() => { setShowEmailModal(true); setEmailSent(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      Email Report
                    </button>

                    {/* Option 3 indicator */}
                    <span className="flex items-center gap-1.5 px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                      Auto-links articles you generate
                    </span>
                  </div>

                  {/* Tab: Suggestions */}
                  {activeResultTab === "overview" && (
                    <div className="space-y-3 mb-8">
                      {result.suggestions?.length === 0 ? (
                        <div className="card-static p-8 text-center">
                          <p className="text-sm font-medium mb-1">No new suggestions</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Your internal linking looks solid! No new opportunities found.</p>
                        </div>
                      ) : (
                        result.suggestions?.map((s, i) => {
                          const p = priorityColors[s.priority] || priorityColors.low;
                          const htmlSnippet = `<a href="${s.targetUrl}">${s.anchorText}</a>`;
                          return (
                            <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                              <div className="flex items-start gap-3">
                                {/* Priority indicator */}
                                <div className="shrink-0 mt-0.5">
                                  <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: p.bg, color: p.text }}>
                                    {p.label}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  {/* From → To */}
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      <span className="text-sm font-medium truncate">{s.sourceTitle}</span>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" className="shrink-0"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      <span className="text-sm font-medium truncate" style={{ color: "#7C5CFC" }}>{s.targetTitle}</span>
                                    </div>
                                  </div>
                                  {/* Anchor text suggestion */}
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Use anchor text:</span>
                                    <code className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "#7C5CFC10", color: "#7C5CFC", fontFamily: "inherit" }}>
                                      &ldquo;{s.anchorText}&rdquo;
                                    </code>
                                  </div>
                                  {/* Reason */}
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.reason}</p>

                                  {/* Option 2: HTML Snippet (toggled) */}
                                  {showHtmlSnippets && (
                                    <div className="mt-3 flex items-center gap-2">
                                      <code className="flex-1 text-xs px-3 py-2 rounded-lg" style={{ background: "#1e1e2e", color: "#a6e3a1", fontFamily: "monospace", fontSize: 11 }}>
                                        {htmlSnippet}
                                      </code>
                                      <button
                                        onClick={() => copySnippet(i, htmlSnippet)}
                                        className="shrink-0 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all"
                                        style={{
                                          background: copiedIdx === i ? "#22c55e" : "var(--bg)",
                                          color: copiedIdx === i ? "white" : "var(--text-primary)",
                                          border: "1px solid var(--border)",
                                        }}
                                      >
                                        {copiedIdx === i ? "Copied!" : "Copy"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Tab: Orphan Pages */}
                  {activeResultTab === "orphans" && (
                    <div className="mb-8">
                      {result.orphanPages?.length === 0 ? (
                        <div className="card-static p-8 text-center">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "#ecfdf5" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                          </div>
                          <p className="text-sm font-medium mb-1">No orphan pages found!</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Every page on your site has at least one internal link pointing to it.</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 rounded-xl mb-4" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                            <div className="flex items-start gap-3">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" className="shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>
                                  {result.orphanPages.length} orphan page{result.orphanPages.length !== 1 ? "s" : ""} found
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: "#b91c1c" }}>
                                  These pages have zero internal links pointing to them. Google may not discover or rank them properly. Add internal links from related content to fix this.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {result.orphanPages.map((p, i) => (
                              <div key={i} className="card-static p-4 flex items-center gap-3 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M15 9l-6 6M9 9l6 6" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.title}</p>
                                  <p className="text-xs truncate" style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 10 }}>{p.url}</p>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 rounded-md shrink-0" style={{ background: "#fef2f2", color: "#ef4444" }}>0 inbound links</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab: Link Report (article-level) */}
                  {activeResultTab === "suggestions" && (
                    <div className="mb-8">
                      {!result.articleLinking?.linkReport ? (
                        <div className="card-static p-8 text-center">
                          <p className="text-sm font-medium mb-1">No article-level link report</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Article-level link reports are generated when the Internal Linker runs on a specific article (e.g., after generating a blog post). Domain-wide analysis shows in the Suggestions tab.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Quality Checks */}
                          <div className="card-static p-5 mb-4" style={{ border: `1px solid ${result.articleLinking.linkReport.qualityChecks.passed ? "#a7f3d0" : "#fecaca"}` }}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: result.articleLinking.linkReport.qualityChecks.passed ? "#ecfdf5" : "#fef2f2" }}>
                                {result.articleLinking.linkReport.qualityChecks.passed ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold">Quality Check</p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {result.articleLinking.linkReport.qualityChecks.passed ? "All checks passed" : "Some issues detected"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: "All links relevant", ok: result.articleLinking.linkReport.qualityChecks.allRelevant },
                                { label: "No generic anchors", ok: result.articleLinking.linkReport.qualityChecks.noGenericAnchors },
                                { label: "No keyword stuffing", ok: result.articleLinking.linkReport.qualityChecks.noKeywordStuffing },
                                { label: "Evenly distributed", ok: result.articleLinking.linkReport.qualityChecks.evenDistribution },
                              ].map((check) => (
                                <div key={check.label} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: check.ok ? "#f0fdf4" : "#fef2f2" }}>
                                  <span className="text-sm">{check.ok ? "✓" : "✗"}</span>
                                  <span className="text-xs font-medium" style={{ color: check.ok ? "#166534" : "#991b1b" }}>{check.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Link entries */}
                          <p className="text-sm font-bold mb-3">{result.articleLinking.linkReport.totalLinksAdded} links inserted into article</p>
                          <div className="space-y-2">
                            {result.articleLinking.linkReport.entries.map((entry, i) => (
                              <div key={i} className="card-static p-4 fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#7C5CFC" }}>{i + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium mb-0.5">&ldquo;{entry.anchorText}&rdquo;</p>
                                    <p className="text-xs truncate mb-1" style={{ color: "#7C5CFC", fontFamily: "monospace", fontSize: 10 }}>{entry.url}</p>
                                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                      <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg)" }}>Section: {entry.section}</span>
                                      <span>{entry.justification}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Close results */}
              <div className="text-center mb-8">
                <button onClick={() => setResult(null)} className="text-xs font-medium cursor-pointer px-4 py-2 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-white)", border: "1px solid var(--border-light)" }}>
                  Close Results
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Email Report Modal (Option 5) ── */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--bg-white)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
              <div className="p-6" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#7C5CFC15" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Email Report</h2>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Send the full link analysis to your client or team</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEmailModal(false)} className="p-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {emailSent ? (
                  <div className="py-6 text-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "#ecfdf5" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                    </div>
                    <p className="text-sm font-bold">Report Sent!</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>The report has been emailed to {emailTo}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>Recipient Email *</label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>Recipient Name (optional)</label>
                      <input
                        type="text"
                        value={emailName}
                        onChange={(e) => setEmailName(e.target.value)}
                        placeholder="John Smith"
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                      />
                    </div>
                    <div className="p-3 rounded-lg text-xs" style={{ background: "var(--bg)" }}>
                      <p style={{ color: "var(--text-muted)" }}>
                        The email will include: {result?.suggestions?.length || 0} linking suggestions, {result?.orphanPages?.length || 0} orphan pages, health stats, and ready-to-use HTML snippets.
                      </p>
                    </div>
                    <button
                      onClick={sendEmailReport}
                      disabled={!emailTo || emailSending}
                      className="w-full py-3 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: "#7C5CFC" }}
                    >
                      {emailSending ? (
                        <>
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                          Send Report
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Push to CMS Modal (Option 4) ── */}
        {showPushModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--bg-white)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
              <div className="p-6" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#7C5CFC15" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Push to CMS</h2>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Send link suggestions to your connected platform</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPushModal(false)} className="p-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                {!pushResults ? (
                  <div className="space-y-3">
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                      Choose a connected platform to push {result?.suggestions?.length || 0} link suggestions:
                    </p>
                    {connectors.filter((c) => c.status === "connected").map((c) => {
                      const platformNames: Record<string, string> = { wordpress: "WordPress", shopify: "Shopify", webflow: "Webflow", webhook: "Custom Webhook" };
                      const platformColors: Record<string, string> = { wordpress: "#21759b", shopify: "#95BF47", webflow: "#4353FF", webhook: "#6366f1" };
                      return (
                        <button
                          key={c.platform}
                          onClick={() => pushToCMS(c.platform)}
                          disabled={pushing}
                          className="w-full flex items-center gap-3 p-4 rounded-xl text-left cursor-pointer transition-all disabled:opacity-40"
                          style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = platformColors[c.platform] || "#7C5CFC"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: (platformColors[c.platform] || "#7C5CFC") + "15" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={platformColors[c.platform] || "#7C5CFC"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{platformNames[c.platform] || c.platform}</p>
                            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{c.siteUrl}</p>
                          </div>
                          {pushing && (
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                      <p className="text-sm font-bold">Push Complete</p>
                    </div>
                    {pushResults.map((r, i) => (
                      <div key={i} className="p-3 rounded-lg text-xs" style={{ background: r.status === "sent" || r.status === "ready" ? "#ecfdf5" : r.status === "error" ? "#fef2f2" : "var(--bg)", border: `1px solid ${r.status === "error" ? "#fecaca" : "var(--border-light)"}` }}>
                        <p className="font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>{r.suggestion}</p>
                        <p style={{ color: "var(--text-muted)" }}>{r.message}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowPushModal(false)}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer mt-2"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Past Runs ── */}
        {jobs.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Past Analyses
            </h2>
            <div className="space-y-2">
              {jobs.map((job, i) => {
                const jobOutput = job.output as unknown as LinkerResult | null;
                const isActive = result && job.output && JSON.stringify(job.output) === JSON.stringify(result);
                return (
                  <div
                    key={job.id}
                    className="card-static p-4 fade-in transition-all"
                    style={{
                      animationDelay: `${i * 0.02}s`,
                      cursor: job.status === "complete" && job.output ? "pointer" : "default",
                      border: isActive ? "2px solid #7C5CFC" : "1px solid var(--border-light)",
                    }}
                    onClick={() => {
                      if (job.status === "complete" && jobOutput) {
                        showResult(jobOutput);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#7C5CFC15" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Link Analysis</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {" · "}{String((job.config as Record<string, unknown>)?.maxSuggestions || 20)} max suggestions
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Quick stats from output */}
                        {jobOutput?.stats && (
                          <div className="hidden md:flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                            <span>{jobOutput.stats.totalPages} pages</span>
                            <span>·</span>
                            <span style={{ color: jobOutput.stats.orphanCount > 0 ? "#ef4444" : "#22c55e" }}>
                              {jobOutput.stats.orphanCount} orphans
                            </span>
                            <span>·</span>
                            <span>{jobOutput.stats.suggestionsGenerated} suggestions</span>
                          </div>
                        )}
                        <StatusBadge status={job.status} />
                        {job.status === "complete" && job.output && (
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#7C5CFC", color: "white" }}>
                            View
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    complete: { bg: "#ecfdf5", color: "#16a34a" },
    running: { bg: "#eff6ff", color: "#2563eb" },
    queued: { bg: "var(--bg)", color: "var(--text-muted)" },
    failed: { bg: "#fef2f2", color: "#dc2626" },
  };
  const s = styles[status] || styles.queued;
  return (
    <span className="text-xs font-medium px-2 py-1 rounded-md capitalize" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}
