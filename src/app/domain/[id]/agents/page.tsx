"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

// ── Types ────────────────────────────────────────────────────────────

interface CreditInfo {
  plan: string;
  credits: { total: number; used: number; remaining: number };
}

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  label: string;
}

// ── Agent definitions ────────────────────────────────────────────────

const AGENTS = [
  {
    type: "blog_writer",
    name: "Blog Writer",
    description: "Generate SEO-optimized blog posts with smart keyword targeting, contextual internal links, and structured FAQ schema markup for higher rankings.",
    credits: 3,
    color: "#4F6EF7",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    slug: "blog-writer",
    buttonLabel: "Deploy",
  },
  {
    type: "internal_linker",
    name: "Internal Linker",
    description: "Analyze your pages to find linking gaps, orphan pages, and suggest anchor text for better link equity flow.",
    credits: 7,
    color: "#7C5CFC",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    slug: "internal-linker",
    buttonLabel: "Deploy",
  },
  {
    type: "product_infuser",
    name: "Product Infuser",
    description: "Connect your store and auto-infuse product mentions into your content. Upload a CSV of your products to get started.",
    credits: 2,
    color: "#E5890A",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    badge: "E-Commerce",
    slug: "product-infuser",
    buttonLabel: "Connect Your Store",
  },
];

// ── Component ────────────────────────────────────────────────────────

export default function AgentsPage() {
  const params = useParams();
  const domainId = params.id as string;

  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [creditsRes, packsRes] = await Promise.all([
      fetch("/api/credits"),
      fetch("/api/credits/purchase"),
    ]);
    if (creditsRes.ok) setCredits(await creditsRes.json());
    if (packsRes.ok) {
      const data = await packsRes.json();
      setPacks(data.packs || []);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function buyCredits(packId: string) {
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (res.ok) {
        await fetchData();
        setShowBuyCredits(false);
      }
    } finally {
      setBuyingPack(null);
    }
  }

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
            <span className="text-sm font-medium">Agents</span>
          </div>
          <div className="flex items-center gap-3">
            {credits && (
              <button
                onClick={() => setShowBuyCredits(!showBuyCredits)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /></svg>
                {Math.floor(credits.credits.remaining)} credits
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Strategy AI Agents</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Deploy specialized agents to automate content creation, linking, and product placement.
            </p>
          </div>
        </div>

        {/* Buy Credits Panel */}
        {showBuyCredits && (
          <div className="card-static p-6 mb-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Buy Credits
              </h2>
              <button
                onClick={() => setShowBuyCredits(false)}
                className="text-xs cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => buyCredits(pack.id)}
                  disabled={buyingPack === pack.id}
                  className="p-4 rounded-xl text-center cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-white)",
                  }}
                >
                  <p className="text-2xl font-bold mb-1" style={{ color: "var(--accent)" }}>
                    {pack.credits}
                  </p>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    credits
                  </p>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    ${pack.price}
                  </p>
                  {buyingPack === pack.id && (
                    <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>Adding...</p>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              Credits are added to your account instantly. No payment integration yet — credits are simulated for demo.
            </p>
          </div>
        )}

        {/* Agent Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "32px" }}>
          {AGENTS.map((agent) => (
            <div key={agent.type} className="card-static overflow-hidden" style={{ display: "flex", flexDirection: "column" }}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: agent.color + "15" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={agent.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={agent.icon} />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    {"badge" in agent && agent.badge && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "#7C5CFC15", color: "#7C5CFC" }}>
                        {agent.badge}
                      </span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: agent.color + "12", color: agent.color }}>
                      {agent.credits} credits
                    </span>
                  </div>
                </div>
                <h3 className="font-bold text-sm mb-1.5">{agent.name}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {agent.description}
                </p>
              </div>

              {/* Deploy Button — pushed to bottom */}
              <div className="px-6 pb-5" style={{ marginTop: "auto" }}>
                <Link
                  href={`/domain/${domainId}/agents/${agent.slug}`}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all block text-center"
                  style={{
                    background: "var(--bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {agent.buttonLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
