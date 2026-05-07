"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { usePageTitle } from "@/components/page-title";

type Cell = boolean | string;

const features: Array<{
  category: string;
  feature: string;
  ranqapex: Cell;
  peec: Cell;
  vizby: Cell;
}> = [
  // Core focus
  { category: "Core Focus", feature: "AI content generation (articles)", ranqapex: true, peec: false, vizby: true },
  { category: "Core Focus", feature: "AI visibility tracking (brand mentions)", ranqapex: false, peec: true, vizby: true },
  { category: "Core Focus", feature: "Site audit / technical SEO", ranqapex: true, peec: false, vizby: false },

  // GEO assets
  { category: "GEO Assets", feature: "llms.txt generator", ranqapex: true, peec: false, vizby: true },
  { category: "GEO Assets", feature: "Frequent llms.txt updates", ranqapex: "1 / domain", peec: false, vizby: "30 / month" },
  { category: "GEO Assets", feature: "AI citation snippets", ranqapex: true, peec: false, vizby: false },
  { category: "GEO Assets", feature: "Entity map (JSON-LD)", ranqapex: true, peec: false, vizby: false },

  // Visibility tracking
  { category: "Visibility Tracking", feature: "Brand mention tracking in ChatGPT/Gemini/Perplexity", ranqapex: false, peec: true, vizby: true },
  { category: "Visibility Tracking", feature: "Competitor benchmarking", ranqapex: false, peec: true, vizby: false },
  { category: "Visibility Tracking", feature: "Sentiment analysis", ranqapex: false, peec: true, vizby: false },
  { category: "Visibility Tracking", feature: "Multi-country tracking", ranqapex: false, peec: true, vizby: false },
  { category: "Visibility Tracking", feature: "Source detection (G2, Reddit, etc.)", ranqapex: false, peec: true, vizby: false },

  // Content
  { category: "Content", feature: "Article generation volume", ranqapex: "10–15 / plan", peec: false, vizby: "500 / month" },
  { category: "Content", feature: "Pillar-cluster strategy", ranqapex: true, peec: false, vizby: false },
  { category: "Content", feature: "Magic keyword planner", ranqapex: true, peec: false, vizby: false },
  { category: "Content", feature: "Multi-language support", ranqapex: true, peec: true, vizby: true },

  // Audit
  { category: "Site Audit", feature: "Technical SEO audit", ranqapex: true, peec: false, vizby: false },
  { category: "Site Audit", feature: "Per-page issue scoring", ranqapex: true, peec: false, vizby: false },
  { category: "Site Audit", feature: "GSC integration", ranqapex: true, peec: false, vizby: false },

  // Platforms
  { category: "Platforms", feature: "Shopify integration", ranqapex: true, peec: "Brand-agnostic", vizby: "Shopify-only" },
  { category: "Platforms", feature: "WordPress integration", ranqapex: true, peec: "Brand-agnostic", vizby: false },
  { category: "Platforms", feature: "Product CSV import", ranqapex: true, peec: false, vizby: "Shopify catalog (up to 10K)" },
  { category: "Platforms", feature: "API access", ranqapex: false, peec: true, vizby: true },
  { category: "Platforms", feature: "Looker Studio export", ranqapex: false, peec: true, vizby: false },

  // Pricing
  { category: "Pricing", feature: "Free tier", ranqapex: true, peec: false, vizby: false },
  { category: "Pricing", feature: "Plans under $10", ranqapex: true, peec: false, vizby: false },
  { category: "Pricing", feature: "Lowest paid tier", ranqapex: "$1 one-time", peec: "Not public (~$99+/mo)", vizby: "$499/mo" },
];

const products = [
  { key: "ranqapex" as const, name: "Ranqapex", tag: "SEO + GEO autopilot", color: "#4F6EF7" },
  { key: "peec" as const, name: "Peec AI", tag: "AI visibility tracker", color: "#7c3aed" },
  { key: "vizby" as const, name: "Vizby", tag: "Shopify GEO tool", color: "#ec4899" },
];

