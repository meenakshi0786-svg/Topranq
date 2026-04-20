"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

export default function GEOArticle() {
  usePageTitle("What is Generative Engine Optimization (GEO)?");
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4" style={{ color: "var(--text-primary)" }}>
            What is Generative Engine Optimization (GEO)? The 2026 Guide
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            40% of searches now happen on AI engines — ChatGPT, Claude, Perplexity, and Google AI Overviews. These systems don&apos;t just rank pages. They <strong>cite</strong> them. GEO is the practice of optimizing your content so AI models find, understand, and quote your site.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-sm leading-relaxed article-body" style={{ color: "var(--text-secondary)" }}>

          <h2>SEO vs GEO: What Changed</h2>
          <p>Traditional SEO optimizes for blue links on a search results page. GEO optimizes for <strong>AI-generated answers</strong> — the text boxes that appear in ChatGPT responses, Perplexity summaries, and Google AI Overviews.</p>
          <p>The key difference: in SEO, you compete for clicks. In GEO, you compete for <strong>citations</strong>. When an AI answers &ldquo;What&apos;s the best protein powder?&rdquo;, it pulls from specific sources. GEO ensures your site is one of those sources.</p>

          <hr />

          <h2>The 4 Pillars of GEO</h2>

          <h3>1. AI Crawlability</h3>
          <p>AI engines send bots to crawl your site — GPTBot (ChatGPT), ClaudeBot (Claude), PerplexityBot. If your <code>robots.txt</code> blocks them, you&apos;re invisible. Check which bots can access your site and unblock the ones that matter.</p>

          <h3>2. Content Structure for Extraction</h3>
          <p>AI models extract from structured content more reliably than from paragraphs. Use clear headings, bullet lists, FAQ schemas, and definition patterns (&ldquo;X is Y&rdquo;) in the first 200 words. These patterns become the snippets AI models quote.</p>

          <h3>3. llms.txt and AI Directives</h3>
          <p>The <code>llms.txt</code> file (placed at your site root) tells AI engines what your site does, which pages matter, and how to cite you. Think of it as <code>robots.txt</code> for LLMs. A well-optimized llms.txt includes an about section, grouped URLs, capabilities, use cases, and citation policy. <Link href="/blog/llms-txt-complete-guide" style={{ color: "var(--accent)" }}>Read our complete llms.txt guide →</Link></p>

          <h3>4. Citation-Ready Content</h3>
          <p>Write content that AI models can quote verbatim. The first paragraph of every page should answer &ldquo;What is [topic]?&rdquo; in 2-3 factual sentences. Include specific numbers, dates, and names — AI models prefer concrete facts over vague statements.</p>

          <hr />

          <h2>How to Measure AI Readiness</h2>
          <p>Ranqapex provides an <strong>AI Readiness Score</strong> (0-100) that evaluates your site across 8 checks per page:</p>
          <ul>
            <li><strong>Clear title</strong> (20-70 characters with primary keyword)</li>
            <li><strong>Meta description</strong> (80-180 characters, citation-ready)</li>
            <li><strong>H1 heading</strong> present</li>
            <li><strong>Content depth</strong> (300+ words)</li>
            <li><strong>Schema markup</strong> (Article, Product, FAQ)</li>
            <li><strong>FAQ schema</strong> (FAQPage JSON-LD)</li>
            <li><strong>Canonical URL</strong> set</li>
            <li><strong>AI crawler access</strong> (robots.txt allows GPTBot, ClaudeBot, etc.)</li>
          </ul>

          <hr />

          <h2>GEO Toolkit: 4 Files Every Site Needs</h2>
          <p>Beyond optimizing individual pages, GEO requires four site-level files:</p>
          <ol>
            <li><strong>llms.txt</strong> — Standard AI-optimized site index with about, URLs, topics, capabilities</li>
            <li><strong>llms-full.txt</strong> — Extended semantic profile with topical authority map and relationship graph</li>
            <li><strong>entity-map.jsonld</strong> — JSON-LD knowledge graph for Google AI Overviews and Knowledge Panels</li>
            <li><strong>ai-citation-snippets.md</strong> — Pre-written quotable summaries for each page</li>
          </ol>
          <p>Ranqapex generates all four automatically from your crawled pages. <Link href="/" style={{ color: "var(--accent)" }}>Try a free audit →</Link></p>

          <hr />

          <h2>Getting Started with GEO</h2>
          <ol>
            <li><strong>Audit your site</strong> — Run a free audit on Ranqapex to get your AI Readiness Score</li>
            <li><strong>Fix AI crawler access</strong> — Unblock GPTBot, ClaudeBot, PerplexityBot in robots.txt</li>
            <li><strong>Generate llms.txt</strong> — Use the GEO toolkit to create all 4 AI optimization files</li>
            <li><strong>Optimize content structure</strong> — Add FAQ schemas, clear definitions, and quotable first paragraphs</li>
            <li><strong>Monitor citations</strong> — Track when AI engines cite your content</li>
          </ol>

          <hr />

          <h2>Conclusion</h2>
          <p>GEO is no longer optional. As AI engines handle more searches, sites that aren&apos;t optimized for citation will lose visibility — regardless of their traditional SEO rankings. The good news: GEO is straightforward to implement, and the tools exist today.</p>
          <p><strong>Start with a free AI Readiness audit on <Link href="/" style={{ color: "var(--accent)" }}>Ranqapex</Link> — see your score in 60 seconds.</strong></p>
        </div>
      </article>
    </div>
  );
}
