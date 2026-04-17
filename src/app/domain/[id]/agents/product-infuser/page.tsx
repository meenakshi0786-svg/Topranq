"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

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

interface Product {
  name: string;
  url: string;
  price: string;
  description: string;
  category: string;
  imageUrl?: string;
}

interface InfuserResult {
  linksInserted: Array<{ articleId: string; articleTitle: string; productName: string; productUrl: string; anchorText: string; context: string; relevanceScore: number; reason: string }>;
  articlesUpdated: number;
  stats: { articlesAnalyzed: number; productsMatched: number; totalLinksInserted: number; averageRelevance: number; infusionScore: number };
  articleDetails: Array<{ articleId: string; title: string; linksAdded: number; products: string[] }>;
}

export default function ProductInfuserPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [connectors, setConnectors] = useState<Array<{ id: string; platform: string; siteUrl: string; status: string }>>([]);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<InfuserResult | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [connectorUrl, setConnectorUrl] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);

  function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { cell += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cell += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { row.push(cell); cell = ""; }
        else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          row.push(cell); cell = "";
          if (row.some((c) => c.trim())) rows.push(row);
          row = [];
          if (ch === "\r") i++;
        } else { cell += ch; }
      }
    }
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
    return rows;
  }

  function handleCsvUpload(file: File) {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length < 2) { setCsvError("CSV must have a header row and at least one product."); return; }

        const header = rows[0].map((h) => h.toLowerCase().trim());
        const nameIdx = header.findIndex((h) => h === "name" || h === "title" || h === "product" || h.includes("product name") || h.includes("product title"));
        const urlIdx = header.findIndex((h) => (h.includes("url") || h.includes("link") || h.includes("handle")) && !h.includes("image") && !h.includes("cdn") && !h.includes("photo"));
        const priceIdx = header.findIndex((h) => h.includes("price") || h.includes("cost") || h.includes("variant price"));
        const descIdx = header.findIndex((h) => h.includes("desc") || h.includes("body"));
        const catIdx = header.findIndex((h) => h.includes("categ") || h.includes("type") || h.includes("collection") || h.includes("product type"));
        const imageIdx = header.findIndex((h) => h.includes("image") || h.includes("cdn") || h.includes("photo") || h.includes("picture"));

        if (nameIdx === -1) { setCsvError("CSV must have a 'name' or 'title' column. Found: " + header.slice(0, 8).join(", ")); return; }

        const parsed = rows.slice(1).map((cols) => {
          const name = cols[nameIdx]?.trim() || "";
          let url = urlIdx >= 0 ? cols[urlIdx]?.trim() || "" : "";
          if (url && !url.startsWith("http")) url = url.startsWith("/") ? url : `/products/${url}`;
          return {
            name,
            url,
            price: priceIdx >= 0 ? cols[priceIdx]?.trim() || "" : "",
            description: descIdx >= 0 ? cols[descIdx]?.trim().slice(0, 300) || "" : "",
            category: catIdx >= 0 ? cols[catIdx]?.trim() || "" : "",
            imageUrl: imageIdx >= 0 ? cols[imageIdx]?.trim() || "" : "",
          };
        }).filter((p) => p.name && p.name.length > 2);

        if (parsed.length === 0) { setCsvError("No valid products found in CSV."); return; }
        setProducts(parsed);

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
    const [creditsRes, jobsRes, productsRes, connectorsRes] = await Promise.all([
      fetch("/api/credits"),
      fetch(`/api/agents/jobs?domainId=${domainId}`),
      fetch(`/api/products/import?domainId=${domainId}`),
      fetch(`/api/domains/${domainId}/connectors`),
    ]);
    if (creditsRes.ok) setCredits(await creditsRes.json());
    if (jobsRes.ok) {
      const all: AgentJob[] = await jobsRes.json();
      setJobs(all.filter((j) => j.agentType === "product_infuser"));
    }
    if (productsRes.ok) {
      const data = await productsRes.json();
      if (Array.isArray(data) && data.length > 0) setProducts(data);
    }
    if (connectorsRes.ok) {
      const data = await connectorsRes.json();
      if (Array.isArray(data)) setConnectors(data.filter((c: { status: string }) => c.status === "connected"));
    }
  }, [domainId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-show latest result
  useEffect(() => {
    if (result || jobs.length === 0) return;
    const latest = jobs.find((j) => j.status === "complete" && j.output);
    if (latest) setResult(latest.output as unknown as InfuserResult);
  }, [jobs, result]);

  async function deploy() {
    setDeploying(true);
    setResult(null);
    try {
      const res = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId, agentType: "product_infuser", config: { products } }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Deployment failed");
      } else {
        setResult(data.output as InfuserResult);
      }
      await fetchData();
    } catch {
      alert("Something went wrong");
    } finally {
      setDeploying(false);
    }
  }

  const scoreColor = (result?.stats?.infusionScore ?? 0) >= 70 ? "#22c55e" : (result?.stats?.infusionScore ?? 0) >= 40 ? "#f59e0b" : "#ef4444";

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
            <Link href={`/domain/${domainId}/agents`} className="text-sm font-medium" style={{ color: "var(--accent)" }}>Agents</Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-medium">Product Infuser</span>
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
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#E5890A15" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E5890A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Product Infuser</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Connect your store and auto-infuse product mentions into your content.
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md ml-2" style={{ background: "#7C5CFC15", color: "#7C5CFC" }}>E-Commerce</span>
          </div>
        </div>

        {/* Main Panel */}
        <div className="card-static p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: "#E5890A" }}>Product Infuser</h2>
            {connectors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-xs font-medium" style={{ color: "#166534" }}>
                  {connectors.map((c) => c.platform).join(", ")} connected
                </span>
              </div>
            )}
          </div>

          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            The Product Infuser analyzes all your blog articles, matches them with your product catalog, and inserts natural product links where relevant. Higher relevance = higher infusion score.
          </p>

          {/* Product count + Run button */}
          {products.length > 0 && (
            <div className="p-4 rounded-xl mb-5 flex items-center justify-between" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                <span className="text-sm font-semibold" style={{ color: "#166534" }}>{products.length} products loaded</span>
              </div>
              <button
                onClick={deploy}
                disabled={deploying}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-40"
                style={{ background: "#E5890A" }}
              >
                {deploying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                    Analyzing & Linking...
                  </span>
                ) : "Run Infuser (2 credits)"}
              </button>
            </div>
          )}

          {/* Product Preview Table */}
          {products.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Product Catalog</p>
              <div className="overflow-auto max-h-[200px] rounded-lg" style={{ border: "1px solid var(--border)" }}>
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
                    {products.slice(0, 8).map((p, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2" style={{ color: "var(--text-secondary)" }}>{p.price || "—"}</td>
                        <td className="p-2" style={{ color: "var(--text-secondary)" }}>{p.category || "—"}</td>
                        <td className="p-2 truncate max-w-[120px]" style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 10 }}>{p.url || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length > 8 && (
                  <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>+{products.length - 8} more</p>
                )}
              </div>
            </div>
          )}

          {/* No products — prompt to connect */}
          {products.length === 0 && (
            <div className="py-6 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm font-medium mb-1">No products loaded yet</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Connect your store or upload a CSV to get started</p>
            </div>
          )}

          <button
            onClick={() => setShowStoreModal(true)}
            className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer transition-all"
            style={{ background: products.length > 0 ? "var(--bg)" : "#E5890A", color: products.length > 0 ? "var(--text-primary)" : "white", border: "1px solid var(--border)" }}
          >
            {products.length > 0 ? "Change Store Connection" : "Connect Your Store"}
          </button>

          {csvError && (
            <p className="text-xs mt-3" style={{ color: "var(--critical)" }}>{csvError}</p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="card-static p-6 mb-6 fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold" style={{ color: "#E5890A" }}>Product Infuser Results</h2>
              <button onClick={() => setResult(null)} className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>Close</button>
            </div>

            <div className="space-y-5">
              {/* Infusion Score */}
              <div className="p-5 rounded-xl text-center" style={{ background: "var(--bg)" }}>
                <p className="text-4xl font-bold tabular-nums mb-1" style={{ color: scoreColor }}>{result.stats?.infusionScore ?? 0}</p>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Infusion Score</p>
                <div className="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden mt-3" style={{ background: "var(--border-light)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${result.stats?.infusionScore ?? 0}%`, background: scoreColor }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Articles Analyzed", value: result.stats?.articlesAnalyzed ?? 0 },
                  { label: "Articles Updated", value: result.articlesUpdated ?? 0 },
                  { label: "Links Inserted", value: result.stats?.totalLinksInserted ?? 0 },
                  { label: "Products Matched", value: result.stats?.productsMatched ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-lg text-center" style={{ background: "var(--bg)" }}>
                    <p className="text-lg font-bold tabular-nums" style={{ color: "#E5890A" }}>{stat.value}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Articles Updated */}
              {result.articleDetails?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Articles Updated</p>
                  <div className="space-y-2">
                    {result.articleDetails.map((a, i) => (
                      <div key={i} className="p-3 rounded-lg flex items-center justify-between" style={{ background: "var(--bg)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            Products: {a.products.join(", ")}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-md shrink-0 ml-3" style={{ background: "#E5890A15", color: "#E5890A" }}>
                          {a.linksAdded} {a.linksAdded === 1 ? "link" : "links"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Links */}
              {result.linksInserted?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Links Inserted</p>
                  <div className="space-y-2">
                    {result.linksInserted.map((link, i) => (
                      <div key={i} className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold" style={{ color: "#E5890A" }}>{link.productName}</span>
                          <span className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ background: (link.relevanceScore >= 70 ? "#22c55e" : link.relevanceScore >= 40 ? "#f59e0b" : "#ef4444") + "15", color: link.relevanceScore >= 70 ? "#22c55e" : link.relevanceScore >= 40 ? "#f59e0b" : "#ef4444" }}>
                            {link.relevanceScore}%
                          </span>
                        </div>
                        <p className="text-xs mb-1"><span style={{ color: "var(--text-muted)" }}>In:</span> {link.articleTitle}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{link.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.linksInserted?.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  No matching opportunities found. Generate some blog articles first, then run the Product Infuser to link your products.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Job History */}
        {jobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Recent Deployments
            </h2>
            <div className="space-y-2">
              {jobs.map((job, i) => (
                <div
                  key={job.id}
                  className="card-static p-4 fade-in"
                  style={{ animationDelay: `${i * 0.02}s`, cursor: job.status === "complete" && job.output ? "pointer" : "default" }}
                  onClick={() => {
                    if (job.status === "complete" && job.output) {
                      setResult(job.output as unknown as InfuserResult);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#E5890A15" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E5890A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Product Infuser</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {((job.config as Record<string, unknown>)?.products as Product[])?.length || 0} products
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={job.status} />
                      {job.creditsUsed > 0 && (
                        <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{job.creditsUsed} cr</span>
                      )}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                      {job.status === "complete" && job.output && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
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

      {/* ── Connect Store Modal ── */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--bg-white)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <div>
                <h2 className="text-lg font-bold">Connect Your Store</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Where would you like to connect your store?</p>
              </div>
              <button onClick={() => { setShowStoreModal(false); setConnectingPlatform(null); setConnectorUrl(""); }} className="p-2 rounded-lg cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!connectingPlatform ? (
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: "wordpress", name: "WordPress", desc: "Connect via WordPress REST API", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z", color: "#21759b", loginUrl: "https://wordpress.com/log-in" },
                    { id: "shopify", name: "Shopify", desc: "Sync products from your Shopify store", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", color: "#95BF47", loginUrl: "https://accounts.shopify.com/lookup" },
                    { id: "webflow", name: "Webflow", desc: "Connect via Webflow CMS API", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", color: "#4353FF", loginUrl: "https://webflow.com/dashboard/login" },
                    { id: "webhook", name: "Custom Webhook", desc: "POST products to any endpoint", icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71", color: "#6366f1", loginUrl: "" },
                    { id: "csv", name: "Upload a CSV", desc: "Import products from a CSV file", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12", color: "#E5890A", loginUrl: "" },
                  ].map((platform) => {
                    const isConnected = connectors.some((c) => c.platform === platform.id);
                    return (
                      <button
                        key={platform.id}
                        onClick={() => {
                          if (platform.id === "csv") {
                            setConnectingPlatform("csv");
                          } else if (platform.loginUrl) {
                            window.open(platform.loginUrl, "_blank");
                          } else {
                            setConnectingPlatform(platform.id);
                            setConnectorUrl("");
                          }
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl text-left cursor-pointer transition-all"
                        style={{ border: "1px solid var(--border)", background: "var(--bg-white)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = platform.color; e.currentTarget.style.background = platform.color + "08"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-white)"; }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: platform.color + "15" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={platform.icon} /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{platform.name}</p>
                            {isConnected && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: "#dcfce7", color: "#166534" }}>Connected</span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{platform.desc}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    );
                  })}
                </div>
              ) : connectingPlatform === "csv" ? (
                <div>
                  <button onClick={() => setConnectingPlatform(null)} className="flex items-center gap-1 text-xs font-medium mb-4 cursor-pointer" style={{ color: "var(--accent)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    Back
                  </button>
                  <div
                    className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#E5890A"; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; const f = e.dataTransfer.files[0]; if (f) { handleCsvUpload(f); setShowStoreModal(false); setConnectingPlatform(null); } }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm font-medium mb-1">Drop your product CSV here</p>
                    <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                      Columns: name, url, price, description, category
                    </p>
                    <label className="inline-block px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer" style={{ background: "#E5890A", color: "#fff" }}>
                      Browse Files
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleCsvUpload(f); setShowStoreModal(false); setConnectingPlatform(null); } }} />
                    </label>
                  </div>
                  {csvError && <p className="text-xs mt-3" style={{ color: "var(--critical)" }}>{csvError}</p>}
                </div>
              ) : (
                <div>
                  <button onClick={() => setConnectingPlatform(null)} className="flex items-center gap-1 text-xs font-medium mb-4 cursor-pointer" style={{ color: "var(--accent)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    Back
                  </button>
                  <h3 className="text-sm font-bold mb-1 capitalize">Connect {connectingPlatform}</h3>
                  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    {connectingPlatform === "webhook" && "Enter the webhook URL where product data should be sent."}
                  </p>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={connectorUrl}
                      onChange={(e) => setConnectorUrl(e.target.value)}
                      placeholder="https://api.example.com/webhook"
                      className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                    />
                    <button
                      onClick={async () => {
                        if (!connectorUrl) return;
                        try {
                          const res = await fetch(`/api/domains/${domainId}/connectors`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ platform: connectingPlatform, siteUrl: connectorUrl }),
                          });
                          if (res.ok) {
                            await fetchData();
                            setShowStoreModal(false);
                            setConnectingPlatform(null);
                            setConnectorUrl("");
                          }
                        } catch { alert("Connection failed"); }
                      }}
                      disabled={!connectorUrl}
                      className="w-full py-3 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40"
                      style={{ background: "#E5890A" }}
                    >
                      Connect {connectingPlatform}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
