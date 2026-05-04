"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

const features = [
  { category: "Site Audit", feature: "Technical SEO audit with scoring", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Site Audit", feature: "Per-page analysis with fix suggestions", ranqapex: true, surfer: true, jasper: false, frase: false },
  { category: "Site Audit", feature: "AI Readiness Score (GEO)", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "GEO", feature: "llms.txt generator", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "GEO", feature: "AI Citation Snippets", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "GEO", feature: "Entity Map (JSON-LD)", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "GEO", feature: "AI crawler detection", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Content", feature: "AI article generation", ranqapex: true, surfer: true, jasper: true, frase: true },
  { category: "Content", feature: "Pillar & Cluster strategy", ranqapex: true, surfer: false, jasper: false, frase: true },
  { category: "Content", feature: "SERP-based content briefs", ranqapex: true, surfer: true, jasper: false, frase: true },
  { category: "Content", feature: "Product-aware articles (CSV)", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Content", feature: "Multi-language support", ranqapex: true, surfer: true, jasper: true, frase: false },
  { category: "Content", feature: "GSC keyword integration", ranqapex: true, surfer: true, jasper: false, frase: false },
  { category: "Keyword", feature: "Magic Keyword Planner", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Keyword", feature: "Competitor gap analysis", ranqapex: true, surfer: true, jasper: false, frase: true },
  { category: "Keyword", feature: "Keyword difficulty scoring", ranqapex: true, surfer: true, jasper: false, frase: true },
  { category: "Images", feature: "AI-generated hero images", ranqapex: true, surfer: false, jasper: true, frase: false },
  { category: "Images", feature: "Product photo composites", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Publishing", feature: "WordPress integration", ranqapex: true, surfer: false, jasper: true, frase: false },
  { category: "Publishing", feature: "Shopify integration", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Pricing", feature: "Free tier available", ranqapex: true, surfer: false, jasper: false, frase: false },
  { category: "Pricing", feature: "Plans under $10/mo", ranqapex: true, surfer: false, jasper: false, frase: false },
];

const competitors = [
  { key: "surfer" as const, name: "SurferSEO", desc: "On-page optimization", price: "$99/mo" },
  { key: "jasper" as const, name: "Jasper", desc: "AI copywriting", price: "$49/mo" },
  { key: "frase" as const, name: "Frase", desc: "Content briefs & AI writing", price: "$45/mo" },
];

export default function ComparePage() {
  usePageTitle("Ranqapex vs SurferSEO vs Jasper vs Frase — 2026 Comparison");
  const categories = [...new Set(features.map((f) => f.category))];
  const ranqapexCount = features.filter((f) => f.ranqapex).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav className="px-6 py-5 flex items-center justify-between max-w-[1200px] mx-auto w-full">
        <Link href="/"><Logo size={36} /></Link>
        <div className="flex items-center gap-2">
          <Link href="/blog" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>Blog</Link>
          <Link href="/pricing" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>Pricing</Link>
          <Link href="/dashboard" className="text-sm font-medium px-5 py-2 rounded-lg" style={{ color: "var(--accent)", background: "var(--accent-light)" }}>Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-[1000px] mx-auto px-6 py-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
            Feature Comparison
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Ranqapex vs Top SEO Tools
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            How Ranqapex compares to SurferSEO, Jasper, and Frase in 2026
          </p>
        </div>

        {/* Score summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
          <div className="card-static" style={{ padding: 20, textAlign: "center", borderLeft: "3px solid #4F6EF7" }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#4F6EF7", margin: "0 0 4px" }}>{ranqapexCount}/{features.length}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>Ranqapex</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>From $1/mo</p>
          </div>
          {competitors.map((c) => (
            <div key={c.key} className="card-static" style={{ padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: "var(--text-muted)", margin: "0 0 4px" }}>{features.filter((f) => f[c.key]).length}/{features.length}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{c.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{c.price}</p>
            </div>
          ))}
        </div>

        {/* Feature table */}
        <div className="card-static" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--text-secondary)" }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "12px 12px", fontWeight: 700, color: "#4F6EF7", minWidth: 90 }}>Ranqapex</th>
                  {competitors.map((c) => (
                    <th key={c.key} style={{ textAlign: "center", padding: "12px 12px", fontWeight: 600, color: "var(--text-secondary)", minWidth: 90 }}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <Fragment key={cat}>
                    <tr style={{ background: "var(--bg)" }}>
                      <td colSpan={5} style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{cat}</td>
                    </tr>
                    {features.filter((f) => f.category === cat).map((f) => (
                      <tr key={f.feature} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text-primary)" }}>{f.feature}</td>
                        <td style={{ textAlign: "center", padding: "10px 12px" }}>
                          {f.ranqapex ? <Check /> : <Cross />}
                        </td>
                        {competitors.map((c) => (
                          <td key={c.key} style={{ textAlign: "center", padding: "10px 12px" }}>
                            {f[c.key] ? <Check /> : <Cross />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key differentiator callout */}
        <div style={{ marginTop: 24, padding: "20px 24px", borderRadius: 14, background: "#f0f5ff", border: "1px solid #c7d7fe" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>Why Ranqapex is different</p>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.7, margin: 0 }}>
            Ranqapex is the only tool that combines traditional SEO (audits, keyword research, content generation) with
            Generative Engine Optimization (GEO) — helping your site get cited by ChatGPT, Perplexity, and Google AI Overviews.
            No other tool generates llms.txt, entity maps, or AI citation snippets. And it starts at $1 instead of $49-99/mo.
          </p>
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: 32, padding: 32, borderRadius: 16, textAlign: "center", background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Ready to try Ranqapex?</h3>
          <p style={{ fontSize: 14, marginBottom: 20, color: "rgba(255,255,255,0.8)" }}>Start with a free audit. No credit card required.</p>
          <Link href="/" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#fff", color: "#4F6EF7", textDecoration: "none" }}>
            Start Free Audit
          </Link>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ display: "inline" }}><polyline points="20 6 9 17 4 12" /></svg>;
}
function Cross() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ display: "inline", opacity: 0.3 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
