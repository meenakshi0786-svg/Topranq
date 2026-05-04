import type { Metadata } from "next";

const slug = "seo-autopilot-vs-manual";
const title = "SEO Autopilot vs Manual SEO: Which Wins in 2026?";
const description = "AI-powered SEO autopilot vs traditional manual SEO — compare speed, cost, quality, and results. Data-driven analysis for 2026.";
const datePublished = "2026-04-20";
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
