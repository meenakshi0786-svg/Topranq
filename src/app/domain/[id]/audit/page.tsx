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
}

export default function AuditPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("open");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    const p = new URLSearchParams();
    if (filterSeverity !== "all") p.set("severity", filterSeverity);
    if (filterStatus !== "all") p.set("status", filterStatus);

    const res = await fetch(`/api/domains/${domainId}/audit/issues?${p}`);
    if (res.ok) setIssues(await res.json());
    setLoading(false);
  }, [domainId, filterSeverity, filterStatus]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  return (
    <div className="min-h-screen">
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
                  className="w-full p-4 text-left flex items-center gap-3 cursor-pointer hover:bg-[var(--border-light)] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: getSeverityColor(issue.severity) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{issue.description}</p>
                  </div>
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
                    {issue.affectedUrls.length > 0 && (
                      <div className="mt-3 mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                          Affected URLs
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

                    {issue.recommendation && (
                      <div className="p-4 rounded-xl" style={{ background: "var(--low-bg)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--success)" }}>
                          How to Fix
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {issue.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
