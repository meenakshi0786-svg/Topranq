"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface TechFix {
  id: string;
  type: string;
  title: string;
  description: string;
  code: string;
  language: string;
  affectedUrls: string[];
  severity: string;
}

export default function TechnicalPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [fixes, setFixes] = useState<TechFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");

  const fetchFixes = useCallback(async () => {
    const res = await fetch(`/api/domains/${domainId}/technical`);
    if (res.ok) {
      setFixes(await res.json());
    }
    setLoading(false);
  }, [domainId]);

  useEffect(() => { fetchFixes(); }, [fetchFixes]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const types = ["all", ...new Set(fixes.map((f) => f.type))];
  const filtered = filterType === "all" ? fixes : fixes.filter((f) => f.type === filterType);

  const severityColor: Record<string, string> = {
    critical: "var(--critical)",
    high: "var(--high)",
    medium: "var(--medium)",
    low: "var(--text-muted)",
  };

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Technical SEO</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Technical SEO Fixes</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Copy-paste ready code snippets to fix technical SEO issues
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-static p-4 mb-6 flex items-center gap-3 flex-wrap fade-in">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Type</span>
          <div className="flex gap-1.5">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer"
                style={{
                  background: filterType === type ? "var(--accent-light)" : "transparent",
                  color: filterType === type ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${filterType === type ? "transparent" : "var(--border-light)"}`,
                }}
              >
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} fix{filtered.length !== 1 ? "es" : ""}
          </span>
        </div>

        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-static p-16 text-center fade-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--low-bg)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-base font-semibold mb-1">No technical fixes needed</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Run an audit first to generate technical SEO fixes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((fix, i) => (
              <div key={fix.id} className="card-static overflow-hidden fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: severityColor[fix.severity] || "var(--text-muted)" }} />
                        <span className="text-xs font-medium uppercase" style={{ color: severityColor[fix.severity] }}>{fix.severity}</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--border-light)", color: "var(--text-muted)" }}>
                          {fix.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold">{fix.title}</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(fix.code, fix.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 flex items-center gap-1.5"
                      style={{ border: "1px solid var(--border)", color: copiedId === fix.id ? "var(--success)" : "var(--text-secondary)" }}
                    >
                      {copiedId === fix.id ? (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Copied</>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> Copy</>
                      )}
                    </button>
                  </div>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {fix.description}
                  </p>
                  {/* Code block */}
                  <div className="rounded-xl overflow-hidden" style={{ background: "#1e1e2e" }}>
                    <div className="px-4 py-2 flex items-center justify-between" style={{ background: "#181825", borderBottom: "1px solid #313244" }}>
                      <span className="text-xs font-mono" style={{ color: "#a6adc8" }}>{fix.language}</span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs leading-relaxed" style={{ color: "#cdd6f4" }}>
                      <code>{fix.code}</code>
                    </pre>
                  </div>
                  {/* Affected URLs */}
                  {fix.affectedUrls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                        Affected pages ({fix.affectedUrls.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {fix.affectedUrls.slice(0, 5).map((url, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "var(--bg)", color: "var(--text-muted)", fontSize: "10px" }}>
                            {url}
                          </span>
                        ))}
                        {fix.affectedUrls.length > 5 && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ color: "var(--text-muted)" }}>
                            +{fix.affectedUrls.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
