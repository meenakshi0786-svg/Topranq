"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [domainId, setDomainId] = useState("");
  const [domainUrl, setDomainUrl] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add domain");
      }

      const data = await res.json();
      setDomainId(data.domainId);
      setDomainUrl(url.trim());
      setShowSignIn(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function connectGSC() {
    window.location.href = `/api/gsc/auth?domainId=${domainId}`;
  }

  function signInWithGoogle() {
    window.location.href = `/api/auth/google?domainId=${domainId}`;
  }

  function skipSignIn() {
    router.push(`/domain/${domainId}`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-[1200px] mx-auto w-full">
        <Logo size={28} />
        <div className="flex items-center gap-2">
          <a href="#features" className="text-sm font-medium px-4 py-2 rounded-lg hidden md:inline-block" style={{ color: "var(--text-secondary)" }}>
            Features
          </a>
          <a href="#geo" className="text-sm font-medium px-4 py-2 rounded-lg hidden md:inline-block" style={{ color: "var(--text-secondary)" }}>
            GEO
          </a>
          <a href="#how-it-works" className="text-sm font-medium px-4 py-2 rounded-lg hidden md:inline-block" style={{ color: "var(--text-secondary)" }}>
            How it works
          </a>
          <a href="/pricing" className="text-sm font-medium px-4 py-2 rounded-lg hidden md:inline-block" style={{ color: "var(--text-secondary)" }}>
            Pricing
          </a>
          <a
            href="/dashboard"
            className="text-sm font-medium px-5 py-2 rounded-lg"
            style={{ color: "var(--accent)", background: "var(--accent-light)" }}
          >
            Dashboard
          </a>
        </div>
      </nav>

      {/* Hero — two-column with mockup */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse, #4F6EF7, transparent 70%)", filter: "blur(80px)" }} />

        <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy + form */}
            <div className="fade-in">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "var(--accent)" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--accent)" }} />
                </span>
                Now with AI blog writer + Shopify publishing
              </div>

              <h1
                className="text-4xl md:text-[52px] font-bold mb-5 leading-[1.08] tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Audit, fix, and publish<br />
                <span style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>SEO content</span> — on autopilot
              </h1>
              <p className="text-base md:text-lg mb-8 max-w-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Enter your URL, sign in with Google, and we&rsquo;ll crawl your site, find content gaps, and draft blog articles ready to publish to Shopify.
              </p>

              <form onSubmit={addDomain} className="relative max-w-xl">
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{
                    background: "var(--bg-white)",
                    boxShadow: "var(--shadow-lg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="pl-4 pr-2" style={{ color: "var(--text-muted)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="yourstore.com"
                    className="flex-1 px-3 py-4 text-sm outline-none bg-transparent"
                    style={{ color: "var(--text-primary)" }}
                    disabled={loading}
                  />
                  <div className="pr-2">
                    <button
                      type="submit"
                      disabled={loading || !url.trim()}
                      className="btn-primary px-6 py-2.5 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? "Analyzing..." : "Free Audit →"}
                    </button>
                  </div>
                </div>
              </form>

              {error && (
                <p
                  className="text-sm mt-4 inline-block px-4 py-2 rounded-lg"
                  style={{ background: "var(--critical-bg)", color: "var(--critical)" }}
                >
                  {error}
                </p>
              )}

              {/* Trust microtext */}
              <div className="flex items-center gap-5 mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  No credit card
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  47 checks, 8 categories
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Results in 60s
                </div>
              </div>
            </div>

            {/* Right: dashboard mockup */}
            <div className="fade-in">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "var(--text-muted)" }}>
            Publishes directly to
          </p>
          <div className="flex items-center justify-center flex-wrap opacity-70" style={{ gap: "8px 16px" }}>
            <PlatformLogo name="Shopify" />
            <PlatformLogo name="WordPress" />
            <PlatformLogo name="Webflow" />
            <PlatformLogo name="Ghost" />
            <PlatformLogo name="Custom" />
          </div>
        </div>
      </section>

      {/* Features with images */}
      <section id="features" style={{ background: "var(--bg)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Everything you need</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
              From audit to published article, in one flow
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              No more juggling tools. Ranqapex crawls, analyzes, drafts, and publishes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <BigFeatureCard
              imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
              title="Deep Technical Audit"
              desc="47 checks covering technical SEO, on-page, content, performance, schema, E-E-A-T, and AI readiness."
              tag="Audit"
            />
            <BigFeatureCard
              imageUrl="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80"
              title="AI Blog Writer"
              desc="Smart topic suggestions from your content gaps. Draft SEO-optimized articles with schema, FAQs, and internal links."
              tag="Content"
            />
            <BigFeatureCard
              imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
              title="One-Click Publishing"
              desc="Review via email, accept, and we push directly to Shopify — no copy-paste, no formatting fixes."
              tag="Publish"
            />
          </div>
        </div>
      </section>

      {/* Generative Engine Optimization (GEO) */}
      <section id="geo" style={{ background: "linear-gradient(180deg, var(--bg) 0%, #0f172a 100%)", color: "#fff" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy + bullets */}
            <div className="fade-in">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{ background: "rgba(124, 92, 252, 0.15)", color: "#A8B5FF", border: "1px solid rgba(168, 181, 255, 0.3)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                GEO · The new search landscape
              </div>

              <h2 className="text-3xl md:text-[42px] font-bold tracking-tight mb-5 leading-[1.1]">
                Get cited by{" "}
                <span style={{ background: "linear-gradient(135deg, #A8B5FF, #C4B5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  ChatGPT, Perplexity
                </span>{" "}
                & Google AI Overviews
              </h2>
              <p className="text-base md:text-lg mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                40% of searches now happen on AI engines — and they don&rsquo;t just rank pages, they cite them. Generative Engine Optimization makes your content quotable, citable, and visible inside AI answers.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { title: "AI Readiness Score", desc: "Per-page score for how easily AI engines can extract and cite your content." },
                  { title: "Auto-generated schema & FAQ markup", desc: "Structured data that AI crawlers actually understand and quote." },
                  { title: "llms.txt + AI crawler directives", desc: "Tell GPTBot, ClaudeBot, PerplexityBot what they can index." },
                  { title: "Entity & citation optimization", desc: "Stats, lists, definitions formatted for direct quoting." },
                  { title: "AI search visibility tracking", desc: "Monitor when your brand shows up in AI-generated answers." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(124, 92, 252, 0.25)" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A8B5FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="#features"
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Run free AI Readiness audit
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            {/* Right: GEO visual */}
            <div className="fade-in">
              <GeoMockup />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
              Four steps to a healthier website
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              { step: "01", title: "Enter your URL", desc: "Paste any website address and sign in with Google.", icon: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" },
              { step: "02", title: "We crawl", desc: "Our bots scan up to 25 pages of your site in seconds.", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
              { step: "03", title: "Get insights", desc: "47 checks, prioritized fixes, and AI-suggested blog topics.", icon: "M9 11H1l8-8 8 8h-8v10" },
              { step: "04", title: "Publish", desc: "Review articles via email and publish to Shopify with one click.", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
            ].map((item, i) => (
              <div key={item.step} className="relative fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                <div
                  className="p-6 rounded-2xl h-full"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.icon} />
                      </svg>
                    </div>
                    <span className="text-xs font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Stat value="47" label="SEO checks per page" />
            <Stat value="60s" label="Average audit time" />
            <Stat value="8" label="Ranking categories" />
            <Stat value="1-click" label="Publish to Shopify" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: "var(--bg)" }}>
        <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Ready to rank higher?
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
            Start with a free audit. No credit card. See results in 60 seconds.
          </p>
          <form onSubmit={addDomain} className="relative max-w-xl mx-auto">
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{
                background: "var(--bg-white)",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="pl-4 pr-2" style={{ color: "var(--text-muted)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourstore.com"
                className="flex-1 px-3 py-4 text-sm outline-none bg-transparent"
                style={{ color: "var(--text-primary)" }}
                disabled={loading}
              />
              <div className="pr-2">
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="btn-primary px-6 py-2.5 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Analyzing..." : "Free Audit →"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} Ranqapex — SEO Autopilot
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs" style={{ color: "var(--text-muted)" }}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="/pricing">Pricing</a>
            <a href="/dashboard">Dashboard</a>
          </div>
        </div>
      </footer>

      {/* Sign In Popup */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--bg-white)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            {/* Header */}
            <div className="p-8 text-center" style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.15)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Domain Added!</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{domainUrl}</p>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-center mb-5" style={{ color: "var(--text-secondary)" }}>
                Create your account and connect Google to unlock keyword data, search analytics, and AI-powered blog suggestions.
              </p>

              {/* Name & Email */}
              <div className="space-y-3 mb-5">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)" }}
                />
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)" }}
                />
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-all mb-3"
                style={{ background: "var(--bg-white)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4285F4"; e.currentTarget.style.background = "#4285F408"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-white)"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>

              {/* What you get */}
              <div className="p-4 rounded-xl mb-4" style={{ background: "var(--bg)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>What you get with Google</p>
                <div className="space-y-2">
                  {[
                    { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", text: "Real keyword data from Google Search Console" },
                    { icon: "M13 10V3L4 14h7v7l9-11h-7z", text: "AI-powered blog topics based on your search data" },
                    { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10", text: "Track rankings, clicks, and impressions" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skip */}
              <button
                onClick={skipSignIn}
                className="w-full py-2.5 text-xs font-medium cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                Skip for now — I&apos;ll connect later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card-static p-7">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{ background: "var(--accent-light)" }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {desc}
      </p>
    </div>
  );
}

function BigFeatureCard({
  imageUrl,
  title,
  desc,
  tag,
}: {
  imageUrl: string;
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all fade-in"
      style={{
        background: "var(--bg-white)",
        border: "1px solid var(--border-light)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="relative h-44 overflow-hidden" style={{ background: "linear-gradient(135deg, #4F6EF710, #7C5CFC10)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
          style={{ background: "rgba(255,255,255,0.95)", color: "var(--accent)", backdropFilter: "blur(8px)" }}
        >
          {tag}
        </span>
      </div>
      <div className="p-6">
        <h3 className="font-semibold text-lg mb-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

function PlatformLogo({ name }: { name: string }) {
  return (
    <span
      className="text-base md:text-xl font-bold tracking-tight"
      style={{
        color: "var(--text-secondary)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 24px",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-white">
      <p className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{value}</p>
      <p className="text-xs md:text-sm opacity-80">{label}</p>
    </div>
  );
}

function GeoMockup() {
  const engines = [
    { name: "ChatGPT", color: "#10A37F", initial: "G" },
    { name: "Perplexity", color: "#20808D", initial: "P" },
    { name: "Google AI", color: "#4285F4", initial: "G" },
    { name: "Claude", color: "#D97757", initial: "C" },
  ];
  return (
    <div className="relative">
      {/* Main card: AI search result */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 30px 60px -15px rgba(0,0,0,0.5)",
        }}
      >
        {/* AI engine avatar */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #10A37F, #1A7F64)" }}>
            G
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ChatGPT</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>Answering &ldquo;best organic skincare brands&rdquo;</p>
          </div>
        </div>

        {/* AI answer with citation */}
        <div className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.85)" }}>
          For organic skincare, top brands focus on certified ingredients and transparent sourcing.{" "}
          <span
            className="px-1.5 py-0.5 rounded text-xs font-semibold"
            style={{ background: "rgba(124, 92, 252, 0.25)", color: "#C4B5FD", border: "1px solid rgba(168, 181, 255, 0.4)" }}
          >
            yourstore.com
            <sup className="ml-0.5">[1]</sup>
          </span>{" "}
          recommends checking for USDA Organic and ECOCERT certifications, and prioritizing brands with full ingredient transparency.
        </div>

        {/* Sources */}
        <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            Sources
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: "#7C5CFC", color: "#fff" }}>1</span>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>yourstore.com/guides/organic-skincare</span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-60">
              <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>2</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>healthline.com/nutrition/organic-skin...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating: AI Readiness Score */}
      <div
        className="absolute -top-5 -right-5 rounded-xl px-4 py-3 hidden md:block"
        style={{
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#64748b" }}>AI Readiness</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color: "#22c55e" }}>92</span>
          <span className="text-xs" style={{ color: "#94a3b8" }}>/100</span>
        </div>
      </div>

      {/* Floating: cited by row */}
      <div
        className="absolute -bottom-6 left-6 right-6 rounded-xl px-4 py-3 hidden md:flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)",
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: "#64748b" }}>Cited by</span>
        <div className="flex items-center -space-x-1.5">
          {engines.map((e) => (
            <div
              key={e.name}
              title={e.name}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: e.color, border: "2px solid #fff" }}
            >
              {e.initial}
            </div>
          ))}
        </div>
        <span className="text-xs ml-auto font-semibold" style={{ color: "#22c55e" }}>+247 mentions</span>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Outer shadow card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-white)",
          border: "1px solid var(--border)",
          boxShadow: "0 30px 60px -15px rgba(79, 110, 247, 0.25), 0 10px 25px -5px rgba(0,0,0,0.08)",
        }}
      >
        {/* Window chrome */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg)" }}>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div className="flex-1 mx-4">
            <div className="mx-auto max-w-[220px] text-[10px] px-2 py-1 rounded text-center" style={{ background: "var(--bg-white)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>
              ranqapex.com/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5">
          {/* Score row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-20 h-20 shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border-light)" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(87 / 100) * 201} 201`}
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>87</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Overall SEO Score</p>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>yourstore.com</p>
              <p className="text-[11px] mt-1" style={{ color: "#22c55e" }}>+12 since last audit</p>
            </div>
          </div>

          {/* Issues grid */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: "Critical", count: 2, color: "#ef4444", bg: "#fef2f2" },
              { label: "High", count: 5, color: "#f97316", bg: "#fff7ed" },
              { label: "Medium", count: 8, color: "#eab308", bg: "#fefce8" },
              { label: "Low", count: 12, color: "#22c55e", bg: "#f0fdf4" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg text-center" style={{ background: s.bg }}>
                <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.count}</p>
                <p className="text-[10px] font-medium" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Category bars */}
          <div className="space-y-2.5">
            {[
              { label: "Technical SEO", score: 92, color: "#22c55e" },
              { label: "Content Quality", score: 78, color: "#eab308" },
              { label: "Performance", score: 85, color: "#22c55e" },
              { label: "Schema", score: 64, color: "#f97316" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <span className="text-[11px] w-28 shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {c.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.color }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right tabular-nums" style={{ color: c.color }}>
                  {c.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating blog card */}
      <div
        className="absolute -bottom-8 -left-8 rounded-xl p-4 w-60 hidden md:block"
        style={{
          background: "var(--bg-white)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4F6EF715" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate" style={{ color: "var(--text-primary)" }}>Blog Writer</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Just now</p>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#dcfce7", color: "#166534" }}>DONE</span>
        </div>
        <p className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
          &ldquo;The Ultimate Guide to Organic Skincare&rdquo; ready for review.
        </p>
      </div>

      {/* Floating score badge */}
      <div
        className="absolute -top-4 -right-4 rounded-xl px-4 py-3 hidden md:flex items-center gap-2"
        style={{
          background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
          boxShadow: "0 10px 25px -5px rgba(79, 110, 247, 0.4)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span className="text-xs font-bold text-white">47 checks passed</span>
      </div>
    </div>
  );
}
