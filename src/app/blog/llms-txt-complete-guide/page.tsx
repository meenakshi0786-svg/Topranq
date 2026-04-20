"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePageTitle } from "@/components/page-title";

export default function LlmsTxtArticle() {
  usePageTitle("llms.txt: The Complete Guide to AI-Optimized Site Indexing");
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
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>April 2026 · 10 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4" style={{ color: "var(--text-primary)" }}>
            llms.txt: The Complete Guide to AI-Optimized Site Indexing
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <code>llms.txt</code> is a file you place at your site root that tells AI engines what your site does, which pages matter, and how to cite you. It&apos;s the <code>robots.txt</code> for LLMs — and in 2026, every serious website needs one.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-sm leading-relaxed article-body" style={{ color: "var(--text-secondary)" }}>

          <h2>What is llms.txt?</h2>
          <p><strong>llms.txt</strong> is a plain-text file placed at <code>yoursite.com/llms.txt</code> that provides structured information about your website specifically for AI crawlers and large language models. While <code>robots.txt</code> tells bots what they <em>can</em> crawl, <code>llms.txt</code> tells them what your site <em>is about</em> and how to reference it.</p>
          <p>AI engines like GPTBot (ChatGPT), ClaudeBot (Claude), and PerplexityBot actively look for this file when crawling your site. A well-structured llms.txt increases the likelihood that AI models accurately understand and cite your content. For broader context on AI search optimization, see our <Link href="/blog/what-is-generative-engine-optimization" style={{ color: "var(--accent)" }}>complete GEO guide</Link>.</p>

          <hr />

          <h2>Why llms.txt Matters in 2026</h2>
          <p>Without llms.txt, AI engines guess what your site is about based on crawled content. This guessing leads to:</p>
          <ul>
            <li><strong>Inaccurate citations</strong> — AI models misrepresent what your site does</li>
            <li><strong>Missing context</strong> — important pages get overlooked</li>
            <li><strong>Generic descriptions</strong> — your site sounds like every competitor</li>
            <li><strong>Wrong audience targeting</strong> — AI recommends your site to the wrong people</li>
          </ul>
          <p>With a proper llms.txt, you control the narrative. You decide which pages are important, what topics you&apos;re authoritative on, and exactly how AI models should reference your brand.</p>

          <hr />

          <h2>Anatomy of a High-Quality llms.txt</h2>
          <p>A production-ready llms.txt has these sections:</p>

          <h3>1. About Section</h3>
          <p>2-3 sentences explaining what your site does. Name specific tools, products, or features — never write &ldquo;comprehensive platform&rdquo; or &ldquo;innovative solution.&rdquo;</p>
          <blockquote><strong>Good:</strong> &ldquo;Ranqapex is an SEO automation platform that crawls websites, generates AI readiness reports, creates pillar-cluster content strategies, and writes articles with automatic product integration and internal linking.&rdquo;</blockquote>

          <h3>2. Core Pages (with URLs)</h3>
          <p>Each important page gets a URL and a 1-2 line description of what users <em>do</em> on that page — not what it &ldquo;is about.&rdquo;</p>

          <h3>3. Key Topics</h3>
          <p>8-12 qualified topics your site demonstrates expertise in. Not just &ldquo;SEO&rdquo; — write &ldquo;pillar-cluster content architecture&rdquo; or &ldquo;AI crawler access optimization.&rdquo;</p>

          <h3>4. Capabilities</h3>
          <p>4-6 action-oriented bullet points starting with verbs: Build, Generate, Screen, Monitor, Track. Each must name a specific feature.</p>

          <h3>5. Use Cases (Scenario-Based)</h3>
          <p>Format: &ldquo;[Person] uses [feature] to [outcome] when [situation].&rdquo; Never just list audiences.</p>

          <h3>6. Citation Policy</h3>
          <p>How AI models should reference your brand — the correct brand name, linking rules, and attribution format.</p>

          <hr />

          <h2>How to Score Your llms.txt</h2>
          <p>Ranqapex scores llms.txt across 8 categories (0-100 each):</p>
          <ol>
            <li><strong>Clarity</strong> — Does the about section clearly explain the site?</li>
            <li><strong>Structure</strong> — Are URLs grouped logically?</li>
            <li><strong>Descriptions</strong> — Does every page have a specific description?</li>
            <li><strong>Entities</strong> — Are key topics qualified and specific?</li>
            <li><strong>Capabilities</strong> — Action-oriented, feature-specific?</li>
            <li><strong>Use Cases</strong> — Scenario-based, not just personas?</li>
            <li><strong>Audience</strong> — Who + what they need?</li>
            <li><strong>Citation Readiness</strong> — Brand naming rules included?</li>
          </ol>
          <p>Target: 80+ across all categories. Deduct 5 points for each hedging word (&ldquo;may&rdquo;, &ldquo;might&rdquo;) and 5 for each marketing buzzword (&ldquo;innovative&rdquo;, &ldquo;cutting-edge&rdquo;).</p>

          <hr />

          <h2>Beyond llms.txt: The Full GEO Toolkit</h2>
          <p>llms.txt is the foundation, but three additional files complete your AI optimization:</p>
          <ul>
            <li><strong>llms-full.txt</strong> — Extended semantic profile with topical authority map, content architecture, and 25+ semantic tags</li>
            <li><strong>entity-map.jsonld</strong> — JSON-LD knowledge graph that feeds Google AI Overviews and Knowledge Panels</li>
            <li><strong>ai-citation-snippets.md</strong> — Pre-written quotable summaries and FAQ pairs designed for AI verbatim citation</li>
          </ul>

          <hr />

          <h2>How to Upload llms.txt</h2>
          <h3>WordPress</h3>
          <ol>
            <li>Install the File Manager plugin (or use FTP)</li>
            <li>Navigate to the root directory (where wp-config.php lives)</li>
            <li>Upload the llms.txt file</li>
            <li>Verify at yoursite.com/llms.txt</li>
          </ol>

          <h3>Shopify</h3>
          <ol>
            <li>Go to Online Store → Themes → Edit code</li>
            <li>Create a new page template named &ldquo;llms-txt&rdquo;</li>
            <li>Paste your llms.txt content into the template</li>
            <li>Create a page with URL handle &ldquo;llms.txt&rdquo; and assign the template</li>
            <li>Verify at yourstore.com/pages/llms.txt</li>
          </ol>

          <hr />

          <h2>Generate Your llms.txt Now</h2>
          <p>Ranqapex generates all 4 GEO files automatically from your crawled pages. Run a free audit, go to the GEO page, and download your optimized llms.txt — scored and ready to upload.</p>
          <p><strong><Link href="/" style={{ color: "var(--accent)" }}>Start your free audit →</Link></strong></p>
        </div>
      </article>
    </div>
  );
}
