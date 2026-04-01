"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      router.push(`/domain/${data.domainId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
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
        TopRanq SEO Autopilot
      </footer>
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
