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
      <nav className="px-6 py-5 flex items-center justify-between max-w-[1100px] mx-auto w-full">
        <Logo size={28} />
        <a
          href="/dashboard"
          className="text-sm font-medium px-5 py-2 rounded-lg"
          style={{ color: "var(--accent)", background: "var(--accent-light)" }}
        >
          Dashboard
        </a>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-xl mx-auto text-center fade-in">
          {/* Subtle accent badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            47 SEO checks across 8 categories
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-4 leading-[1.15] tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Analyze your site&rsquo;s<br />SEO in seconds
          </h1>
          <p className="text-base mb-10 max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Get a comprehensive audit with prioritized fixes, E-E-A-T scoring, schema validation, and AI readiness checks.
          </p>

          <form onSubmit={addDomain} className="relative max-w-lg mx-auto">
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
                placeholder="Enter your website URL..."
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
                  {loading ? "Analyzing..." : "Analyze"}
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
        </div>
      </div>

      {/* Features */}
      <div style={{ background: "var(--bg-white)", borderTop: "1px solid var(--border-light)" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              }
              title="Deep Technical Audit"
              desc="47 checks covering technical SEO, on-page, content, performance, schema, E-E-A-T, and AI readiness."
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              }
              title="Priority Scoring"
              desc="Issues ranked by severity and real-world impact so you fix what moves the needle first."
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
              title="Actionable Fixes"
              desc="Every issue includes clear guidance on why it matters and step-by-step instructions to fix it."
            />
          </div>

          {/* How it works */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold mb-3 tracking-tight" style={{ color: "var(--text-primary)" }}>
              How It Works
            </h2>
            <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>
              Four steps to a healthier website.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "1", title: "Enter URL", desc: "Paste any website address" },
                { step: "2", title: "Crawl", desc: "We scan up to 25 pages" },
                { step: "3", title: "Analyze", desc: "47 checks across 8 categories" },
                { step: "4", title: "Fix", desc: "Get prioritized recommendations" },
              ].map((item, i) => (
                <div key={item.step} className="flex flex-col items-center fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm mb-3"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Ranqapex SEO Autopilot
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
