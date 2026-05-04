"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export default function RefundPolicyPage() {
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
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link> › <span>Refund Policy</span>
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Refund Policy</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>Last updated: May 4, 2026</p>

        <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)" }}>
          <p>
            We want you to be confident in trying Ranqapex. This policy explains when refunds are available.
          </p>

          <h2 style={h2}>Eligibility</h2>
          <p>You are eligible for a full refund if <strong>all</strong> of the following apply:</p>
          <ul>
            <li>You request the refund within <strong>7 days</strong> of purchase.</li>
            <li>You have generated <strong>fewer than 2 articles</strong> on the plan you purchased.</li>
            <li>The reason is genuine technical failure of our service or a quality issue we cannot resolve.</li>
          </ul>

          <h2 style={h2}>How to request a refund</h2>
          <ol>
            <li>Email <a href="mailto:ranqapexcontact@gmail.com" style={link}>ranqapexcontact@gmail.com</a> from the address tied to your Ranqapex account.</li>
            <li>Include your Razorpay payment ID (visible in the confirmation email).</li>
            <li>Briefly describe the reason for the refund.</li>
          </ol>
          <p>We&apos;ll respond within 2 business days. Approved refunds are processed via Razorpay and typically arrive in 5–10 business days.</p>

          <h2 style={h2}>What is NOT eligible</h2>
          <ul>
            <li>Refund requests after 7 days.</li>
            <li>Plans where 2 or more articles have already been generated (AI compute is non-recoverable).</li>
            <li>Refunds for not achieving specific SEO ranking outcomes — we cannot guarantee Google rankings.</li>
            <li>Plans purchased fraudulently or in violation of our <Link href="/terms" style={link}>Terms of Service</Link>.</li>
          </ul>

          <h2 style={h2}>Cancellations</h2>
          <p>
            Ranqapex plans are one-time purchases — there is no recurring subscription to cancel.
            Once the 30-day window expires, the plan ends automatically.
          </p>

          <h2 style={h2}>Questions?</h2>
          <p>
            For any refund or billing question, contact <a href="mailto:ranqapexcontact@gmail.com" style={link}>ranqapexcontact@gmail.com</a>.
          </p>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 32, marginBottom: 12 };
const link: React.CSSProperties = { color: "var(--accent)", textDecoration: "none" };
