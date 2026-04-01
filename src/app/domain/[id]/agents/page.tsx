"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

// ── Types ────────────────────────────────────────────────────────────

interface CreditInfo {
  plan: string;
  credits: { total: number; used: number; remaining: number };
}

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  label: string;
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

// ── Agent definitions ────────────────────────────────────────────────

const AGENTS = [
  {
    type: "blog_writer",
    name: "Blog Writer",
    description: "Generate SEO-optimized blog posts with keyword targeting, internal links, and FAQ schema.",
    credits: 3,
    color: "#4F6EF7",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    type: "internal_linker",
    name: "Internal Linker",
    description: "Analyze your pages to find linking gaps, orphan pages, and suggest anchor text for better link equity flow.",
    credits: 7,
    color: "#7C5CFC",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    type: "product_infuser",
    name: "Product Infuser",
    description: "Connect your store and auto-infuse product mentions into your content. Upload a CSV of your products to get started.",
    credits: 2,
    color: "#E5890A",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    badge: "E-Commerce",
  },
];

// ── Component ────────────────────────────────────────────────────────

export default function AgentsPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  const [result, setResult] = useState<{ agentType: string; output: Record<string, unknown> } | null>(null);

  // Blog Writer mode
  const [blogMode, setBlogMode] = useState<"custom" | "smart">("smart");
  const [smartAnalysis, setSmartAnalysis] = useState<SmartAnalysis | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  // Form state for each agent
  const [blogConfig, setBlogConfig] = useState({
    topic: "",
    keywords: "",
    tone: "professional" as "professional" | "casual" | "technical",
    wordCount: 1500,
  });
  const [linkerConfig, setLinkerConfig] = useState({ maxSuggestions: 20 });
  const [products, setProducts] = useState<Array<{ name: string; url: string; price: string; description: string; category: string }>>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  function handleCsvUpload(file: File) {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) { setCsvError("CSV must have a header row and at least one product."); return; }

        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("title") || h.includes("product"));
        const urlIdx = header.findIndex((h) => h.includes("url") || h.includes("link"));
        const priceIdx = header.findIndex((h) => h.includes("price") || h.includes("cost"));
        const descIdx = header.findIndex((h) => h.includes("desc"));
        const catIdx = header.findIndex((h) => h.includes("categ") || h.includes("type") || h.includes("collection"));

        if (nameIdx === -1) { setCsvError("CSV must have a 'name' or 'title' column."); return; }

        const parsed = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          return {
            name: cols[nameIdx] || "",
            url: urlIdx >= 0 ? cols[urlIdx] || "" : "",
            price: priceIdx >= 0 ? cols[priceIdx] || "" : "",
            description: descIdx >= 0 ? cols[descIdx] || "" : "",
            category: catIdx >= 0 ? cols[catIdx] || "" : "",
          };
        }).filter((p) => p.name);

        if (parsed.length === 0) { setCsvError("No valid products found in CSV."); return; }
        setProducts(parsed);

        // Save products to API
        fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domainId, products: parsed }),
        }).catch(() => {});
      } catch {
        setCsvError("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  }

  const fetchData = useCallback(async () => {
    const [creditsRes, packsRes, jobsRes, productsRes] = await Promise.all([
      fetch("/api/credits"),
      fetch("/api/credits/purchase"),
      fetch(`/api/agents/jobs?domainId=${domainId}`),
      fetch(`/api/products/import?domainId=${domainId}`),
    ]);
    if (creditsRes.ok) setCredits(await creditsRes.json());
    if (packsRes.ok) {
      const data = await packsRes.json();
      setPacks(data.packs || []);
    }
    if (jobsRes.ok) setJobs(await jobsRes.json());
    if (productsRes.ok) {
      const data = await productsRes.json();
      if (Array.isArray(data) && data.length > 0) setProducts(data);
    }
  }, [domainId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-show the latest completed job result on page load
  useEffect(() => {
    if (result || jobs.length === 0) return;
    const latestComplete = jobs.find((j) => j.status === "complete" && j.output);
    if (latestComplete) {
      setResult({ agentType: latestComplete.agentType, output: latestComplete.output! });
    }
  }, [jobs, result]);

  // Fetch smart suggestions when blog writer opens in smart mode
  async function fetchSmartSuggestions(force = false) {
    if (smartAnalysis && !force) return;
    setSmartLoading(true);
    setSmartError(null);
    try {
      const res = await fetch(`/api/agents/smart-suggest?domainId=${domainId}`);
      const data = await res.json();
      if (res.ok) {
        setSmartAnalysis(data);
      } else {
        setSmartError(data.error || "Failed to analyze site");
      }
    } catch {
      setSmartError("Failed to connect. Please try again.");
    } finally {
      setSmartLoading(false);
    }
  }

  // Auto-trigger smart analysis when blog writer panel opens
  useEffect(() => {
    if (activeAgent === "blog_writer" && blogMode === "smart" && !smartAnalysis && !smartLoading && !smartError) {
      fetchSmartSuggestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent, blogMode]);

  // Auto-deploy from a smart suggestion
  async function deploySmartSuggestion(suggestion: SmartSuggestion) {
    setDeploying(true);
    setResult(null);
    try {
      const res = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId,
          agentType: "blog_writer",
          config: {
            topic: suggestion.topic,
            keywords: suggestion.keywords,
            tone: suggestion.tone,
            wordCount: suggestion.wordCount,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Deployment failed");
      } else {
        setResult({ agentType: "blog_writer", output: data.output });
        setActiveAgent(null);
      }
      await fetchData();
    } catch {
      alert("Something went wrong");
    } finally {
      setDeploying(false);
    }
  }

  async function deployAgent(agentType: string) {
    setDeploying(true);
    setResult(null);

    let config: Record<string, unknown>;
    switch (agentType) {
      case "blog_writer":
        config = {
          topic: blogConfig.topic,
          keywords: blogConfig.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          tone: blogConfig.tone,
          wordCount: blogConfig.wordCount,
        };
        break;
      case "internal_linker":
        config = { maxSuggestions: linkerConfig.maxSuggestions };
        break;
      case "product_infuser":
        config = {
          productName: products[0]?.name || "Product",
          productUrl: products[0]?.url || "",
          productDescription: products.map((p) => `${p.name} (${p.category || "general"})`).join(", ").slice(0, 500),
          targetPages: [],
        };
        break;
      default:
        return;
    }

    try {
      const res = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, agentType, config }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Deployment failed");
      } else {
        setResult({ agentType, output: data.output });
        setActiveAgent(null);
      }
      await fetchData();
    } catch {
      alert("Something went wrong");
    } finally {
      setDeploying(false);
    }
  }

  async function buyCredits(packId: string) {
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (res.ok) {
        await fetchData();
        setShowBuyCredits(false);
      }
    } finally {
      setBuyingPack(null);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Logo size={26} /></Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <Link href={`/domain/${domainId}`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Overview</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">Agents</span>
          </div>
          <div className="flex items-center gap-3">
            {credits && (
              <button
                onClick={() => setShowBuyCredits(!showBuyCredits)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /></svg>
                {Math.floor(credits.credits.remaining)} credits
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">AI Agents</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Deploy specialized agents to automate content creation, linking, and product placement.
            </p>
          </div>
        </div>

        {/* Buy Credits Panel */}
        {showBuyCredits && (
          <div className="card-static p-6 mb-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Buy Credits
              </h2>
              <button
                onClick={() => setShowBuyCredits(false)}
                className="text-xs cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => buyCredits(pack.id)}
                  disabled={buyingPack === pack.id}
                  className="p-4 rounded-xl text-center cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-white)",
                  }}
                >
                  <p className="text-2xl font-bold mb-1" style={{ color: "var(--accent)" }}>
                    {pack.credits}
                  </p>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    credits
                  </p>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    ${pack.price}
                  </p>
                  {buyingPack === pack.id && (
                    <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>Adding...</p>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              Credits are added to your account instantly. No payment integration yet — credits are simulated for demo.
            </p>
          </div>
        )}

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {AGENTS.map((agent) => (
            <div key={agent.type} className="card-static overflow-hidden">
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: agent.color + "15" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={agent.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={agent.icon} />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    {"badge" in agent && agent.badge && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "#7C5CFC15", color: "#7C5CFC" }}>
                        {agent.badge}
                      </span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: agent.color + "12", color: agent.color }}>
                      {agent.credits} credits
                    </span>
                  </div>
                </div>
                <h3 className="font-bold text-sm mb-1.5">{agent.name}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {agent.description}
                </p>
              </div>

              {/* Deploy Button */}
              <div className="px-6 pb-5">
                <button
                  onClick={() => setActiveAgent(activeAgent === agent.type ? null : agent.type)}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                  style={{
                    background: activeAgent === agent.type ? agent.color : "var(--bg)",
                    color: activeAgent === agent.type ? "white" : "var(--text-primary)",
                    border: `1px solid ${activeAgent === agent.type ? agent.color : "var(--border)"}`,
                  }}
                >
                  {agent.type === "product_infuser"
                    ? (activeAgent === agent.type ? "Close" : "Connect Your Store")
                    : (activeAgent === agent.type ? "Configure" : "Deploy")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Blog Writer Configuration Panel */}
        {activeAgent === "blog_writer" && (
          <div className="card-static p-6 mb-6 fade-in">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--bg)", display: "inline-flex" }}>
              <button
                onClick={() => { setBlogMode("smart"); fetchSmartSuggestions(); }}
                className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all"
                style={{
                  background: blogMode === "smart" ? "var(--bg-white)" : "transparent",
                  color: blogMode === "smart" ? "#4F6EF7" : "var(--text-muted)",
                  boxShadow: blogMode === "smart" ? "var(--shadow-sm)" : "none",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Smart Auto-Generate
                </span>
              </button>
              <button
                onClick={() => setBlogMode("custom")}
                className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all"
                style={{
                  background: blogMode === "custom" ? "var(--bg-white)" : "transparent",
                  color: blogMode === "custom" ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: blogMode === "custom" ? "var(--shadow-sm)" : "none",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Custom Topic
                </span>
              </button>
            </div>

            {/* Smart Mode */}
            {blogMode === "smart" && (
              <div>
                {smartLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-pulse mb-3" style={{ color: "#4F6EF7" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      Analyzing your website...
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Scanning pages, keywords, content gaps, and audit issues
                    </p>
                  </div>
                ) : smartAnalysis ? (
                  <div>
                    {/* Site Intelligence Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-lg font-bold tabular-nums" style={{ color: "#4F6EF7" }}>{smartAnalysis.pagesAnalyzed}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pages Analyzed</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-lg font-bold tabular-nums" style={{ color: "#4F6EF7" }}>{smartAnalysis.siteKeywords.length}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Keywords Found</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-lg font-bold tabular-nums" style={{ color: smartAnalysis.thinContentPages > 0 ? "var(--high)" : "var(--success)" }}>{smartAnalysis.thinContentPages}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Content Gaps</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                        <p className="text-sm font-bold" style={{ color: "#4F6EF7" }}>{smartAnalysis.niche}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Detected Niche</p>
                      </div>
                      <div className="p-3 rounded-lg text-center" style={{ background: smartAnalysis.siteType === "product" ? "#E5890A12" : smartAnalysis.siteType === "service" ? "#4F6EF712" : "var(--bg)" }}>
                        <p className="text-sm font-bold" style={{ color: smartAnalysis.siteType === "product" ? "#E5890A" : "#4F6EF7" }}>{smartAnalysis.siteTypeLabel}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Site Type</p>
                      </div>
                    </div>

                    {/* Top Keywords */}
                    <div className="mb-5">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                        Your Top Keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {smartAnalysis.siteKeywords.map((kw, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: "#4F6EF715", color: "#4F6EF7" }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Topic Suggestions */}
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                      Recommended Topics — Pick one to auto-generate
                    </p>
                    <div className="space-y-2 mb-5">
                      {smartAnalysis.suggestions.map((suggestion, i) => {
                        const isSelected = selectedSuggestion === i;
                        const priorityColors: Record<string, string> = { high: "var(--critical)", medium: "var(--high)", low: "var(--success)" };
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
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4F6EF7" }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded capitalize" style={{ background: (priorityColors[suggestion.priority] || "var(--text-muted)") + "15", color: priorityColors[suggestion.priority] || "var(--text-muted)" }}>
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
                                    <span key={j} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-white)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        if (selectedSuggestion !== null) {
                          deploySmartSuggestion(smartAnalysis.suggestions[selectedSuggestion]);
                        }
                      }}
                      disabled={deploying || selectedSuggestion === null}
                      className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                      style={{ background: "#4F6EF7" }}
                    >
                      {deploying ? (
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
                    {smartError && (
                      <div className="p-4 rounded-xl mb-4 mx-auto max-w-md" style={{ background: "var(--critical-bg)", border: "1px solid var(--critical)" }}>
                        <p className="text-sm font-medium" style={{ color: "var(--critical)" }}>{smartError}</p>
                      </div>
                    )}
                    <button
                      onClick={() => fetchSmartSuggestions(true)}
                      className="btn-primary px-6 py-2.5 text-sm cursor-pointer"
                    >
                      {smartError ? "Retry Analysis" : "Analyze My Site"}
                    </button>
                    <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                      We&apos;ll scan your crawled pages, detect whether your site is product-based or service-based, find content gaps, and suggest the best blog topics.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Custom Mode */}
            {blogMode === "custom" && (
              <div>
                <div className="space-y-4 mb-6">
                  <FormField label="Topic" required>
                    <input
                      type="text"
                      value={blogConfig.topic}
                      onChange={(e) => setBlogConfig({ ...blogConfig, topic: e.target.value })}
                      placeholder="e.g., How to improve website loading speed"
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="Target Keywords" hint="Comma separated">
                    <input
                      type="text"
                      value={blogConfig.keywords}
                      onChange={(e) => setBlogConfig({ ...blogConfig, keywords: e.target.value })}
                      placeholder="e.g., page speed, core web vitals, site performance"
                      className="form-input"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Tone">
                      <select
                        value={blogConfig.tone}
                        onChange={(e) => setBlogConfig({ ...blogConfig, tone: e.target.value as "professional" | "casual" | "technical" })}
                        className="form-input"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="technical">Technical</option>
                      </select>
                    </FormField>
                    <FormField label="Word Count">
                      <select
                        value={blogConfig.wordCount}
                        onChange={(e) => setBlogConfig({ ...blogConfig, wordCount: Number(e.target.value) })}
                        className="form-input"
                      >
                        <option value={800}>800 words</option>
                        <option value={1200}>1,200 words</option>
                        <option value={1500}>1,500 words</option>
                        <option value={2000}>2,000 words</option>
                        <option value={3000}>3,000 words</option>
                      </select>
                    </FormField>
                  </div>
                </div>
                <button
                  onClick={() => deployAgent("blog_writer")}
                  disabled={deploying || !blogConfig.topic}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                  style={{ background: "#4F6EF7" }}
                >
                  {deploying ? (
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
        )}

        {activeAgent === "internal_linker" && (
          <div className="card-static p-6 mb-6 fade-in">
            <h2 className="text-sm font-bold mb-4" style={{ color: "#7C5CFC" }}>
              Internal Linker Configuration
            </h2>
            <div className="space-y-4 mb-6">
              <FormField label="Max Suggestions" hint="How many linking opportunities to find">
                <select
                  value={linkerConfig.maxSuggestions}
                  onChange={(e) => setLinkerConfig({ maxSuggestions: Number(e.target.value) })}
                  className="form-input"
                >
                  <option value={10}>10 suggestions</option>
                  <option value={20}>20 suggestions</option>
                  <option value={50}>50 suggestions</option>
                </select>
              </FormField>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                The agent will analyze all crawled pages, find orphan pages with zero inbound links, and suggest contextual linking opportunities based on keyword overlap.
              </p>
            </div>
            <button
              onClick={() => deployAgent("internal_linker")}
              disabled={deploying}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
              style={{ background: "#7C5CFC" }}
            >
              {deploying ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                  Analyzing Links...
                </span>
              ) : (
                "Deploy Agent (2 credits)"
              )}
            </button>
          </div>
        )}

        {activeAgent === "product_infuser" && (
          <div className="card-static p-6 mb-6 fade-in">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-bold" style={{ color: "#E5890A" }}>
                Connect Your Store
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "#7C5CFC15", color: "#7C5CFC" }}>
                E-Commerce
              </span>
            </div>

            {/* Product count if any loaded */}
            {products.length > 0 && (
              <div className="p-4 rounded-xl mb-5 flex items-center justify-between" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                  <span className="text-sm font-semibold" style={{ color: "#166534" }}>{products.length} products loaded</span>
                </div>
                <button
                  onClick={() => deployAgent("product_infuser")}
                  disabled={deploying}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-40"
                  style={{ background: "#E5890A" }}
                >
                  {deploying ? "Running..." : "Run Infuser (2 credits)"}
                </button>
              </div>
            )}

            {/* CSV Upload */}
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#E5890A"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; const f = e.dataTransfer.files[0]; if (f) handleCsvUpload(f); }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-medium mb-1">Drop your product CSV here</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                or click to browse. Columns: name, url, price, description, category
              </p>
              <label className="inline-block px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer" style={{ background: "#E5890A", color: "#fff" }}>
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvUpload(f);
                  }}
                />
              </label>
            </div>

            {csvError && (
              <p className="text-xs mt-3" style={{ color: "var(--critical)" }}>{csvError}</p>
            )}

            {/* Product table preview */}
            {products.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Products Preview
                </p>
                <div className="overflow-auto max-h-[240px] rounded-lg" style={{ border: "1px solid var(--border)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--bg)" }}>
                        <th className="text-left p-2 font-semibold" style={{ color: "var(--text-muted)" }}>Name</th>
                        <th className="text-left p-2 font-semibold" style={{ color: "var(--text-muted)" }}>Price</th>
                        <th className="text-left p-2 font-semibold" style={{ color: "var(--text-muted)" }}>Category</th>
                        <th className="text-left p-2 font-semibold" style={{ color: "var(--text-muted)" }}>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 10).map((p, i) => (
                        <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="p-2 font-medium">{p.name}</td>
                          <td className="p-2" style={{ color: "var(--text-secondary)" }}>{p.price || "—"}</td>
                          <td className="p-2" style={{ color: "var(--text-secondary)" }}>{p.category || "—"}</td>
                          <td className="p-2 truncate max-w-[150px]" style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{p.url || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length > 10 && (
                    <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
                      +{products.length - 10} more products
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
              CSV format: <code style={{ fontSize: 10, background: "var(--bg)", padding: "2px 4px", borderRadius: 4 }}>name,url,price,description,category</code>.
              The agent will analyze your content and suggest natural product placements.
            </p>
          </div>
        )}

        {/* Result Panel */}
        {result && (
          <div id="result-panel">
            <ResultPanel result={result} onClose={() => setResult(null)} />
          </div>
        )}

        {/* Job History */}
        {jobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Recent Deployments
            </h2>
            <div className="space-y-2">
              {jobs.map((job, i) => {
                const agent = AGENTS.find((a) => a.type === job.agentType);
                return (
                  <div
                    key={job.id}
                    className="card-static p-4 fade-in"
                    style={{
                      animationDelay: `${i * 0.02}s`,
                      cursor: job.status === "complete" && job.output ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (job.status === "complete" && job.output) {
                        setResult({ agentType: job.agentType, output: job.output });
                        setTimeout(() => {
                          document.getElementById("result-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center"
                        style={{ background: (agent?.color || "#999") + "15" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={agent?.color || "#999"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={agent?.icon || ""} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{agent?.name || job.agentType}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {job.config ? summarizeConfig(job.agentType, job.config) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={job.status} />
                        {job.creditsUsed > 0 && (
                          <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                            {job.creditsUsed} cr
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        {job.status === "complete" && job.output && (
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-md"
                            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                          >
                            View Results
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

      <style jsx>{`
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 13px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s ease;
        }
        .form-input:focus {
          border-color: var(--accent);
        }
        .form-input::placeholder {
          color: var(--text-muted);
        }
        select.form-input {
          cursor: pointer;
        }
        textarea.form-input {
          resize: vertical;
          min-height: 60px;
        }
      `}</style>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        {required && <span className="text-xs" style={{ color: "var(--critical)" }}>*</span>}
        {hint && <span className="text-xs" style={{ color: "var(--text-muted)" }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    complete: { bg: "var(--low-bg)", color: "var(--success)" },
    running: { bg: "var(--accent-light)", color: "var(--accent)" },
    queued: { bg: "var(--border-light)", color: "var(--text-muted)" },
    failed: { bg: "var(--critical-bg)", color: "var(--critical)" },
  };
  const s = styles[status] || styles.queued;
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-md capitalize" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function ResultPanel({
  result,
  onClose,
}: {
  result: { agentType: string; output: Record<string, unknown> };
  onClose: () => void;
}) {
  const agent = AGENTS.find((a) => a.type === result.agentType);

  return (
    <div className="card-static p-6 mb-6 fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold" style={{ color: agent?.color || "var(--accent)" }}>
          {agent?.name} Results
        </h2>
        <button onClick={onClose} className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
          Close
        </button>
      </div>

      {result.agentType === "blog_writer" && <BlogWriterResult output={result.output} />}
      {result.agentType === "internal_linker" && <InternalLinkerResult output={result.output} />}
      {result.agentType === "product_infuser" && <ProductInfuserResult output={result.output} />}
    </div>
  );
}

function BlogWriterResult({ output }: { output: Record<string, unknown> }) {
  const o = output as {
    articleId: string;
    title: string; metaTitle: string; metaDescription: string; slug: string;
    outline: Array<{ heading: string; summary: string; keyPoints: string[] }>;
    suggestedInternalLinks: Array<{ anchorText: string; targetUrl: string }>;
    faqItems: Array<{ question: string; answer: string }>;
    imageSuggestions: Array<{ placement: string; altText: string; description: string }>;
    qualityChecks: { overallScore: number; readabilityScore: number; keywordInTitle: boolean; keywordInH1: boolean; keywordInFirst100Words: boolean; keywordDensity: number; metaTitleLength: number; metaDescLength: number; hasInternalLinks: boolean; hasFaq: boolean; hasImages: boolean };
    estimatedWordCount: number;
    reviewEmailSent?: boolean;
    reviewUrl?: string;
  };

  const qc = o.qualityChecks;

  return (
    <div className="space-y-5">
      {/* Review email notification */}
      {o.reviewEmailSent && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#166534" }}>Review email sent</p>
            <p className="text-xs" style={{ color: "#15803d" }}>
              Check your inbox to Accept or Request Rework.
              {o.reviewUrl && (
                <> Or <a href={o.reviewUrl} className="underline font-medium">review here</a>.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Title & Meta */}
      <div className="p-4 rounded-xl" style={{ background: "var(--bg)" }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Title</p>
        <p className="text-sm font-semibold">{o.title}</p>
      </div>
      <div className="p-4 rounded-xl" style={{ background: "var(--bg)" }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Meta Description</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{o.metaDescription}</p>
      </div>

      {/* Quality Checks */}
      {qc && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Quality Checks — Score: {qc.overallScore}/100
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Keyword in Title", pass: qc.keywordInTitle },
              { label: "Keyword in H1", pass: qc.keywordInH1 },
              { label: "Keyword in First 100w", pass: qc.keywordInFirst100Words },
              { label: "Internal Links", pass: qc.hasInternalLinks },
              { label: "FAQ Schema", pass: qc.hasFaq },
              { label: "Image Suggestions", pass: qc.hasImages },
              { label: `Meta Title (${qc.metaTitleLength}ch)`, pass: qc.metaTitleLength >= 30 && qc.metaTitleLength <= 60 },
              { label: `Readability (${qc.readabilityScore})`, pass: qc.readabilityScore >= 60 },
            ].map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-xs p-2 rounded-md" style={{ background: "var(--bg)" }}>
                <span style={{ color: check.pass ? "var(--success)" : "var(--critical)" }}>
                  {check.pass ? "\u2713" : "\u2717"}
                </span>
                <span style={{ color: check.pass ? "var(--text-secondary)" : "var(--critical)" }}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outline */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Outline ({o.outline?.length || 0} sections · ~{o.estimatedWordCount} words)
        </p>
        <div className="space-y-2">
          {o.outline?.map((section, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
              <p className="text-sm font-semibold mb-1">{section.heading}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{section.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Internal Links */}
      {o.suggestedInternalLinks?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Suggested Internal Links
          </p>
          <div className="space-y-1">
            {o.suggestedInternalLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md" style={{ background: "var(--bg)" }}>
                <span className="font-medium" style={{ color: "var(--accent)" }}>{link.anchorText}</span>
                <span style={{ color: "var(--text-muted)" }}> → </span>
                <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{link.targetUrl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Suggestions */}
      {o.imageSuggestions?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Image Suggestions
          </p>
          <div className="space-y-1">
            {o.imageSuggestions.map((img, i) => (
              <div key={i} className="text-xs p-2 rounded-md" style={{ background: "var(--bg)" }}>
                <span className="font-medium">{img.placement}</span>: {img.description}
                <br />
                <span style={{ color: "var(--text-muted)" }}>alt=&quot;{img.altText}&quot;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--success)" }}>
        {o.reviewEmailSent
          ? "Draft saved and review email sent. Nothing publishes without your approval."
          : "Blog post saved as draft in Articles."}
      </p>
    </div>
  );
}

function InternalLinkerResult({ output }: { output: Record<string, unknown> }) {
  const o = output as {
    suggestions: Array<{ sourceUrl: string; sourceTitle: string; targetUrl: string; targetTitle: string; anchorText: string; reason: string; priority: string }>;
    orphanPages: Array<{ url: string; title: string }>;
    stats: { totalPages: number; totalExistingLinks: number; orphanCount: number; suggestionsGenerated: number; avgLinksPerPage: number };
  };

  const priorityColors = { high: "var(--critical)", medium: "var(--high)", low: "var(--success)" };

  // Empty state — no pages crawled
  if (!o.stats || o.stats.totalPages === 0) {
    return (
      <div className="py-8 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <p className="text-sm font-medium mb-1">No pages found to analyze</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Run an audit on this domain first to crawl pages, then deploy the Internal Linker.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Pages Scanned", value: o.stats?.totalPages },
          { label: "Existing Links", value: o.stats?.totalExistingLinks },
          { label: "Orphan Pages", value: o.stats?.orphanCount },
          { label: "Suggestions", value: o.stats?.suggestionsGenerated },
          { label: "Avg Links/Page", value: o.stats?.avgLinksPerPage },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
            <p className="text-lg font-bold tabular-nums" style={{ color: "var(--accent)" }}>{stat.value ?? 0}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Orphan Pages */}
      {o.orphanPages?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--critical)" }}>
            Orphan Pages (No Inbound Links)
          </p>
          <div className="space-y-1">
            {o.orphanPages.map((p, i) => (
              <div key={i} className="text-xs p-2 rounded-md" style={{ background: "var(--critical-bg)", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                {p.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {o.suggestions?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Linking Suggestions
          </p>
          <div className="space-y-2">
            {o.suggestions.slice(0, 15).map((s, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded capitalize" style={{ background: (priorityColors[s.priority as keyof typeof priorityColors] || "var(--text-muted)") + "15", color: priorityColors[s.priority as keyof typeof priorityColors] || "var(--text-muted)" }}>
                    {s.priority}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.reason}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="truncate" style={{ color: "var(--text-secondary)" }}>{s.sourceTitle}</span>
                  <span style={{ color: "var(--accent)" }}>→</span>
                  <span className="truncate font-medium">{s.targetTitle}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Anchor: &ldquo;<span className="font-medium" style={{ color: "var(--accent)" }}>{s.anchorText}</span>&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductInfuserResult({ output }: { output: Record<string, unknown> }) {
  const o = output as {
    suggestions: Array<{ pageUrl: string; pageTitle: string; insertAfterHeading: string; suggestedText: string; relevanceScore: number; reason: string }>;
    stats: { pagesAnalyzed: number; pagesWithOpportunities: number; totalSuggestions: number };
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pages Analyzed", value: o.stats?.pagesAnalyzed },
          { label: "Opportunities", value: o.stats?.pagesWithOpportunities },
          { label: "Suggestions", value: o.stats?.totalSuggestions },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
            <p className="text-lg font-bold tabular-nums" style={{ color: "var(--accent)" }}>{stat.value ?? 0}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {o.suggestions?.length > 0 && (
        <div className="space-y-2">
          {o.suggestions.map((s, i) => (
            <div key={i} className="p-4 rounded-lg" style={{ background: "var(--bg)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium truncate">{s.pageTitle}</p>
                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                  {s.relevanceScore}% match
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{s.reason}</p>
              <div className="p-3 rounded-lg text-xs leading-relaxed" style={{ background: "var(--bg-white)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                {s.suggestedText}
              </div>
            </div>
          ))}
        </div>
      )}

      {o.suggestions?.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          No relevant pages found for product infusion. Try running a crawl first to index more pages.
        </p>
      )}
    </div>
  );
}

function summarizeConfig(agentType: string, config: Record<string, unknown>): string {
  switch (agentType) {
    case "blog_writer":
      return `Topic: ${config.topic || "—"}`;
    case "internal_linker":
      return `Max ${config.maxSuggestions || 20} suggestions`;
    case "product_infuser":
      return `Store: ${config.productName || "—"}`;
    default:
      return "—";
  }
}
