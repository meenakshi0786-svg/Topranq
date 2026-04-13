"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CubeLoader } from "@/components/cube-loader";

// ── Types ────────────────────────────────────────────────────────────

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SmartSuggestion {
  topic: string;
  keywords: string[];
  tone: "professional" | "casual" | "technical";
  wordCount: number;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface SmartAnalysis {
  niche: string;
  siteType: "product" | "service" | "content" | "marketplace";
  siteTypeLabel: string;
  hostname: string;
  siteKeywords: string[];
  pagesAnalyzed: number;
  thinContentPages: number;
  issueCount: number;
  suggestions: SmartSuggestion[];
}

interface GeneratedArticle {
  articleId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  outline: Array<{ heading: string; summary: string; keyPoints: string[] }>;
  suggestedInternalLinks: Array<{ anchorText: string; targetUrl: string }>;
  faqItems: Array<{ question: string; answer: string }>;
  imageSuggestions: Array<{ placement: string; altText: string; description: string }>;
  qualityChecks: {
    overallScore: number;
    readabilityScore: number;
    keywordInTitle: boolean;
    keywordInH1: boolean;
    keywordInFirst100Words: boolean;
    keywordDensity: number;
    metaTitleLength: number;
    metaDescLength: number;
    hasInternalLinks: boolean;
    hasFaq: boolean;
    hasImages: boolean;
  };
  estimatedWordCount: number;
  reviewEmailSent?: boolean;
  reviewUrl?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  status?: string;
  featuredImageUrl?: string;
  featuredImagePrompt?: string;
}

interface CreditInfo {
  plan: string;
  credits: { total: number; used: number; remaining: number };
}

// ── Component ────────────────────────────────────────────────────────

export default function BlogWriterPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [gscQueries, setGscQueries] = useState<GscQuery[]>([]);
  const [gscLoading, setGscLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(false);

  const [smartAnalysis, setSmartAnalysis] = useState<SmartAnalysis | null>(null);
  const [smartLoading, setSmartLoading] = useState(true);

  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [blogMode, setBlogMode] = useState<"smart" | "custom">("smart");
  const [blogConfig, setBlogConfig] = useState({
    topic: "",
    keywords: "",
    tone: "professional" as "professional" | "casual" | "technical",
    wordCount: 1500,
    language: "English",
  });

  const [generating, setGenerating] = useState(false);
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [articleTab, setArticleTab] = useState<"preview" | "seo" | "raw">("preview");
  const [blogJobs, setBlogJobs] = useState<Array<{ id: string; status: string; config: Record<string, unknown>; output: Record<string, unknown> | null; creditsUsed: number; createdAt: string }>>([]);

  // Fetch credits
  useEffect(() => {
    fetch("/api/credits").then((r) => r.ok ? r.json() : null).then(setCredits);
  }, []);

  // Fetch keywords — tries GSC first, then falls back to AI-powered research
  const fetchGscData = useCallback(async () => {
    setGscLoading(true);
    try {
      // 1. Try GSC first
      const statusRes = await fetch(`/api/domains/${domainId}/gsc?action=status`);
      const statusData = await statusRes.json();

      if (statusData.connected) {
        setGscConnected(true);

        const res = await fetch(`/api/domains/${domainId}/gsc`);
        const data = await res.json();

        if (data.topQueries && data.topQueries.length > 0) {
          setGscQueries(data.topQueries.slice(0, 30));
          setGscLoading(false);
          return;
        }

        if (statusData.sites?.length > 0) {
          const fetchRes = await fetch(
            `/api/domains/${domainId}/gsc?action=fetch&siteUrl=${encodeURIComponent(statusData.sites[0])}`
          );
          const fetchData = await fetchRes.json();
          if (fetchData.topQueries && fetchData.topQueries.length > 0) {
            setGscQueries(fetchData.topQueries.slice(0, 30));
            setGscLoading(false);
            return;
          }
        }
      }

      // 2. Fallback: AI-powered keyword research (works without GSC)
      const aiRes = await fetch(`/api/domains/${domainId}/ai-keywords`);
      const aiData = await aiRes.json();

      if (aiData.keywords && aiData.keywords.length > 0) {
        setGscConnected(false); // AI research, not GSC
        setGscQueries(aiData.keywords.slice(0, 30).map((k: { query: string; clicks: number; impressions: number; ctr: number; position: number }) => ({
          query: k.query,
          clicks: k.clicks || 0,
          impressions: k.impressions || 0,
          ctr: k.ctr || 0,
          position: k.position || 0,
        })));
      }
    } catch {
      console.error("Failed to fetch keyword data");
    } finally {
      setGscLoading(false);
    }
  }, [domainId]);

  // Fetch smart suggestions — auto-switch to custom mode on failure
  const fetchSmartSuggestions = useCallback(async () => {
    setSmartLoading(true);
    try {
      const res = await fetch(`/api/agents/smart-suggest?domainId=${domainId}`);
      if (res.ok) {
        setSmartAnalysis(await res.json());
      } else {
        // API failed (e.g. no crawled pages) — skip to custom topic mode
        setBlogMode("custom");
      }
    } catch {
      console.error("Failed to fetch smart suggestions");
      setBlogMode("custom");
    } finally {
      setSmartLoading(false);
    }
  }, [domainId]);

  // Fetch blog writer jobs
  const fetchBlogJobs = useCallback(async () => {
    const res = await fetch(`/api/agents/jobs?domainId=${domainId}`);
    if (res.ok) {
      const allJobs = await res.json();
      setBlogJobs(allJobs.filter((j: { agentType: string }) => j.agentType === "blog_writer"));
    }
  }, [domainId]);

  useEffect(() => {
    fetchGscData();
    fetchSmartSuggestions();
    fetchBlogJobs();
  }, [fetchGscData, fetchSmartSuggestions, fetchBlogJobs]);

  // Refresh article status when user returns to this tab (e.g., after publishing in review tab)
  useEffect(() => {
    function onFocus() {
      if (article?.articleId) {
        fetch(`/api/articles/${article.articleId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.status) {
              setArticle((prev) => (prev ? { ...prev, status: data.status } : prev));
            }
          })
          .catch(() => {});
      }
      fetchBlogJobs();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [article?.articleId, fetchBlogJobs]);

  // Generate article
  async function generateArticle(topic: string, keywords: string[], tone: string, wordCount: number, language?: string) {
    setGenerating(true);
    setArticle(null);
    try {
      const res = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId,
          agentType: "blog_writer",
          config: { topic, keywords, tone, wordCount, language: language || "English" },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Generation failed");
        return;
      }
      // Fetch the article content
      if (data.output?.articleId) {
        const articleRes = await fetch(`/api/articles/${data.output.articleId}`);
        if (articleRes.ok) {
          const articleData = await articleRes.json();
          setArticle({ ...data.output, bodyMarkdown: articleData.bodyMarkdown, bodyHtml: articleData.bodyHtml });
        } else {
          setArticle(data.output);
        }
      } else {
        setArticle(data.output);
      }
      // Refresh credits and jobs
      fetch("/api/credits").then((r) => r.ok ? r.json() : null).then(setCredits);
      fetchBlogJobs();
    } catch {
      alert("Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function handleSmartGenerate() {
    if (selectedSuggestion === null || !smartAnalysis) return;
    const s = smartAnalysis.suggestions[selectedSuggestion];
    generateArticle(s.topic, s.keywords, s.tone, s.wordCount, blogConfig.language);
  }

  function handleCustomGenerate() {
    if (!blogConfig.topic) return;
    const keywords = blogConfig.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    generateArticle(blogConfig.topic, keywords, blogConfig.tone, blogConfig.wordCount, blogConfig.language);
  }

  const priorityColors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}/agents`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Strategy AI Agents</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">Blog Writer</span>
          </div>
          <div className="flex items-center gap-3">
            {credits && (
              <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /></svg>
                {Math.floor(credits.credits.remaining)} credits
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className={`flex gap-6 ${article ? "" : ""}`}>
          {/* ── Left Panel: Keywords + Topic Selection ── */}
          <div className={`${article || generating ? "w-1/2" : "w-full max-w-[900px] mx-auto"} transition-all duration-300`}>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1">Blog Writer</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                AI-researched keywords and smart topic suggestions to generate SEO-optimized articles.
              </p>
            </div>

            {/* GSC Keywords Section */}
            <div className="card-static p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Keyword Research
                </h2>
                {gscQueries.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "#dcfce7", color: "#166534" }}>
                    {gscConnected ? "Live Data" : "AI Research"}
                  </span>
                )}
              </div>

              {gscLoading ? (
                <CubeLoader
                  label="Researching keywords..."
                  sublabel="Fetching GSC data and running AI keyword research"
                />
              ) : gscQueries.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    No keyword data yet. Use the Custom Topic tab below to write about any topic, or <Link href={`/domain/${domainId}/audit`} style={{ color: "var(--accent)", textDecoration: "underline" }}>run an audit</Link> to get AI keyword suggestions.
                  </p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--bg)" }}>
                        <th className="text-left p-2 font-semibold sticky top-0" style={{ color: "var(--text-muted)", background: "var(--bg)" }}>Keyword</th>
                        <th className="text-right p-2 font-semibold sticky top-0" style={{ color: "var(--text-muted)", background: "var(--bg)" }}>Clicks</th>
                        <th className="text-right p-2 font-semibold sticky top-0" style={{ color: "var(--text-muted)", background: "var(--bg)" }}>Impressions</th>
                        <th className="text-right p-2 font-semibold sticky top-0" style={{ color: "var(--text-muted)", background: "var(--bg)" }}>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gscQueries.map((q, i) => (
                        <tr
                          key={i}
                          className="cursor-pointer transition-colors"
                          style={{ borderTop: "1px solid var(--border-light)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#4F6EF708"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          onClick={() => {
                            setBlogMode("custom");
                            setBlogConfig((prev) => ({
                              ...prev,
                              keywords: prev.keywords
                                ? `${prev.keywords}, ${q.query}`
                                : q.query,
                            }));
                          }}
                        >
                          <td className="p-2 font-medium">{q.query}</td>
                          <td className="p-2 text-right tabular-nums" style={{ color: "var(--accent)" }}>{q.clicks}</td>
                          <td className="p-2 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{q.impressions.toLocaleString()}</td>
                          <td className="p-2 text-right tabular-nums">
                            <span
                              className="px-1.5 py-0.5 rounded"
                              style={{
                                background: q.position <= 10 ? "#dcfce7" : q.position <= 20 ? "#fef9c3" : "#fee2e2",
                                color: q.position <= 10 ? "#166534" : q.position <= 20 ? "#854d0e" : "#991b1b",
                              }}
                            >
                              {q.position.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {gscQueries.length > 0 && (
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  Click a keyword to add it to your custom topic. Keywords at position 4-20 are great opportunities.
                </p>
              )}
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--bg-white)", display: "inline-flex", border: "1px solid var(--border-light)" }}>
              <button
                onClick={() => setBlogMode("smart")}
                className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all"
                style={{
                  background: blogMode === "smart" ? "#4F6EF7" : "transparent",
                  color: blogMode === "smart" ? "white" : "var(--text-muted)",
                }}
              >
                Smart Suggestions
              </button>
              <button
                onClick={() => setBlogMode("custom")}
                className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all"
                style={{
                  background: blogMode === "custom" ? "#4F6EF7" : "transparent",
                  color: blogMode === "custom" ? "white" : "var(--text-muted)",
                }}
              >
                Custom Topic
              </button>
            </div>

            {/* Smart Mode */}
            {blogMode === "smart" && (
              <div className="card-static p-6 mb-6">
                {smartLoading ? (
                  <CubeLoader
                    label="Generating smart suggestions..."
                    sublabel="Analyzing pages, keywords, content gaps, and audit issues"
                  />
                ) : smartAnalysis ? (
                  <div>
                    {/* Site Intelligence */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-lg font-bold tabular-nums" style={{ color: "#4F6EF7" }}>{smartAnalysis.pagesAnalyzed}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pages</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-lg font-bold tabular-nums" style={{ color: "#4F6EF7" }}>{smartAnalysis.siteKeywords.length}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Keywords</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-lg font-bold tabular-nums" style={{ color: smartAnalysis.thinContentPages > 0 ? "#f59e0b" : "#22c55e" }}>{smartAnalysis.thinContentPages}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Gaps</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-sm font-bold" style={{ color: "#4F6EF7" }}>{smartAnalysis.niche}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Niche</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-sm font-bold" style={{ color: "#4F6EF7" }}>{smartAnalysis.siteTypeLabel}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Type</p>
                      </div>
                    </div>

                    {/* Top Keywords */}
                    <div className="mb-5">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Your Top Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {smartAnalysis.siteKeywords.map((kw, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: "#4F6EF715", color: "#4F6EF7" }}>{kw}</span>
                        ))}
                      </div>
                    </div>

                    {/* Topic Suggestions */}
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                      Recommended Topics
                    </p>
                    <div className="space-y-2 mb-5">
                      {smartAnalysis.suggestions.map((suggestion, i) => {
                        const isSelected = selectedSuggestion === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedSuggestion(isSelected ? null : i)}
                            className="w-full text-left p-4 rounded-xl cursor-pointer transition-all"
                            style={{
                              background: isSelected ? "#4F6EF708" : "var(--bg)",
                              border: `2px solid ${isSelected ? "#4F6EF7" : "transparent"}`,
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                                style={{ borderColor: isSelected ? "#4F6EF7" : "var(--border)" }}
                              >
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4F6EF7" }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded capitalize" style={{ background: (priorityColors[suggestion.priority] || "#999") + "15", color: priorityColors[suggestion.priority] || "#999" }}>
                                    {suggestion.priority}
                                  </span>
                                  <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                                    {suggestion.tone} · {suggestion.wordCount.toLocaleString()} words
                                  </span>
                                </div>
                                <p className="text-sm font-semibold mb-1">{suggestion.topic}</p>
                                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{suggestion.reason}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {suggestion.keywords.slice(0, 4).map((kw, j) => (
                                    <span key={j} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-white)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>{kw}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleSmartGenerate}
                      disabled={generating || selectedSuggestion === null}
                      className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                      style={{ background: "#4F6EF7" }}
                    >
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                          Generating Article...
                        </span>
                      ) : selectedSuggestion !== null ? (
                        "Generate This Article (3 credits)"
                      ) : (
                        "Select a topic above"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="animate-pulse mb-3" style={{ color: "#4F6EF7" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Preparing your blog suggestions...</p>
                    <button onClick={() => fetchSmartSuggestions()} className="px-5 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer" style={{ background: "#4F6EF7" }}>
                      Retry Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Custom Mode */}
            {blogMode === "custom" && (
              <div className="card-static p-6 mb-6">
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Topic</span>
                      <span className="text-xs" style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={blogConfig.topic}
                      onChange={(e) => setBlogConfig({ ...blogConfig, topic: e.target.value })}
                      placeholder="e.g., How to improve website loading speed"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Target Keywords</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>(comma separated — click GSC keywords above to add)</span>
                    </label>
                    <input
                      type="text"
                      value={blogConfig.keywords}
                      onChange={(e) => setBlogConfig({ ...blogConfig, keywords: e.target.value })}
                      placeholder="e.g., page speed, core web vitals, site performance"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Tone</label>
                      <select
                        value={blogConfig.tone}
                        onChange={(e) => setBlogConfig({ ...blogConfig, tone: e.target.value as "professional" | "casual" | "technical" })}
                        className="w-full px-3.5 py-2.5 rounded-lg text-sm cursor-pointer outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="technical">Technical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Word Count</label>
                      <select
                        value={blogConfig.wordCount}
                        onChange={(e) => setBlogConfig({ ...blogConfig, wordCount: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-lg text-sm cursor-pointer outline-none"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                      >
                        <option value={800}>800 words</option>
                        <option value={1200}>1,200 words</option>
                        <option value={1500}>1,500 words</option>
                        <option value={2000}>2,000 words</option>
                        <option value={3000}>3,000 words</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Language</label>
                    <select
                      value={blogConfig.language}
                      onChange={(e) => setBlogConfig({ ...blogConfig, language: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm cursor-pointer outline-none"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                    >
                      {["English","Spanish","French","German","Italian","Portuguese","Dutch","Polish","Swedish","Norwegian","Danish","Finnish","Greek","Turkish","Russian","Ukrainian","Czech","Hungarian","Romanian","Arabic","Hebrew","Hindi","Bengali","Urdu","Tamil","Telugu","Marathi","Gujarati","Punjabi","Thai","Vietnamese","Indonesian","Malay","Filipino","Japanese","Korean","Chinese (Simplified)","Chinese (Traditional)"].map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCustomGenerate}
                  disabled={generating || !blogConfig.topic}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                  style={{ background: "#4F6EF7" }}
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                      Generating Article...
                    </span>
                  ) : (
                    "Generate Article (3 credits)"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── Right Panel: Article Generating Loader ── */}
          {generating && !article && (
            <div className="w-1/2 sticky top-4 self-start">
              <div className="card-static p-12">
                <CubeLoader
                  label="Generating your article..."
                  sublabel="Researching the topic, writing content, and optimizing for SEO (30–60s)"
                />
              </div>
            </div>
          )}

          {/* ── Right Panel: Article Preview Sidebar ── */}
          {article && (
            <div className="w-1/2 sticky top-4 self-start max-h-[calc(100vh-100px)] overflow-auto">
              <div className="card-static overflow-hidden">
                {/* Sidebar Header */}
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <h2 className="text-sm font-bold" style={{ color: "#4F6EF7" }}>Generated Article</h2>
                  <div className="flex items-center gap-2">
                    {article.status === "published" || article.status === "approved" ? (
                      <span
                        className="text-xs font-semibold px-3 py-1.5 rounded-md text-white"
                        style={{ background: "#22c55e" }}
                      >
                        Published
                      </span>
                    ) : article.reviewUrl ? (
                      <a
                        href={article.reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold px-3 py-1.5 rounded-md text-white"
                        style={{ background: "#4F6EF7" }}
                      >
                        Review & Publish
                      </a>
                    ) : null}
                    <button onClick={() => setArticle(null)} className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>Close</button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: "var(--border-light)" }}>
                  {(["preview", "seo", "raw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setArticleTab(tab)}
                      className="px-4 py-2.5 text-xs font-semibold capitalize cursor-pointer transition-all"
                      style={{
                        color: articleTab === tab ? "#4F6EF7" : "var(--text-muted)",
                        borderBottom: articleTab === tab ? "2px solid #4F6EF7" : "2px solid transparent",
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-5">
                  {articleTab === "preview" && (
                    <div className="space-y-4">
                      {/* Review notification */}
                      {article.reviewEmailSent && (
                        <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: "#dcfce7" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                          <span className="text-xs font-medium" style={{ color: "#166534" }}>Review email sent to your inbox</span>
                        </div>
                      )}

                      {/* Featured Image */}
                      {article.featuredImageUrl && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Featured Image</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={article.featuredImageUrl}
                            alt={article.featuredImagePrompt || article.title || ""}
                            className="w-full rounded-lg"
                            style={{ aspectRatio: "16/9", objectFit: "cover", background: "var(--bg)" }}
                            loading="lazy"
                          />
                          {article.featuredImagePrompt && (
                            <p className="text-[11px] mt-1.5 italic" style={{ color: "var(--text-muted)" }}>
                              Prompt: {article.featuredImagePrompt}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Title</p>
                        <p className="text-base font-bold">{article.title || article.metaTitle}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Meta Description</p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{article.metaDescription}</p>
                      </div>

                      {/* Quality Score */}
                      {article.qualityChecks && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                            Quality Score: {article.qualityChecks.overallScore}/100
                          </p>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${article.qualityChecks.overallScore}%`,
                                background: article.qualityChecks.overallScore >= 70 ? "#22c55e" : article.qualityChecks.overallScore >= 40 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 mt-3">
                            {[
                              { label: "Keyword in Title", pass: article.qualityChecks.keywordInTitle },
                              { label: "Keyword in H1", pass: article.qualityChecks.keywordInH1 },
                              { label: "Keyword in First 100w", pass: article.qualityChecks.keywordInFirst100Words },
                              { label: "Internal Links", pass: article.qualityChecks.hasInternalLinks },
                              { label: "FAQ Schema", pass: article.qualityChecks.hasFaq },
                              { label: "Images", pass: article.qualityChecks.hasImages },
                            ].map((c) => (
                              <div key={c.label} className="flex items-center gap-1.5 text-xs p-1.5 rounded" style={{ background: "var(--bg)" }}>
                                <span style={{ color: c.pass ? "#22c55e" : "#ef4444" }}>{c.pass ? "\u2713" : "\u2717"}</span>
                                <span>{c.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Outline */}
                      {article.outline && article.outline.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                            Outline ({article.outline.length} sections · ~{article.estimatedWordCount} words)
                          </p>
                          <div className="space-y-1.5">
                            {article.outline.map((section, i) => (
                              <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                                <p className="text-xs font-semibold">{section.heading}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{section.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* FAQ */}
                      {article.faqItems && article.faqItems.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>FAQ</p>
                          <div className="space-y-1.5">
                            {article.faqItems.map((faq, i) => (
                              <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                                <p className="text-xs font-semibold">{faq.question}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image Suggestions */}
                      {article.imageSuggestions && article.imageSuggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Image Suggestions</p>
                          <div className="space-y-1">
                            {article.imageSuggestions.map((img, i) => (
                              <div key={i} className="text-xs p-2 rounded" style={{ background: "var(--bg)" }}>
                                <span className="font-medium">{img.placement}</span>: {img.description}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {articleTab === "seo" && (
                    <div className="space-y-4">
                      {/* SERP Preview */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>SERP Preview</p>
                        <div className="p-4 rounded-lg" style={{ background: "var(--bg)" }}>
                          <p className="text-base font-medium mb-0.5" style={{ color: "#1a0dab" }}>
                            {article.metaTitle} ({article.qualityChecks?.metaTitleLength || 0} chars)
                          </p>
                          <p className="text-xs mb-1" style={{ color: "#006621" }}>
                            example.com/{article.slug}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {article.metaDescription} ({article.qualityChecks?.metaDescLength || 0} chars)
                          </p>
                        </div>
                      </div>

                      {/* Internal Links */}
                      {article.suggestedInternalLinks && article.suggestedInternalLinks.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                            Internal Links ({article.suggestedInternalLinks.length})
                          </p>
                          <div className="space-y-1">
                            {article.suggestedInternalLinks.map((link, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded" style={{ background: "var(--bg)" }}>
                                <span className="font-medium" style={{ color: "#4F6EF7" }}>{link.anchorText}</span>
                                <span style={{ color: "var(--text-muted)" }}> → </span>
                                <span className="truncate" style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 10 }}>{link.targetUrl}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Keyword Density */}
                      {article.qualityChecks && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Keyword Analysis</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                              <p className="text-lg font-bold tabular-nums" style={{ color: "#4F6EF7" }}>{article.qualityChecks.keywordDensity.toFixed(1)}%</p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Keyword Density</p>
                            </div>
                            <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                              <p className="text-lg font-bold tabular-nums" style={{ color: "#4F6EF7" }}>{article.qualityChecks.readabilityScore}</p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Readability</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {articleTab === "raw" && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Markdown</p>
                      <pre
                        className="text-xs leading-relaxed p-4 rounded-lg overflow-auto max-h-[500px] whitespace-pre-wrap"
                        style={{ background: "var(--bg)", color: "var(--text-secondary)", fontFamily: "monospace" }}
                      >
                        {article.bodyMarkdown || "Article content will appear here after generation. Check the Articles section for the full content."}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blog Writer Job History */}
        {blogJobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Recent Articles
            </h2>
            <div className="space-y-2">
              {blogJobs.map((job, i) => (
                <div
                  key={job.id}
                  className="card-static p-4 fade-in"
                  style={{
                    animationDelay: `${i * 0.02}s`,
                    cursor: job.status === "complete" && job.output ? "pointer" : "default",
                  }}
                  onClick={async () => {
                    if (job.status === "complete" && job.output) {
                      const o = job.output as unknown as GeneratedArticle;
                      if (o.articleId) {
                        try {
                          const res = await fetch(`/api/articles/${o.articleId}`);
                          if (res.ok) {
                            const data = await res.json();
                            setArticle({ ...o, bodyMarkdown: data.bodyMarkdown, bodyHtml: data.bodyHtml, status: data.status });
                          } else {
                            setArticle(o);
                          }
                        } catch {
                          setArticle(o);
                        }
                      } else {
                        setArticle(o);
                      }
                      setArticleTab("preview");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#4F6EF715" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {(job.output as { title?: string })?.title || (job.config as { topic?: string })?.topic || "Blog Article"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {(job.config as { topic?: string })?.topic || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md capitalize"
                        style={{
                          background: job.status === "complete" ? "var(--low-bg)" : job.status === "failed" ? "var(--critical-bg)" : "var(--border-light)",
                          color: job.status === "complete" ? "var(--success)" : job.status === "failed" ? "var(--critical)" : "var(--text-muted)",
                        }}
                      >
                        {job.status}
                      </span>
                      {job.creditsUsed > 0 && (
                        <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{job.creditsUsed} cr</span>
                      )}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                      {job.status === "complete" && job.output && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md" style={{ background: "#4F6EF715", color: "#4F6EF7" }}>
                          View Results
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
