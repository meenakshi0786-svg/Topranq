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
  },
  {
    slug: "llms-txt-complete-guide",
    title: "llms.txt: The Complete Guide to AI-Optimized Site Indexing",
    excerpt: "llms.txt is the robots.txt for AI engines. Learn how to create, optimize, and score your llms.txt for maximum visibility in ChatGPT, Claude, and Perplexity responses.",
    category: "GEO",
    date: "April 2026",
    readTime: "10 min",
  },
  {
    slug: "pillar-cluster-seo-strategy",
    title: "Pillar & Cluster SEO: How to Build Topical Authority in 2026",
    excerpt: "The pillar-cluster model is the most effective way to rank for competitive keywords. Learn how to use GSC data to identify pillar opportunities and generate a complete content strategy.",
    category: "SEO Strategy",
    date: "April 2026",
    readTime: "12 min",
  },
  {
    slug: "ai-citation-snippets-guide",
    title: "AI Citation Snippets: How to Get Quoted by ChatGPT & Perplexity",
    excerpt: "Pre-written quotable summaries increase the chance AI models cite your site by 3x. Learn how to write citation-ready content and where to place it for maximum AI visibility.",
    category: "GEO",
    date: "April 2026",
    readTime: "7 min",
  },
  {
    slug: "seo-autopilot-vs-manual",
    title: "SEO Autopilot vs Manual SEO: Which Approach Wins in 2026?",
    excerpt: "AI-powered SEO tools can audit, strategize, write, and publish content automatically. But when does autopilot beat manual work — and when does it fall short?",
    category: "SEO Tools",
    date: "April 2026",
    readTime: "9 min",
  },
  {
    slug: "entity-map-jsonld-seo",
    title: "Entity Maps & JSON-LD: Structured Data for AI Search Engines",
    excerpt: "JSON-LD knowledge graphs help Google AI Overviews and ChatGPT understand your site's entities, topics, and relationships. Here's how to generate and deploy them.",
    category: "GEO",
    date: "April 2026",
    readTime: "8 min",
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
            <article
              key={post.slug}
              className="card-static p-6 fade-in"
              style={{ animationDelay: `${i * 0.05}s`, transition: "transform 0.3s, box-shadow 0.3s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 25px rgba(0,0,0,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)"; }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                      {post.category}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{post.date}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {post.readTime}</span>
                  </div>
                  <h2 className="text-lg font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                    {post.title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {post.excerpt}
                  </p>
                </div>
              </div>
            </article>
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
