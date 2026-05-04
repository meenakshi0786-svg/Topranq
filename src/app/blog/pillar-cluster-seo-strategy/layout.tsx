import type { Metadata } from "next";

const slug = "pillar-cluster-seo-strategy";
const title = "Pillar & Cluster SEO: Build Topical Authority in 2026";
const description = "How to use the pillar-cluster content model to dominate search rankings. Step-by-step strategy for building topical authority with AI-generated content.";
const datePublished = "2026-04-08";
const dateModified = "2026-05-04";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `/blog/${slug}` },
  authors: [{ name: "Ranqapex Team" }],
  openGraph: { type: "article", publishedTime: datePublished, modifiedTime: dateModified, authors: ["Ranqapex Team"] },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  image: "https://ranqapex.com/opengraph-image",
  datePublished,
  dateModified,
  author: { "@type": "Organization", name: "Ranqapex Team", url: "https://ranqapex.com" },
  publisher: { "@type": "Organization", name: "Ranqapex", logo: { "@type": "ImageObject", url: "https://ranqapex.com/opengraph-image" } },
  mainEntityOfPage: { "@type": "WebPage", "@id": `https://ranqapex.com/blog/${slug}` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {children}
    </>
  );
}
