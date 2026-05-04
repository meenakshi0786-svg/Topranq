"use client";

import Link from "next/link";

const ALL_POSTS = [
  { slug: "what-is-generative-engine-optimization", title: "What is Generative Engine Optimization (GEO)?", category: "GEO", gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
  { slug: "llms-txt-complete-guide", title: "llms.txt: The Complete Guide", category: "GEO", gradient: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" },
  { slug: "pillar-cluster-seo-strategy", title: "Pillar & Cluster SEO Strategy", category: "SEO Strategy", gradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { slug: "ai-citation-snippets-guide", title: "AI Citation Snippets Guide", category: "GEO", gradient: "linear-gradient(135deg, #43e97b, #38f9d7)" },
  { slug: "seo-autopilot-vs-manual", title: "SEO Autopilot vs Manual SEO", category: "SEO Tools", gradient: "linear-gradient(135deg, #fa709a, #fee140)" },
  { slug: "entity-map-jsonld-seo", title: "Entity Maps & JSON-LD for AI SEO", category: "GEO", gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)" },
];

export function Breadcrumbs({ currentTitle }: { currentTitle: string }) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ranqapex.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://ranqapex.com/blog" },
      { "@type": "ListItem", position: 3, name: currentTitle },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: 12, color: "var(--text-muted)" }}>
        <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <Link href="/blog" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Blog</Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <span style={{ color: "var(--text-secondary)" }}>{currentTitle}</span>
      </nav>
    </>
  );
}

export function RelatedPosts({ currentSlug }: { currentSlug: string }) {
  const related = ALL_POSTS.filter((p) => p.slug !== currentSlug).slice(0, 3);
  return (
    <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--border-light)" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Related Articles
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {related.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-light)", background: "#fff", height: "100%" }}>
              <div style={{ height: 80, background: p.gradient }} />
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", margin: "0 0 6px" }}>{p.category}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.35 }}>{p.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
