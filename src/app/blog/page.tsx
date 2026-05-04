"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

const posts = [
  {
    slug: "what-is-generative-engine-optimization",
    title: "What is Generative Engine Optimization (GEO)? The 2026 Guide",
    excerpt: "40% of searches now happen on AI engines. GEO ensures your content gets cited by ChatGPT, Claude, Perplexity, and Google AI Overviews. Here's how it works and why it matters.",
    category: "GEO",
    date: "April 2026",
    readTime: "8 min",
    gradient: "linear-gradient(135deg, #667eea, #764ba2)",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    slug: "llms-txt-complete-guide",
    title: "llms.txt: The Complete Guide to AI-Optimized Site Indexing",
    excerpt: "llms.txt is the robots.txt for AI engines. Learn how to create, optimize, and score your llms.txt for maximum visibility in ChatGPT, Claude, and Perplexity responses.",
    category: "GEO",
    date: "April 2026",
    readTime: "10 min",
    gradient: "linear-gradient(135deg, #4F6EF7, #7C5CFC)",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    slug: "pillar-cluster-seo-strategy",
    title: "Pillar & Cluster SEO: How to Build Topical Authority in 2026",
    excerpt: "The pillar-cluster model is the most effective way to rank for competitive keywords. Learn how to use GSC data to identify pillar opportunities and generate a complete content strategy.",
    category: "SEO Strategy",
    date: "April 2026",
    readTime: "12 min",
    gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
  {
    slug: "ai-citation-snippets-guide",
    title: "AI Citation Snippets: How to Get Quoted by ChatGPT & Perplexity",
    excerpt: "Pre-written quotable summaries increase the chance AI models cite your site by 3x. Learn how to write citation-ready content and where to place it for maximum AI visibility.",
    category: "GEO",
    date: "April 2026",
    readTime: "7 min",
    gradient: "linear-gradient(135deg, #43e97b, #38f9d7)",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    slug: "seo-autopilot-vs-manual",
    title: "SEO Autopilot vs Manual SEO: Which Approach Wins in 2026?",
    excerpt: "AI-powered SEO tools can audit, strategize, write, and publish content automatically. But when does autopilot beat manual work — and when does it fall short?",
    category: "SEO Tools",
    date: "April 2026",
    readTime: "9 min",
    gradient: "linear-gradient(135deg, #fa709a, #fee140)",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    slug: "entity-map-jsonld-seo",
    title: "Entity Maps & JSON-LD: Structured Data for AI Search Engines",
    excerpt: "JSON-LD knowledge graphs help Google AI Overviews and ChatGPT understand your site's entities, topics, and relationships. Here's how to generate and deploy them.",
    category: "GEO",
    date: "April 2026",
    readTime: "8 min",
    gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4",
  },
];

export default function BlogPage() {
  usePageTitle("Blog — SEO, GEO & AI Content Strategy");
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav className="px-6 py-5 flex items-center justify-between max-w-[1200px] mx-auto w-full">
        <Link href="/"><Logo size={36} /></Link>
        <div className="flex items-center gap-2">
          <Link href="/#features" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>Features</Link>
          <Link href="/pricing" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>Pricing</Link>
          <Link href="/dashboard" className="text-sm font-medium px-5 py-2 rounded-lg" style={{ color: "var(--accent)", background: "var(--accent-light)" }}>Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-[900px] mx-auto px-6 py-10">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
            Ranqapex Blog
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            SEO, GEO & AI Content Strategy
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Guides on Generative Engine Optimization, AI-powered content, and modern SEO strategies.
          </p>
        </div>

        <div className="space-y-4">
          {posts.map((post, i) => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="block">
            <article
              className="card-static p-6 fade-in"
              style={{ animationDelay: `${i * 0.05}s`, transition: "transform 0.3s, box-shadow 0.3s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 25px rgba(0,0,0,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)"; }}
            >
              <div style={{ display: "flex", alignItems: "stretch", gap: 20 }}>
                {/* Thumbnail */}
                <div style={{
                  width: 140, minHeight: 100, borderRadius: 12, background: post.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={post.icon} />
                  </svg>
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", borderRadius: 4, background: "var(--accent-light)", color: "var(--accent)" }}>
                      {post.category}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{post.date}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {post.readTime}</span>
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6, color: "var(--text-primary)" }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
                    {post.excerpt}
                  </p>
                </div>
              </div>
            </article>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, #4F6EF708, #7C5CFC08)", border: "1px solid #4F6EF720" }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Want to rank in AI search?</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Start with a free audit — see your AI readiness score in 60 seconds.</p>
          <Link href="/" className="btn-primary inline-block px-6 py-2.5 text-sm">
            Get Free Audit →
          </Link>
        </div>
      </div>
    </div>
  );
}