export default function CompareGeoPage() {
  usePageTitle("Ranqapex vs Peec AI vs Vizby — GEO Tools Compared");
  const categories = [...new Set(features.map((f) => f.category))];

  function rank(p: keyof typeof products[number] | "ranqapex" | "peec" | "vizby") {
    return features.filter((f) => {
      const v = f[p as "ranqapex" | "peec" | "vizby"];
      return v === true || (typeof v === "string" && v.length > 0);
    }).length;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/"><Logo size={36} /></Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/compare" style={navLink}>All Comparisons</Link>
            <Link href="/blog" style={navLink}>Blog</Link>
            <Link href="/pricing" style={navLink}>Pricing</Link>
            <Link href="/" style={{ ...navLink, fontWeight: 600, padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff" }}>Free Audit</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 20, background: "var(--accent-light)", color: "var(--accent)", marginBottom: 16 }}>
            GEO Tool Comparison
          </span>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 12px", lineHeight: 1.15 }}>
            Ranqapex vs Peec AI vs Vizby
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: "0 auto", maxWidth: 720, lineHeight: 1.6 }}>
            All three help your brand show up in AI search engines (ChatGPT, Perplexity, Gemini, Google AI Overviews) — but they solve different parts of the problem.
          </p>
        </div>

        {/* Quick verdict cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
          <VerdictCard
            color="#4F6EF7"
            title="Ranqapex"
            subtitle="Builds & publishes"
            score={rank("ranqapex")}
            total={features.length}
            blurb="Audits your site, plans content, generates articles, ships llms.txt. Best for solo founders & SMB e-commerce."
            cta={{ label: "Try Ranqapex Free", href: "/" }}
            highlight
          />
          <VerdictCard
            color="#7c3aed"
            title="Peec AI"
            subtitle="Measures visibility"
            score={rank("peec")}
            total={features.length}
            blurb="Tracks how AI engines mention your brand. Best for marketing teams who already have content and need analytics."
          />
          <VerdictCard
            color="#ec4899"
            title="Vizby"
            subtitle="Shopify content scale"
            score={rank("vizby")}
            total={features.length}
            blurb="High-volume llms.txt + blog generation for Shopify stores. Best for mid-to-large stores doing 100+ articles/month."
          />
        </div>

        {/* Comparison table */}
        <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ ...th, minWidth: 280 }}>Feature</th>
                  {products.map((p) => (
                    <th key={p.key} style={{ ...th, textAlign: "center", color: p.color }}>
                      {p.name}
                      <span style={{ display: "block", fontSize: 10, fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--text-muted)", marginTop: 2 }}>
                        {p.tag}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <Fragment key={cat}>
                    <tr style={{ background: "var(--bg)" }}>
                      <td colSpan={4} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                        {cat}
                      </td>
                    </tr>
                    {features.filter((f) => f.category === cat).map((f) => (
                      <tr key={f.feature} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{f.feature}</td>
                        <td style={tdCell}><CellRender v={f.ranqapex} accentColor="#4F6EF7" /></td>
                        <td style={tdCell}><CellRender v={f.peec} accentColor="#7c3aed" /></td>
                        <td style={tdCell}><CellRender v={f.vizby} accentColor="#ec4899" /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Decision callout */}
        <div style={{ background: "#f0f5ff", border: "1px solid #c7d7fe", borderRadius: 16, padding: "24px 28px", marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>Which one should you use?</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.85, color: "var(--text-secondary)" }}>
            <li><strong style={{ color: "#4F6EF7" }}>Choose Ranqapex</strong> if you&apos;re a solo founder, blogger, or SMB store and need to <em>audit + create</em> content cheaply ($1–$5).</li>
            <li><strong style={{ color: "#7c3aed" }}>Choose Peec AI</strong> if you&apos;re a marketing team at an established brand and need to <em>measure</em> AI visibility across geos and competitors.</li>
            <li><strong style={{ color: "#ec4899" }}>Choose Vizby</strong> if you run a Shopify store with thousands of products and need <em>high-volume</em> llms.txt + blog automation ($499/mo+).</li>
          </ul>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "16px 0 0", fontStyle: "italic" }}>
            They&apos;re complementary, not competitors. A complete GEO stack uses Ranqapex (build) + Peec (measure). Vizby covers both for Shopify-only at enterprise scale.
          </p>
        </div>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", borderRadius: 20, padding: 36, textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Start with a free Ranqapex audit</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", margin: "0 0 20px" }}>
            No credit card. See your site&apos;s SEO + AI readiness score in 60 seconds.
          </p>
          <Link href="/" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "#fff", color: "#4F6EF7", textDecoration: "none" }}>
            Run Free Audit →
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function VerdictCard({ title, subtitle, score, total, blurb, color, highlight, cta }: {
  title: string;
  subtitle: string;
  score: number;
  total: number;
  blurb: string;
  color: string;
  highlight?: boolean;
  cta?: { label: string; href: string };
}) {
  return (
    <div style={{
      padding: 22,
      borderRadius: 16,
      background: "#fff",
      border: highlight ? `2px solid ${color}` : "1px solid var(--border-light)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      {highlight && (
        <span style={{
          position: "absolute", top: -10, left: 16,
          fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
          background: color, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          Our pick for SMBs
        </span>
      )}
      <p style={{ fontSize: 18, fontWeight: 800, color, margin: "0 0 2px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 12px" }}>{subtitle}</p>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{score}</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 4 }}>/ {total} features</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0, flex: 1 }}>{blurb}</p>
      {cta && (
        <Link href={cta.href} style={{ display: "block", marginTop: 16, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", background: color, textAlign: "center", textDecoration: "none" }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function CellRender({ v, accentColor }: { v: Cell; accentColor: string }) {
  if (v === true) {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ display: "inline" }}><polyline points="20 6 9 17 4 12" /></svg>;
  }
  if (v === false) {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ display: "inline", opacity: 0.3 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
  }
  // String value — show as colored chip
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${accentColor}15`, color: accentColor, whiteSpace: "nowrap" }}>
      {v}
    </span>
  );
}

const navLink: React.CSSProperties = { fontSize: 14, padding: "8px 16px", color: "var(--text-secondary)", textDecoration: "none" };
const th: React.CSSProperties = { textAlign: "left", padding: "14px 16px", fontWeight: 700, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" };
const tdCell: React.CSSProperties = { padding: "12px 16px", textAlign: "center" };
