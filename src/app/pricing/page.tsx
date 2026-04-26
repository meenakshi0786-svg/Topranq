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
      "10 articles (one-time credit pack)",
      "Valid for 30 days from purchase",
      "Full site audit (25 pages)",
      "Magic Keyword Planner",
      "AI model: Sonnet",
      "Pillar-cluster content strategy",
      "Auto internal linking suggestions",
      "Product CSV integration",
      "GEO toolkit (llms.txt, entity map)",
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
      "15 articles (one-time credit pack)",
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
            alert(`Payment successful! You're now on the ${planKey === "dollar1" ? "$1" : "$5"} Plan.`);
            router.push("/dashboard");
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
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Articles/mo</p>
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

        {/* Bottom details */}
        <div className="card-static p-6 fade-in">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#dcfce7" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>One-time purchase, no subscription</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pay once, use your credits within 30 days. No auto-renewal, no recurring charges. Need more? Purchase another pack anytime.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#fef9c3" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#854d0e" strokeWidth="2.5"><path d="M12 9v4M12 17h.01" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Limited to 20 users at a time</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>We onboard only 20 users per batch to ensure quality support and fast iteration.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#dbeafe" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Separate charges for article regeneration</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Your credit pack covers new articles. Regenerating or rewriting an existing article will incur additional charges.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
