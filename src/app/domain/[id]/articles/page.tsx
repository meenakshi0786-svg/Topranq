"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface Article {
  id: string;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  h1: string | null;
  bodyMarkdown: string | null;
  faqSchema: Array<{ question: string; answer: string }> | null;
  internalLinks: Array<{ anchorText: string; targetUrl: string }> | null;
  qualityScore: number | null;
  status: string;
  createdAt: string | null;
}

export default function ArticlesPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");


  useEffect(() => {
    fetch(`/api/domains/${domainId}/articles`)
      .then((r) => r.json())
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [domainId]);

  const filtered =
    filterStatus === "all"
      ? articles
      : articles.filter((a) => a.status === filterStatus);

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Articles</span>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
          <Link
            href={`/domain/${domainId}/agents`}
            className="btn-primary px-5 py-2 text-sm"
          >
            Create with AI Agent
          </Link>
        </div>

        {/* Filters */}
        <div className="card-static p-4 mb-6 flex items-center gap-3 flex-wrap fade-in">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Status
          </span>
          <div className="flex gap-1.5">
            {["all", "draft", "review", "approved", "published"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer"
                style={{
                  background: filterStatus === status ? "var(--accent-light)" : "transparent",
                  color: filterStatus === status ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${filterStatus === status ? "transparent" : "var(--border-light)"}`,
                }}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card-static p-16 text-center fade-in">
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-static p-16 text-center fade-in">
            <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--border-light)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-base font-semibold mb-1">
              {articles.length === 0 ? "No articles yet" : "No articles match this filter"}
            </p>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              {articles.length === 0
                ? "Deploy the Blog Writer agent to generate SEO-optimized articles."
                : "Try selecting a different status filter."}
            </p>
            {articles.length === 0 && (
              <Link
                href={`/domain/${domainId}/agents`}
                className="btn-primary inline-block px-5 py-2 text-sm"
              >
                Go to Strategy AI Agents
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((article, i) => (
              <div
                key={article.id}
                className="card-static overflow-hidden fade-in"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {/* Header */}
                <Link
                  href={`/domain/${domainId}/articles/${article.id}`}
                  className="w-full p-5 text-left flex items-center gap-4 cursor-pointer hover:bg-[var(--border-light)] transition-colors block"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-0.5">
                      {article.metaTitle || article.h1 || "Untitled"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      /{article.slug || "—"}
                      {article.createdAt && (
                        <> · {new Date(article.createdAt).toLocaleDateString()}</>
                      )}
                      {article.bodyMarkdown && (
                        <> · ~{article.bodyMarkdown.split(/\s+/).length} words</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {article.qualityScore !== null && (
                      <span className="text-xs font-bold tabular-nums" style={{ color: article.qualityScore >= 70 ? "var(--success)" : "var(--high)" }}>
                        {article.qualityScore}
                      </span>
                    )}
                    <StatusBadge status={article.status} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    draft: { bg: "var(--medium-bg)", color: "var(--medium)" },
    review: { bg: "var(--accent-light)", color: "var(--accent)" },
    approved: { bg: "var(--low-bg)", color: "var(--success)" },
    published: { bg: "var(--low-bg)", color: "var(--success)" },
    rejected: { bg: "var(--critical-bg)", color: "var(--critical)" },
  };
  const s = styles[status] || styles.draft;
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-md capitalize" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}
