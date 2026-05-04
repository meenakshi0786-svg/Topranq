"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";

const stats = [
  { label: "Pages Crawled", value: "125", subtitle: "Full site analyzed" },
  { label: "Products Imported", value: "376", subtitle: "From Shopify CSV" },
  { label: "Pillar Topics", value: "2", subtitle: "AI-strategized" },
  { label: "Articles Generated", value: "5", subtitle: "Editorial quality" },
];

const auditBefore = 30;
const auditAfter = 91;
const improvement = Math.round(((auditAfter - auditBefore) / auditBefore) * 100);

export default function KataParisCaseStudy() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/"><Logo size={36} /></Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/blog" style={{ fontSize: 14, padding: "8px 16px", color: "var(--text-secondary)", textDecoration: "none" }}>Blog</Link>
            <Link href="/pricing" style={{ fontSize: 14, padding: "8px 16px", color: "var(--text-secondary)", textDecoration: "none" }}>Pricing</Link>
            <Link href="/" style={{ fontSize: 14, fontWeight: 600, padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", textDecoration: "none" }}>Free Audit</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 20, background: "var(--accent-light)", color: "var(--accent)", marginBottom: 16 }}>
            Case Study · Fashion E-commerce
          </span>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.15 }}>
            How KATA PARIS scaled SEO from score 30 to 91 in 14 days
          </h1>
          <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
            A French fashion brand with 376 products and a thin Shopify SEO setup. We ran a full audit, imported the catalog,
            generated a content strategy, and produced editorial articles — all in under two weeks.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--text-muted)" }}>
            <a href="https://kataparis.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Visit kataparis.com →
            </a>
            <span>·</span>
            <span>Industry: Women&apos;s Fashion</span>
            <span>·</span>
            <span>Platform: Shopify</span>
          </div>
        </div>

        {/* Before/After Score */}
        <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 16, padding: 32, marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 20 }}>
            Audit Score: Before vs. After
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 24 }}>
            {/* Before */}
            <div style={{ textAlign: "center", padding: 24, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>Before</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: "#dc2626", lineHeight: 1, margin: "8px 0" }}>{auditBefore}</p>
              <p style={{ fontSize: 12, color: "#991b1b" }}>Critical issues</p>
            </div>
            {/* Arrow */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>+{improvement}%</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)" }}>14 days</p>
            </div>
            {/* After */}
            <div style={{ textAlign: "center", padding: 24, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 4 }}>After</p>
              <p style={{ fontSize: 56, fontWeight: 800, color: "#16a34a", lineHeight: 1, margin: "8px 0" }}>{auditAfter}</p>
              <p style={{ fontSize: 12, color: "#166534" }}>Healthy SEO</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 48 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: 20, background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{s.value}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{s.label}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{s.subtitle}</p>
            </div>
          ))}
        </div>

        {/* The Challenge */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>The Challenge</h2>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)", marginBottom: 12 }}>
            KATA PARIS sells curated French fashion — clothing, accessories, and seasonal collections — through a Shopify storefront with 376 products.
            Their initial SEO audit revealed a score of <strong style={{ color: "#dc2626" }}>30/100</strong>: missing meta descriptions on 90% of product pages,
            no structured data, no internal linking strategy, and zero blog content driving organic traffic.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)" }}>
            They also had no llms.txt or AI optimization — meaning ChatGPT, Perplexity, and Google AI Overviews had no way to discover or cite their products.
          </p>
        </section>

        {/* The Process */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>The Process</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { step: 1, title: "Crawled 125 product + content pages", desc: "Ranqapex's audit identified missing meta tags, weak headings, and pages with thin content. Each issue was scored by impact." },
              { step: 2, title: "Imported 376-product catalog from Shopify CSV", desc: "Products fed directly into the article generator so every blog post links to real SKUs with actual prices." },
              { step: 3, title: "Generated AI keyword strategy", desc: "Magic Keyword Planner discovered low-hanging keywords from competitor SERP gaps and PAA questions." },
              { step: 4, title: "Built pillar-cluster content plan", desc: "Two pillar topics ('jupes longues', 'robes saisonnières') with cluster sub-topics — all linked properly." },
              { step: 5, title: "Generated 5 editorial articles in French", desc: "Sonnet AI produced 1,500-2,500 word editorial articles weaving in 8-12 KATA PARIS products per piece." },
              { step: 6, title: "Generated llms.txt for AI discoverability", desc: "Full semantic profile + entity map deployed so ChatGPT and Perplexity can cite KATA PARIS." },
            ].map((p) => (
              <div key={p.step} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  {p.step}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "4px 0 4px" }}>{p.title}</p>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sample Article */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Sample Generated Article</h2>
          <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 16, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>
                Quality Score: 90/100
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>·</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>515 words · French · Generated by Sonnet</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Jupe Longue: 10 Looks Élégants pour un Style Moderne
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, fontStyle: "italic" }}>
              Découvrez 10 façons stylées de porter la jupe longue cette saison. Inspirations look, conseils morpho et sélection KATA PARIS pour un dressing élégant.
            </p>
            <div style={{ background: "var(--bg)", borderRadius: 12, padding: 20, fontSize: 14, lineHeight: 1.75, color: "var(--text-secondary)" }}>
              <p style={{ margin: "0 0 12px" }}>
                <strong style={{ color: "var(--text-primary)" }}>La jupe longue</strong> s&apos;impose comme la pièce maîtresse du vestiaire moderne.
                Polyvalente, élégante et adaptée à toutes les morphologies, elle se décline aujourd&apos;hui en mille variations — du satin fluide à la maille côtelée,
                du denim brut à la dentelle brodée. Chez <strong style={{ color: "var(--text-primary)" }}>KATA PARIS</strong>, nous croyons qu&apos;une bonne jupe longue
                ne se contente pas d&apos;habiller : elle raconte une histoire personnelle.
              </p>
              <p style={{ margin: 0, color: "var(--text-muted)", fontStyle: "italic" }}>
                ... article continues with 10 styled looks, each linking to specific KATA PARIS products with prices ...
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
              {["Jupe Longue Satin", "Jupe Plissée", "Jupe en Jeans", "Robe Manouche", "Top Caraco"].map(p => (
                <span key={p} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "#f0f5ff", color: "#1e40af", border: "1px solid #c7d7fe" }}>
                  {p}
                </span>
              ))}
              <span style={{ fontSize: 11, padding: "4px 10px", color: "var(--text-muted)" }}>+5 more products linked</span>
            </div>
          </div>
        </section>

        {/* Results */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>The Results</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[
              "Audit score: 30 → 91 (+203% improvement)",
              "5 SEO-optimized articles published, each linking to 8-12 real products",
              "llms.txt deployed — site now discoverable by ChatGPT and Perplexity",
              "Pillar-cluster structure built for ongoing content scaling",
              "Total time: under 14 days. Total spend: $5 plan.",
            ].map((r) => (
              <li key={r} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.6 }}>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", borderRadius: 20, padding: 40, textAlign: "center", color: "#fff" }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Run a free audit on your site</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 24px" }}>
            See your SEO score in 60 seconds. No credit card required.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block", padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: "#fff", color: "#4F6EF7", textDecoration: "none",
            }}
          >
            Get Your Free Audit →
          </Link>
        </div>
      </div>
    </div>
  );
}
