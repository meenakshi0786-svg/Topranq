"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

export default function EntityMapArticle() {
  usePageTitle("Entity Maps & JSON-LD: Structured Data for AI Search");
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav className="px-6 py-5 flex items-center justify-between max-w-[1200px] mx-auto w-full">
        <Link href="/"><Logo size={36} /></Link>
        <div className="flex items-center gap-2">
          <Link href="/blog" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: "var(--text-secondary)" }}>Blog</Link>
          <Link href="/dashboard" className="text-sm font-medium px-5 py-2 rounded-lg" style={{ color: "var(--accent)", background: "var(--accent-light)" }}>Dashboard</Link>
        </div>
      </nav>
      <article className="max-w-[720px] mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>GEO</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>April 2026 · 8 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4" style={{ color: "var(--text-primary)" }}>Entity Maps &amp; JSON-LD: Structured Data for AI Search Engines</h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>JSON-LD knowledge graphs help Google AI Overviews and ChatGPT understand your site&apos;s entities, topics, and relationships. An entity map is the structured data equivalent of telling AI exactly what you are, what you know, and how your content connects.</p>
        </div>
        <div className="prose prose-sm max-w-none text-sm leading-relaxed article-body" style={{ color: "var(--text-secondary)" }}>
          <h2>What is an Entity Map?</h2>
          <p>An <strong>entity map</strong> is a JSON-LD document that defines the key entities on your site — your organization, products, tools, topics — and the relationships between them. It uses Schema.org vocabulary, the same standard Google uses for Knowledge Panels and rich results.</p>
          <p>For AI search engines, entity maps serve a different purpose than traditional Schema.org markup. Traditional schema helps you get rich snippets in Google Search. An entity map helps AI engines build a <strong>knowledge graph</strong> of your site — understanding not just individual pages, but how everything connects. This is a key part of <Link href="/blog/what-is-generative-engine-optimization" style={{ color: "var(--accent)" }}>Generative Engine Optimization (GEO)</Link>.</p>
          <hr />
          <h2>Entity Map vs Regular Schema Markup</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "2px solid var(--border)" }}><th style={{ textAlign: "left", padding: "8px 12px" }}>Aspect</th><th style={{ textAlign: "left", padding: "8px 12px" }}>Regular Schema</th><th style={{ textAlign: "left", padding: "8px 12px" }}>Entity Map</th></tr></thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}><td style={{ padding: "8px 12px" }}>Scope</td><td style={{ padding: "8px 12px" }}>Per-page</td><td style={{ padding: "8px 12px" }}>Entire site</td></tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}><td style={{ padding: "8px 12px" }}>Purpose</td><td style={{ padding: "8px 12px" }}>Rich snippets</td><td style={{ padding: "8px 12px" }}>AI knowledge graph</td></tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}><td style={{ padding: "8px 12px" }}>Contains</td><td style={{ padding: "8px 12px" }}>Page-level data</td><td style={{ padding: "8px 12px" }}>Entities + relationships</td></tr>
              <tr style={{ borderBottom: "1px solid var(--border-light)" }}><td style={{ padding: "8px 12px" }}>Key field</td><td style={{ padding: "8px 12px" }}>@type for the page</td><td style={{ padding: "8px 12px" }}>knowsAbout, offers, about</td></tr>
              <tr><td style={{ padding: "8px 12px" }}>Consumed by</td><td style={{ padding: "8px 12px" }}>Google Search</td><td style={{ padding: "8px 12px" }}>Google AI, ChatGPT, Perplexity</td></tr>
            </tbody>
          </table>
          <hr />
          <h2>What Goes in an Entity Map</h2>
          <h3>1. Organization Entity</h3>
          <p>Your brand name, URL, description, and a <code>knowsAbout</code> array listing 15-25 qualified topics your site demonstrates expertise in. This is the most important field — it directly influences what AI engines consider you authoritative on.</p>
          <h3>2. Page Entities</h3>
          <p>Each important page gets its own entity with the most specific <code>@type</code>: <code>SoftwareApplication</code> for tools, <code>Product</code> for products, <code>Article</code> for blog posts. Include an <code>about</code> array linking to the topics this page covers.</p>
          <h3>3. Relationships</h3>
          <p>The <code>isPartOf</code>, <code>offers</code>, and <code>hasPart</code> fields connect entities into a graph. This tells AI: &ldquo;this product is offered by this organization, this article is part of this topic cluster.&rdquo;</p>
          <hr />
          <h2>How to Deploy an Entity Map</h2>
          <h3>WordPress</h3>
          <p>Use the &ldquo;Insert Headers and Footers&rdquo; plugin. Paste the JSON-LD inside a <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code> tag in the Header section. This embeds it on every page.</p>
          <h3>Shopify</h3>
          <p>Go to Theme → Edit code → <code>theme.liquid</code>. Paste the JSON-LD before <code>&lt;/head&gt;</code>. Save — it&apos;s now on every page.</p>
          <p>Also upload the file as <code>entity-map.jsonld</code> at your site root and reference it in your <Link href="/blog/llms-txt-complete-guide" style={{ color: "var(--accent)" }}>llms.txt</Link>.</p>
          <hr />
          <h2>Generate Your Entity Map</h2>
          <p>Ranqapex generates entity maps automatically from your crawled pages. The AI analyzes your site structure, identifies entities, assigns specific Schema.org types, and builds the <code>knowsAbout</code> and relationship graph. Download it from the GEO toolkit.</p>
          <p><strong><Link href="/" style={{ color: "var(--accent)" }}>Get your entity map for free →</Link></strong></p>
        </div>
      </article>
    </div>
  );
}
