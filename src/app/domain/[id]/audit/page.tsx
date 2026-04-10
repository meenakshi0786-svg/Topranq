"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface Issue {
  id: string;
  issueType: string;
  severity: string;
  affectedUrls: string[];
  description: string;
  recommendation: string;
  dataSource: string;
  status: string;
  whyItMatters: string | null;
  howToFixDetailed: string | null;
  learnMoreUrl: string | null;
}

export default function AuditPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("open");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fixPanelId, setFixPanelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);

  const fetchIssues = useCallback(async () => {
    const p = new URLSearchParams();
    if (filterSeverity !== "all") p.set("severity", filterSeverity);
    if (filterStatus !== "all") p.set("status", filterStatus);

    const res = await fetch(`/api/domains/${domainId}/audit/issues?${p}`);
    if (res.ok) setIssues(await res.json());
    setLoading(false);
  }, [domainId, filterSeverity, filterStatus]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  async function updateIssueStatus(issueId: string, status: "fixed" | "ignored" | "open") {
    setUpdatingStatus(issueId);
    try {
      const res = await fetch(`/api/domains/${domainId}/audit/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, status }),
      });
      if (res.ok) {
        setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, status } : i));
        if (status === "fixed" || status === "ignored") {
          setFixPanelId(null);
          setExpandedId(null);
        }
      }
    } catch { /* ignore */ }
    setUpdatingStatus(null);
  }

  function copyCode(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(idx);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  // Parse howToFix text into steps and code blocks
  function parseFixSteps(text: string): Array<{ type: "step" | "code"; content: string; lang?: string }> {
    const parts: Array<{ type: "step" | "code"; content: string; lang?: string }> = [];
    const lines = text.split("\n");
    let inCode = false;
    let codeBlock = "";
    let codeLang = "";

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCode) {
          parts.push({ type: "code", content: codeBlock.trim(), lang: codeLang });
          codeBlock = "";
          codeLang = "";
          inCode = false;
        } else {
          inCode = true;
          codeLang = line.slice(3).trim();
        }
      } else if (inCode) {
        codeBlock += line + "\n";
      } else if (line.trim()) {
        parts.push({ type: "step", content: line.trim() });
      }
    }
    if (codeBlock.trim()) {
      parts.push({ type: "code", content: codeBlock.trim(), lang: codeLang });
    }
    return parts;
  }

  const fixIssue = issues.find((i) => i.id === fixPanelId);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Audit</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-6">SEO Issues</h1>

        {/* Filters */}
        <div className="card-static p-4 mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Severity
          </span>
          <div className="flex gap-1.5">
            {["all", "critical", "high", "medium", "low"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer"
                style={{
                  background: filterSeverity === s ? getSeverityBg(s) : "transparent",
                  color: filterSeverity === s ? getSeverityColor(s) : "var(--text-muted)",
                  border: `1px solid ${filterSeverity === s ? "transparent" : "var(--border-light)"}`,
                }}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          <div className="w-px h-5 mx-1" style={{ background: "var(--border-light)" }} />

          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Status
          </span>
          <div className="flex gap-1.5">
            {["all", "open", "fixed", "ignored"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer"
                style={{
                  background: filterStatus === s ? "var(--accent-light)" : "transparent",
                  color: filterStatus === s ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${filterStatus === s ? "transparent" : "var(--border-light)"}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {issues.length} result{issues.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Issues */}
        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="card-static p-16 text-center fade-in">
            <p className="text-base font-semibold mb-1">No issues match your filters</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Try adjusting the severity or status filter
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div key={issue.id} className="card-static overflow-hidden fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                <button
                  onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                  className="w-full p-4 text-left flex items-center gap-3 cursor-pointer transition-colors"
                  style={{ background: expandedId === issue.id ? "var(--bg)" : "transparent" }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: getSeverityColor(issue.severity) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{issue.description}</p>
                  </div>
                  {issue.status === "fixed" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0" style={{ background: "#ecfdf5", color: "#16a34a" }}>Fixed</span>
                  )}
                  {issue.status === "ignored" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>Ignored</span>
                  )}
                  <span
                    className="text-xs px-2.5 py-1 rounded-md font-medium shrink-0 capitalize"
                    style={{
                      background: getSeverityBg(issue.severity),
                      color: getSeverityColor(issue.severity),
                    }}
                  >
                    {issue.severity}
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`shrink-0 transition-transform duration-200 ${expandedId === issue.id ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expandedId === issue.id && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--border-light)" }}>
                    {/* Why it matters */}
                    {issue.whyItMatters && (
                      <div className="mt-3 mb-3 p-3 rounded-lg" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <p className="text-xs font-bold mb-1" style={{ color: "#92400e" }}>Why This Matters</p>
                        <p className="text-xs leading-relaxed" style={{ color: "#78350f" }}>{issue.whyItMatters}</p>
                      </div>
                    )}

                    {/* Affected URLs */}
                    {issue.affectedUrls.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                          Affected URLs ({issue.affectedUrls.length})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {issue.affectedUrls.map((url, i) => (
                            <p key={i} className="text-xs px-3 py-1.5 rounded-md" style={{ background: "var(--bg)", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                              {url}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* How to Fix (brief) */}
                    {issue.recommendation && (
                      <div className="p-4 rounded-xl mb-3" style={{ background: "var(--low-bg)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--success)" }}>
                          How to Fix
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {issue.recommendation}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Fix Now button */}
                      {(issue.howToFixDetailed || issue.recommendation) && issue.status === "open" && (
                        <button
                          onClick={() => setFixPanelId(issue.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer"
                          style={{ background: "var(--accent)" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                          </svg>
                          Fix Now
                        </button>
                      )}

                      {/* Mark as Fixed */}
                      {issue.status === "open" && (
                        <button
                          onClick={() => updateIssueStatus(issue.id, "fixed")}
                          disabled={updatingStatus === issue.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40"
                          style={{ background: "#ecfdf5", color: "#16a34a", border: "1px solid #a7f3d0" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                          {updatingStatus === issue.id ? "Saving..." : "Mark as Fixed"}
                        </button>
                      )}

                      {/* Ignore */}
                      {issue.status === "open" && (
                        <button
                          onClick={() => updateIssueStatus(issue.id, "ignored")}
                          disabled={updatingStatus === issue.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40"
                          style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                        >
                          Ignore
                        </button>
                      )}

                      {/* Reopen */}
                      {(issue.status === "fixed" || issue.status === "ignored") && (
                        <button
                          onClick={() => updateIssueStatus(issue.id, "open")}
                          disabled={updatingStatus === issue.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40"
                          style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                        >
                          Reopen Issue
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fix Now Panel (Slide-over) ── */}
      {fixPanelId && fixIssue && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-full max-w-xl h-full overflow-y-auto"
            style={{ background: "var(--bg-white)", boxShadow: "-8px 0 30px rgba(0,0,0,0.1)" }}
          >
            {/* Panel Header */}
            <div className="sticky top-0 z-10 p-6 flex items-start justify-between" style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--accent-light)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold">Fix This Issue</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Follow the steps below to resolve this issue</p>
                </div>
              </div>
              <button onClick={() => setFixPanelId(null)} className="p-2 cursor-pointer rounded-lg" style={{ color: "var(--text-muted)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Issue summary */}
              <div className="p-4 rounded-xl" style={{ background: getSeverityBg(fixIssue.severity), border: `1px solid ${getSeverityColor(fixIssue.severity)}20` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: getSeverityColor(fixIssue.severity) }} />
                  <span className="text-xs font-bold uppercase" style={{ color: getSeverityColor(fixIssue.severity) }}>{fixIssue.severity} severity</span>
                </div>
                <p className="text-sm font-semibold">{fixIssue.description}</p>
              </div>

              {/* Why it matters */}
              {fixIssue.whyItMatters && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92400e" }}>Why This Matters</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{fixIssue.whyItMatters}</p>
                </div>
              )}

              {/* Affected URLs */}
              {fixIssue.affectedUrls.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    Affected URLs ({fixIssue.affectedUrls.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg p-2" style={{ background: "var(--bg)" }}>
                    {fixIssue.affectedUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <p className="text-xs flex-1 truncate" style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 11 }}>{url}</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(url); }}
                          className="text-xs px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-step fix */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--success)" }}>
                  Step-by-Step Solution
                </h3>
                <div className="space-y-3">
                  {parseFixSteps(fixIssue.howToFixDetailed || fixIssue.recommendation || "").map((part, idx) => {
                    if (part.type === "code") {
                      return (
                        <div key={idx} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "#1e1e2e" }}>
                            <span className="text-xs font-medium" style={{ color: "#a6adc8" }}>{part.lang || "code"}</span>
                            <button
                              onClick={() => copyCode(part.content, idx)}
                              className="text-xs px-2 py-0.5 rounded cursor-pointer"
                              style={{ color: copiedSnippet === idx ? "#a6e3a1" : "#a6adc8", background: copiedSnippet === idx ? "#a6e3a120" : "transparent" }}
                            >
                              {copiedSnippet === idx ? "Copied!" : "Copy"}
                            </button>
                          </div>
                          <pre className="px-3 py-3 overflow-x-auto text-xs leading-relaxed" style={{ background: "#1e1e2e", color: "#cdd6f4", fontFamily: "monospace", fontSize: 12, margin: 0 }}>
                            {part.content}
                          </pre>
                        </div>
                      );
                    }
                    // Step text
                    const isNumbered = /^\d+\./.test(part.content);
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        {isNumbered && (
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ background: "var(--accent)" }}>
                            {part.content.match(/^(\d+)\./)?.[1]}
                          </span>
                        )}
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {isNumbered ? part.content.replace(/^\d+\.\s*/, "") : part.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Learn more */}
              {fixIssue.learnMoreUrl && (
                <a
                  href={fixIssue.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                  Learn more about this issue
                </a>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
                <button
                  onClick={() => updateIssueStatus(fixIssue.id, "fixed")}
                  disabled={updatingStatus === fixIssue.id}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                  style={{ background: "#16a34a" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                  {updatingStatus === fixIssue.id ? "Saving..." : "I Fixed This"}
                </button>
                <button
                  onClick={() => updateIssueStatus(fixIssue.id, "ignored")}
                  disabled={updatingStatus === fixIssue.id}
                  className="px-4 py-3 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40"
                  style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Not Applicable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "var(--critical)", high: "var(--high)",
    medium: "var(--medium)", low: "var(--low)", all: "var(--accent)",
  };
  return map[severity] || "var(--text-muted)";
}

function getSeverityBg(severity: string): string {
  const map: Record<string, string> = {
    critical: "var(--critical-bg)", high: "var(--high-bg)",
    medium: "var(--medium-bg)", low: "var(--low-bg)", all: "var(--accent-light)",
  };
  return map[severity] || "var(--bg)";
}
