"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface Article {
  id: string;
  domainId: string;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  h1: string | null;
  bodyMarkdown: string | null;
  faqSchema: Array<{ question: string; answer: string }> | null;
  internalLinks: Array<{ anchorText: string; targetUrl: string }> | null;
  qualityScore: number | null;
  plagiarismScore: number | null;
  status: string;
  revisionCount: number | null;
  publishedUrl: string | null;
  publishedAt: string | null;
  createdAt: string | null;
}

export default function ArticleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const domainId = params.id as string;
  const articleId = params.articleId as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "seo">("edit");
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Editable fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [h1, setH1] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");

  const fetchArticle = useCallback(async () => {
    const res = await fetch(`/api/articles/${articleId}`);
    if (res.ok) {
      const data = await res.json();
      setArticle(data);
      setMetaTitle(data.metaTitle || "");
      setMetaDescription(data.metaDescription || "");
      setH1(data.h1 || "");
      setSlug(data.slug || "");
      setBody(data.bodyMarkdown || "");
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => { fetchArticle(); }, [fetchArticle]);

  const saveChanges = async () => {
    setSaving(true);
    await fetch(`/api/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaTitle, metaDescription, h1, slug, bodyMarkdown: body }),
    });
    await fetchArticle();
    setSaving(false);
  };

  const approveArticle = async () => {
    setActionLoading("approve");
    await fetch(`/api/articles/${articleId}/approve`, { method: "POST" });
    await fetchArticle();
    setActionLoading(null);
  };

  const rejectArticle = async () => {
    setActionLoading("reject");
    await fetch(`/api/articles/${articleId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: rejectFeedback }),
    });
    setShowRejectModal(false);
    setRejectFeedback("");
    await fetchArticle();
    setActionLoading(null);
  };

  const publishArticle = async (dryRun: boolean) => {
    setActionLoading(dryRun ? "preview" : "publish");
    const res = await fetch(`/api/articles/${articleId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
    } else if (dryRun) {
      alert(`Dry run preview:\n\nTitle: ${data.preview.title}\nSlug: ${data.preview.slug}\nPlatform: ${data.preview.platform}\nSite: ${data.preview.siteUrl}`);
    } else {
      await fetchArticle();
    }
    setActionLoading(null);
  };

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const titleLen = metaTitle.length;
  const descLen = metaDescription.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm fade-in" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Article not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm" style={{ color: "var(--accent)" }}>Overview</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}/articles`} className="text-sm" style={{ color: "var(--accent)" }}>Articles</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium truncate max-w-[200px]">{metaTitle || "Untitled"}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={article.status} />
            {article.status === "draft" || article.status === "review" || article.status === "rejected" ? (
              <>
                <button onClick={saveChanges} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={approveArticle} disabled={actionLoading === "approve"} className="px-4 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer" style={{ background: "var(--success)" }}>
                  {actionLoading === "approve" ? "..." : "Approve"}
                </button>
                <button onClick={() => setShowRejectModal(true)} className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ border: "1px solid var(--critical)", color: "var(--critical)" }}>
                  Reject
                </button>
              </>
            ) : article.status === "approved" ? (
              <>
                <button onClick={() => publishArticle(true)} disabled={actionLoading === "preview"} className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {actionLoading === "preview" ? "..." : "Dry Run"}
                </button>
                <button onClick={() => publishArticle(false)} disabled={actionLoading === "publish"} className="px-4 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer" style={{ background: "var(--accent)" }}>
                  {actionLoading === "publish" ? "Publishing..." : "Publish"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--border-light)" }}>
          {(["edit", "preview", "seo"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer"
              style={{
                background: activeTab === tab ? "var(--bg-white)" : "transparent",
                color: activeTab === tab ? "var(--text)" : "var(--text-muted)",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "edit" && (
          <div className="grid grid-cols-12 gap-6 fade-in">
            {/* Editor */}
            <div className="col-span-12 lg:col-span-8">
              <div className="card-static p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>H1</label>
                  <input type="text" value={h1} onChange={(e) => setH1(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                    Body (Markdown) <span className="font-normal normal-case" style={{ color: "var(--text-muted)" }}>· {wordCount} words</span>
                  </label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={24} className="w-full px-4 py-3 rounded-xl text-sm font-mono leading-relaxed resize-y" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {/* Meta */}
              <div className="card-static p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Meta</h3>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                    Title <span className={titleLen > 60 ? "text-red-500" : ""}>({titleLen}/60)</span>
                  </label>
                  <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                    Description <span className={descLen > 155 ? "text-red-500" : ""}>({descLen}/155)</span>
                  </label>
                  <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Slug</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} />
                </div>
              </div>

              {/* Quality */}
              <div className="card-static p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Quality</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Score</span>
                  <span className="text-sm font-bold" style={{ color: (article.qualityScore || 0) >= 70 ? "var(--success)" : "var(--high)" }}>
                    {article.qualityScore ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Plagiarism</span>
                  <span className="text-sm font-bold" style={{ color: (article.plagiarismScore || 0) < 0.15 ? "var(--success)" : "var(--critical)" }}>
                    {article.plagiarismScore !== null ? `${Math.round(article.plagiarismScore * 100)}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Revisions</span>
                  <span className="text-sm font-medium">{article.revisionCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Word count</span>
                  <span className="text-sm font-medium">{wordCount}</span>
                </div>
              </div>

              {/* Internal Links */}
              {article.internalLinks && article.internalLinks.length > 0 && (
                <div className="card-static p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                    Internal Links ({article.internalLinks.length})
                  </h3>
                  <div className="space-y-1.5">
                    {article.internalLinks.map((link, i) => (
                      <div key={i} className="text-xs p-2 rounded-md" style={{ background: "var(--bg)" }}>
                        <span className="font-medium" style={{ color: "var(--accent)" }}>{link.anchorText}</span>
                        <span className="block font-mono truncate" style={{ color: "var(--text-muted)", fontSize: "10px" }}>{link.targetUrl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ Schema */}
              {article.faqSchema && article.faqSchema.length > 0 && (
                <div className="card-static p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                    FAQ Schema ({article.faqSchema.length})
                  </h3>
                  <div className="space-y-2">
                    {article.faqSchema.map((faq, i) => (
                      <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                        <p className="text-xs font-semibold mb-0.5">{faq.question}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="card-static p-8 max-w-3xl mx-auto fade-in">
            <h1 className="text-3xl font-bold mb-4 leading-tight">{h1 || "Untitled"}</h1>
            <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
              {body || "No content yet."}
            </div>
          </div>
        )}

        {activeTab === "seo" && (
          <div className="max-w-3xl mx-auto space-y-4 fade-in">
            {/* SERP Preview */}
            <div className="card-static p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Google SERP Preview</h3>
              <div className="p-4 rounded-xl" style={{ background: "var(--bg)" }}>
                <p className="text-lg mb-0.5" style={{ color: "#1a0dab" }}>{metaTitle || "Page Title"}</p>
                <p className="text-xs mb-1" style={{ color: "#006621" }}>example.com/{slug || "page-slug"}</p>
                <p className="text-sm" style={{ color: "#545454" }}>{metaDescription || "Meta description will appear here..."}</p>
              </div>
            </div>

            {/* SEO Checklist */}
            <div className="card-static p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>SEO Checklist</h3>
              <div className="space-y-2">
                <CheckItem pass={titleLen > 0 && titleLen <= 60} label={`Title length: ${titleLen}/60 chars`} />
                <CheckItem pass={descLen > 0 && descLen <= 155} label={`Meta description: ${descLen}/155 chars`} />
                <CheckItem pass={h1.length > 0} label="H1 tag present" />
                <CheckItem pass={wordCount >= 300} label={`Word count: ${wordCount} (min 300)`} />
                <CheckItem pass={(article.internalLinks?.length || 0) >= 3} label={`Internal links: ${article.internalLinks?.length || 0} (min 3)`} />
                <CheckItem pass={slug.length > 0 && !slug.includes(" ")} label="Clean URL slug" />
                <CheckItem pass={(article.faqSchema?.length || 0) > 0} label={`FAQ schema: ${article.faqSchema?.length || 0} items`} />
                <CheckItem pass={(article.plagiarismScore || 0) < 0.15} label={`Plagiarism: ${article.plagiarismScore !== null ? Math.round(article.plagiarismScore * 100) + "%" : "not checked"} (max 15%)`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="card-static p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold mb-3">Reject Article</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Provide feedback so the AI can improve on the next revision.
            </p>
            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="What needs to change?"
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm mb-4 resize-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
                Cancel
              </button>
              <button onClick={rejectArticle} disabled={actionLoading === "reject"} className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "var(--critical)" }}>
                {actionLoading === "reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function CheckItem({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: pass ? "var(--low-bg)" : "var(--critical-bg)" }}>
      <span style={{ color: pass ? "var(--success)" : "var(--critical)" }}>
        {pass ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        )}
      </span>
      <span className="text-xs font-medium" style={{ color: pass ? "var(--success)" : "var(--critical)" }}>{label}</span>
    </div>
  );
}
