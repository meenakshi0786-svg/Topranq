import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blog — Ranqapex | SEO, GEO & AI Content Strategy",
  description: "Learn about Generative Engine Optimization, llms.txt, pillar-cluster SEO, entity maps, and AI-driven content strategy. Expert guides for 2026.",
  alternates: { canonical: "/blog" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
