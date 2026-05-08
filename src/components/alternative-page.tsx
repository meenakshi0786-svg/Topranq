"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export interface AlternativeData {
  competitor: {
    name: string;
    pricing: string;
    tagline: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  whyTheySwitch: string[];
  featureCompare: Array<{
    feature: string;
    ranqapex: string;
    competitor: string;
    winner: "ranqapex" | "competitor" | "tie";
  }>;
  intro: string;
  bottomLine: string;
}

export function AlternativePage({ data }: { data: AlternativeData }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav style={{ padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/"><Logo size={36} /></Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/blog" style={navLink}>Blog</Link>
            <Link href="/pricing" style={navLink}>Pricing</Link>
            <Link href="/compare" style={navLink}>All Compare</Link>
            <Link href="/" style={{ ...navLink, fontWeight: 600, padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff" }}>
              Free Audit
            </Link>
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 64px" }}>
        {/* Breadcrumb */}
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link>
          {" › "}
          <Link href="/compare" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Compare</Link>
          {" › "}
          <span>{data.competitor.name} alternative</span>
        </p>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 20, background: "var(--accent-light)", color: "var(--accent)", marginBottom: 16 }}>
            {data.competitor.name} Alternative
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 16px", lineHeight: 1.15 }}>
            {data.hero.title}
          </h1>
          <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 24px" }}>
            {data.hero.subtitle}
          </p>
          <Link href="/" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", color: "#fff", textDecoration: "none" }}>
            Try Ranqapex Free →
          </Link>
        </div>

        {/* Side-by-side pricing tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
          <div style={{ padding: 24, borderRadius: 14, background: "#fff", border: "2px solid var(--accent)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", marginBottom: 8 }}>Ranqapex</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>$1<span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}> one-time</span></p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>SEO + GEO autopilot</p>
          </div>
          <div style={{ padding: 24, borderRadius: 14, background: "#fff", border: "1px solid var(--border-light)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>{data.competitor.name}</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em", opacity: 0.7 }}>{data.competitor.pricing}</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{data.competitor.tagline}</p>
          </div>
        </div>

        {/* Intro paragraph */}
        <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--text-secondary)", marginBottom: 32 }}>
          {data.intro}
        </p>

        {/* Why people switch */}
        <h2 style={h2}>Why people switch from {data.competitor.name} to Ranqapex</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px" }}>
          {data.whyTheySwitch.map((reason, i) => (
            <li key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.6 }}>{reason}</span>
            </li>
          ))}
        </ul>

        {/* Feature comparison table */}
        <h2 style={h2}>Ranqapex vs {data.competitor.name} — feature by feature</h2>
        <div style={{ background: "#fff", border: "1px solid var(--border-light)", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                <th style={th}>Feature</th>
                <th style={{ ...th, textAlign: "center" }}>Ranqapex</th>
                <th style={{ ...th, textAlign: "center" }}>{data.competitor.name}</th>
              </tr>
            </thead>
            <tbody>
              {data.featureCompare.map((f) => (
                <tr key={f.feature} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={td}>{f.feature}</td>
                  <td style={{ ...td, textAlign: "center", fontWeight: f.winner === "ranqapex" ? 700 : 500, color: f.winner === "ranqapex" ? "#4F6EF7" : "var(--text-primary)" }}>
                    {f.ranqapex}
                  </td>
                  <td style={{ ...td, textAlign: "center", fontWeight: f.winner === "competitor" ? 700 : 500, color: f.winner === "competitor" ? "#7c3aed" : "var(--text-primary)" }}>
                    {f.competitor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom line */}
        <h2 style={h2}>The bottom line</h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, color: "var(--text-secondary)", marginBottom: 32 }}>
          {data.bottomLine}
        </p>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", borderRadius: 16, padding: "32px 28px", textAlign: "center", color: "#fff" }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>Try Ranqapex for $1</h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>
            Free audit first — no credit card. See your SEO + AI readiness score in 60 seconds.
          </p>
          <Link href="/" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "#fff", color: "var(--accent)", textDecoration: "none" }}>
            Start Free Audit
          </Link>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

const navLink: React.CSSProperties = { fontSize: 14, padding: "8px 16px", color: "var(--text-secondary)", textDecoration: "none" };
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: "32px 0 16px", letterSpacing: "-0.01em" };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontWeight: 700, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "12px 16px", color: "var(--text-primary)" };
