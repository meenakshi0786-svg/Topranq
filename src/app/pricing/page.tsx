"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLANS = [
  {
    name: "$1 Plan",
    planKey: "dollar1" as const,
    price: "$1",
    period: "",
    periodLabel: "one-time",
    model: "Sonnet",
    pages: 25,
    articles: 10,
    validity: "30 days",
    features: [
      "10 Articles",
      "Valid for 30 days from purchase",
      "Full site audit (25 pages)",
      "Magic Keyword Planner",
      "AI model: Sonnet",
      "Pillar-cluster content strategy",
      "Auto internal linking suggestions",
      "Product CSV integration",
      "GEO toolkit (llms.txt)",
    ],
    cta: "Buy Now",
    highlighted: false,
  },
  {
    name: "$5 Plan",
    planKey: "dollar5" as const,
    price: "$5",
    period: "",
    periodLabel: "one-time",
    model: "Opus",
    pages: 50,
    articles: 15,
    validity: "30 days",
    features: [
      "15 Articles",
      "Valid for 30 days from purchase",
      "Everything in $1 Plan",
      "Full site audit (50 pages)",
      "AI model: Opus (premium quality)",
      "Deeper competitor analysis",
      "Advanced editorial formatting",
      "Hero image generation",
      "Google Search Console integration",
    ],
    cta: "Buy Now",
    highlighted: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showTelegram, setShowTelegram] = useState<string | null>(null); // plan name for telegram popup

  // Load Razorpay script
  function loadRazorpayScript(): Promise<void> {
    if (scriptLoaded || typeof window !== "undefined" && window.Razorpay) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => { setScriptLoaded(true); resolve(); };
      document.body.appendChild(script);
    });
  }

  async function handlePayment(planKey: "dollar1" | "dollar5") {
    setLoading(planKey);

    try {
      // Load Razorpay script
      await loadRazorpayScript();

      // Create order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create order");
        return;
      }

      const order = await res.json();

      // Open Razorpay checkout
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Ranqapex",
        description: planKey === "dollar1" ? "$1 Plan — Sonnet" : "$5 Plan — Opus",
        order_id: order.orderId,
        prefill: {
          name: order.userName,
          email: order.userEmail,
        },
        theme: {
          color: "#4F6EF7",
        },
        handler: async function (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
          // Verify payment
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
            }),
          });

          const result = await verifyRes.json();
          if (result.success) {
            setShowTelegram(planKey === "dollar1" ? "$1" : "$5");
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--bg-white)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Logo size={26} /></Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="text-sm font-medium">Pricing</span>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 py-16">
        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: "linear-gradient(135deg, #4F6EF715, #7C5CFC15)", color: "var(--accent)", border: "1px solid #4F6EF730" }}>
            Limited Offer
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Introductory pricing for the next 3 months
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            So that we can iterate our product on your feedback
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="card-static p-7 flex flex-col fade-in"
              style={{
                border: plan.highlighted ? "2px solid var(--accent)" : undefined,
                position: "relative",
              }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: "var(--accent)" }}>
                  Best Value
                </div>
              )}

              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{plan.name}</h2>
              <div className="mb-1">
                <span className="text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{plan.price}</span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}> {plan.periodLabel}</span>
              </div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#dbeafe", color: "#1e40af" }}>
                  Valid for {plan.validity}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  AI: <span style={{ fontWeight: 600, color: plan.model === "Opus" ? "#7C5CFC" : "#4F6EF7" }}>{plan.model}</span>
                </span>
              </div>

              {/* Stats row */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1 p-3 rounded-lg text-center" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                  <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{plan.pages}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Pages</p>
                </div>
                <div className="flex-1 p-3 rounded-lg text-center" style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}>
                  <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{plan.articles}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Articles</p>
                </div>
              </div>

              <div className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" className="shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePayment(plan.planKey)}
                disabled={loading === plan.planKey}
                className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{
                  background: plan.highlighted ? "var(--accent)" : "transparent",
                  color: plan.highlighted ? "white" : "var(--accent)",
                  border: plan.highlighted ? "none" : "2px solid var(--accent)",
                }}
              >
                {loading === plan.planKey ? "Processing..." : plan.cta}
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Telegram Group Invitation Popup */}
      {showTelegram && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <div style={{ width: "100%", maxWidth: 440, margin: 16, borderRadius: 20, background: "#fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "32px 24px 20px", textAlign: "center", background: "linear-gradient(135deg, #0088cc, #0055aa)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "rgba(255,255,255,0.15)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Payment Successful!</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0 }}>You&apos;re now on the {showTelegram} Plan</p>
            </div>

            {/* Body */}
            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px", textAlign: "center" }}>
                Join our exclusive community
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", textAlign: "center" }}>
                Get direct support, feature updates, and connect with other Ranqapex users.
              </p>

              <a
                href={`https://t.me/+zoz0403pg_45NTFl`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  width: "100%", padding: "14px", borderRadius: 12,
                  background: "#0088cc", color: "#fff",
                  fontSize: 15, fontWeight: 600, textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                Join Ranqapex on Telegram
              </a>

              <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "12px 0 0" }}>
                Pre-typed message: &ldquo;Joined on {showTelegram} Plan&rdquo;
              </p>

              <button
                onClick={() => { setShowTelegram(null); router.push("/dashboard"); }}
                style={{
                  display: "block", width: "100%", padding: "12px",
                  marginTop: 12, borderRadius: 12,
                  background: "transparent", border: "none",
                  color: "#9ca3af", fontSize: 13, fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Skip for now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
