import type { Metadata } from "next";

const slug = "llms-txt-complete-guide";
const title = "llms.txt: The Complete Guide to AI-Optimized Site Indexing";
const description = "Everything you need to know about llms.txt — the file that helps AI models understand your website. How to create, score, and deploy it for GEO.";
const datePublished = "2026-04-05";
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
