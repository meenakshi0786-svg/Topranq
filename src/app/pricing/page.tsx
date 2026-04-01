"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    credits: 5,
    pages: 25,
    articles: 3,
    domains: 1,
    connectors: "None (copy only)",
    features: ["Full audit pipeline", "5 AI credits/mo", "25-page crawl cap", "3 articles/mo", "Export HTML report"],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    credits: 25,
    pages: 100,
    articles: 10,
    domains: 1,
    connectors: "WordPress",
    features: ["Everything in Free", "25 AI credits/mo", "100-page crawl", "10 articles/mo", "WordPress connector", "Search Console integration"],
    cta: "Upgrade",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$99",
    period: "/mo",
    credits: 75,
    pages: 500,
    articles: 30,
    domains: 3,
    connectors: "Up to 3",
    features: ["Everything in Starter", "75 AI credits/mo", "500-page crawl", "30 articles/mo", "3 domains", "All connectors", "Priority support"],
    cta: "Upgrade",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "$299",
    period: "/mo",
    credits: 250,
    pages: 2000,
    articles: 100,
    domains: 10,
    connectors: "All + Webhook",
    features: ["Everything in Growth", "250 AI credits/mo", "2,000-page crawl", "100 articles/mo", "10 domains", "Webhook connector", "White-label reports", "Dedicated support"],
    cta: "Upgrade",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Pricing</span>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Simple, transparent pricing</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Start free. Upgrade when you need more power. Top-ups available: $10 for 15 credits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="card-static p-6 flex flex-col fade-in"
              style={{
                border: plan.highlighted ? "2px solid var(--accent)" : undefined,
                position: "relative",
              }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "var(--accent)" }}>
                  Most Popular
                </div>
              )}
              <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
              <div className="mb-4">
                <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" className="shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  background: plan.highlighted ? "var(--accent)" : "transparent",
                  color: plan.highlighted ? "white" : "var(--text-secondary)",
                  border: plan.highlighted ? "none" : "1px solid var(--border)",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="card-static mt-10 overflow-hidden fade-in">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-1">Plan Comparison</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Detailed feature breakdown</p>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border-light)" }}>
                <th className="text-left text-xs font-bold uppercase tracking-wider px-6 py-3" style={{ color: "var(--text-muted)" }}>Feature</th>
                {PLANS.map((p) => (
                  <th key={p.name} className="text-center text-xs font-bold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompRow label="Credits/mo" values={PLANS.map((p) => String(p.credits))} />
              <CompRow label="Pages crawled" values={PLANS.map((p) => p.pages.toLocaleString())} />
              <CompRow label="Articles/mo" values={PLANS.map((p) => String(p.articles))} />
              <CompRow label="Domains" values={PLANS.map((p) => String(p.domains))} />
              <CompRow label="Connectors" values={PLANS.map((p) => p.connectors)} />
              <CompRow label="Search Console" values={["—", "Yes", "Yes", "Yes"]} />
              <CompRow label="Ahrefs" values={["—", "—", "Yes", "Yes"]} />
              <CompRow label="Priority support" values={["—", "—", "Yes", "Yes"]} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
      <td className="text-sm px-6 py-3" style={{ color: "var(--text-secondary)" }}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className="text-sm text-center px-4 py-3 font-medium tabular-nums">
          {v === "Yes" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" className="mx-auto"><polyline points="20 6 9 17 4 12" /></svg>
          ) : v === "—" ? (
            <span style={{ color: "var(--text-muted)" }}>—</span>
          ) : v}
        </td>
      ))}
    </tr>
  );
}
