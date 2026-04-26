"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

const features = [
  { category: "Site Audit", feature: "Technical SEO audit with scoring", ranqapex: true, seo45: false },
  { category: "Site Audit", feature: "Per-page analysis with fix suggestions", ranqapex: true, seo45: false },
  { category: "GEO", feature: "AI Readiness Score (0-100)", ranqapex: true, seo45: false },
  { category: "GEO", feature: "AI Crawler detection (robots.txt)", ranqapex: true, seo45: false },
  { category: "GEO", feature: "llms.txt generator", ranqapex: true, seo45: false },
  { category: "GEO", feature: "llms-full.txt (semantic profile)", ranqapex: true, seo45: false },
  { category: "GEO", feature: "Entity Map (JSON-LD)", ranqapex: true, seo45: false },
  { category: "GEO", feature: "AI Citation Snippets", ranqapex: true, seo45: false },
  { category: "Content", feature: "AI article generation", ranqapex: true, seo45: true },
  { category: "Content", feature: "Pillar & Cluster strategy", ranqapex: true, seo45: false },
  { category: "Content", feature: "GSC-driven keyword research", ranqapex: true, seo45: true },
  { category: "Content", feature: "Product-aware articles (CSV)", ranqapex: true, seo45: false },
  { category: "Content", feature: "Auto internal linking", ranqapex: true, seo45: true },
  { category: "Content", feature: "Multi-language support", ranqapex: true, seo45: true },
  { category: "Content", feature: "SERP competitor analysis", ranqapex: true, seo45: false },
  { category: "Images", feature: "AI-generated hero images", ranqapex: true, seo45: true },
  { category: "Images", feature: "Product photo composites", ranqapex: true, seo45: false },
  { category: "Images", feature: "Inline product images from CSV", ranqapex: true, seo45: false },
  { category: "Publishing", feature: "WordPress publishing", ranqapex: true, seo45: true },
  { category: "Publishing", feature: "Shopify publishing", ranqapex: true, seo45: true },
  { category: "Publishing", feature: "Auto-publish on schedule", ranqapex: false, seo45: true },
  { category: "Publishing", feature: "Webflow integration", ranqapex: false, seo45: true },
  { category: "Other", feature: "Article review workflow", ranqapex: true, seo45: false },
  { category: "Other", feature: "Backlink network access", ranqapex: false, seo45: true },
  { category: "Other", feature: "White-label reports", ranqapex: false, seo45: true },
  { category: "Other", feature: "Free tier available", ranqapex: true, seo45: false },
];

export default function ComparePage() {
  usePageTitle("Ranqapex vs SEO45 — Feature Comparison 2026");
  const categories = [...new Set(features.map((f) => f.category))];
  const ranqapexCount = features.filter((f) => f.ranqapex).length;
  const seo45Count = features.filter((f) => f.seo45).length;

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

      <div className="max-w-[900px] mx-auto px-6 py-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
            Comparison
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Ranqapex vs SEO45
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Full feature comparison for SEO automation in 2026
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Score summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card-static p-6 text-center">
            <p className="text-3xl font-bold mb-1" style={{ color: "var(--accent)" }}>{ranqapexCount}/{features.length}</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ranqapex</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Full SEO + GEO platform</p>
          </div>
          <div className="card-static p-6 text-center">
            <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-muted)" }}>{seo45Count}/{features.length}</p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>SEO45</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Autopilot content publishing</p>
          </div>
        </div>

        {/* Feature table */}
        <div className="card-static overflow-hidden">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                <th className="text-left px-5 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Feature</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--accent)" }}>Ranqapex</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>SEO45</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <Fragment key={cat}>
                  <tr style={{ background: "var(--bg)" }}>
                    <td colSpan={3} className="px-5 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{cat}</td>
                  </tr>
                  {features.filter((f) => f.category === cat).map((f) => (
                    <tr key={f.feature} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td className="px-5 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{f.feature}</td>
                      <td className="text-center px-4 py-3">
                        {f.ranqapex ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="mx-auto"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto" opacity={0.4}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </td>
                      <td className="text-center px-4 py-3">
                        {f.seo45 ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="mx-auto"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto" opacity={0.4}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 p-8 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
          <h3 className="text-xl font-bold mb-2 text-white">Ready to try Ranqapex?</h3>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.8)" }}>Start with a free audit. No credit card required.</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold" style={{ background: "#fff", color: "#4F6EF7" }}>
            Start Free Audit →
          </Link>
        </div>
      </div>
    </div>
  );
}
