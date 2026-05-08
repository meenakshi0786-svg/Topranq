"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)", marginTop: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 32px" }}>
        {/* Top: 4 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
          {/* Brand column */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <Logo size={28} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 280 }}>
              AI agents that audit, strategize, write, and publish SEO content — and get cited by ChatGPT, Perplexity, and Google AI Overviews.
            </p>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>Product</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><Link href="/" style={linkStyle}>Home</Link></li>
              <li><Link href="/pricing" style={linkStyle}>Pricing</Link></li>
              <li><Link href="/compare" style={linkStyle}>Compare</Link></li>
              <li><Link href="/case-studies/kataparis" style={linkStyle}>Case Study</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>Resources</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><Link href="/blog" style={linkStyle}>Blog</Link></li>
              <li><Link href="/sample-article" style={linkStyle}>Sample Article</Link></li>
              <li><Link href="/alternatives/surferseo" style={linkStyle}>vs SurferSEO</Link></li>
              <li><Link href="/alternatives/jasper" style={linkStyle}>vs Jasper</Link></li>
              <li><Link href="/alternatives/frase" style={linkStyle}>vs Frase</Link></li>
              <li><a href="https://t.me/+zoz0403pg_45NTFl" target="_blank" rel="noopener noreferrer" style={linkStyle}>Telegram</a></li>
              <li><a href="mailto:ranqapexcontact@gmail.com" style={linkStyle}>Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>Legal</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><Link href="/privacy" style={linkStyle}>Privacy Policy</Link></li>
              <li><Link href="/terms" style={linkStyle}>Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ paddingTop: 24, borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            © {new Date().getFullYear()} Ranqapex. All rights reserved.
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            Made with care for SEO teams worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-secondary)",
  textDecoration: "none",
};
