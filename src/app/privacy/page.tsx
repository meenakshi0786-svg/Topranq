"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav style={{ padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/"><Logo size={36} /></Link>
          <Link href="/" style={{ fontSize: 14, fontWeight: 600, padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", textDecoration: "none" }}>Free Audit</Link>
        </div>
      </nav>

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 80px" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link> › <span>Privacy Policy</span>
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>Last updated: May 4, 2026</p>

        <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)" }}>
          <p>
            This Privacy Policy explains how Ranqapex (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects information about you when you use ranqapex.com.
            By using our service, you agree to the practices described below.
          </p>

          <h2 style={h2}>1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul>
            <li><strong>Account information:</strong> Your email address and name when you sign in with Google.</li>
            <li><strong>Domain & site data:</strong> URLs you submit, crawled page content, audit results, products you import via CSV.</li>
            <li><strong>Generated content:</strong> Articles, llms.txt files, keywords, and pillars produced by our AI agents on your behalf.</li>
            <li><strong>Payment data:</strong> Razorpay processes payments. We store only the payment ID, plan, and date — never card details.</li>
            <li><strong>Usage data:</strong> Pages visited, features used, errors encountered. Standard server logs.</li>
            <li><strong>Google Search Console data:</strong> If you connect GSC, we read query and page-level performance data only.</li>
          </ul>

          <h2 style={h2}>2. How We Use Your Information</h2>
          <ul>
            <li>To provide, maintain, and improve the Ranqapex service.</li>
            <li>To run AI audits, generate articles, and produce SEO outputs you request.</li>
            <li>To send transactional emails (payment confirmations, audit results).</li>
            <li>To detect abuse, fraud, or security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>

          <h2 style={h2}>3. Third-Party Services</h2>
          <p>Ranqapex uses the following processors to deliver the service:</p>
          <ul>
            <li><strong>Google OAuth & Google Search Console</strong> — authentication and search data.</li>
            <li><strong>OpenRouter (Anthropic Sonnet/Opus, Google Gemini)</strong> — AI generation. Your data is sent to these models for processing.</li>
            <li><strong>Serper.dev</strong> — fetches Google SERP data for keyword research.</li>
            <li><strong>Razorpay</strong> — payment processing.</li>
            <li><strong>Hostinger VPS</strong> — server hosting.</li>
          </ul>
          <p>We do not sell your data to advertisers or any third party.</p>

          <h2 style={h2}>4. Data Retention</h2>
          <p>
            We retain your account, domain, and generated content data for as long as your account is active or as needed to provide the service.
            You can request deletion at any time by emailing <a href="mailto:ranqapexcontact@gmail.com" style={link}>ranqapexcontact@gmail.com</a>.
          </p>

          <h2 style={h2}>5. Your Rights (GDPR & CCPA)</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction or deletion of your data.</li>
            <li>Withdraw consent for data processing.</li>
            <li>Export your data in a portable format.</li>
            <li>Lodge a complaint with a supervisory authority.</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:ranqapexcontact@gmail.com" style={link}>ranqapexcontact@gmail.com</a>.</p>

          <h2 style={h2}>6. Cookies</h2>
          <p>
            We use minimal cookies for authentication (<code>user_id</code>, <code>logged_in</code>) and session management.
            We do not use third-party advertising or analytics trackers.
          </p>

          <h2 style={h2}>7. Security</h2>
          <p>
            We use HTTPS, encrypted authentication tokens, and least-privilege database access.
            No method of internet transmission is 100% secure, but we apply industry-standard safeguards.
          </p>

          <h2 style={h2}>8. Children&apos;s Privacy</h2>
          <p>Ranqapex is not directed at children under 16. We do not knowingly collect data from children.</p>

          <h2 style={h2}>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy. The &ldquo;Last updated&rdquo; date at the top reflects the current version.
            Material changes will be communicated via email to active users.
          </p>

          <h2 style={h2}>10. Contact</h2>
          <p>
            For privacy questions or data requests, email <a href="mailto:ranqapexcontact@gmail.com" style={link}>ranqapexcontact@gmail.com</a>.
          </p>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 32, marginBottom: 12 };
const link: React.CSSProperties = { color: "var(--accent)", textDecoration: "none" };
