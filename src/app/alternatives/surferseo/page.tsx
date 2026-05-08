"use client";

import { AlternativePage, type AlternativeData } from "@/components/alternative-page";

const data: AlternativeData = {
  competitor: {
    name: "SurferSEO",
    pricing: "$99/mo",
    tagline: "On-page SEO optimization",
  },
  hero: {
    title: "The SurferSEO alternative that actually generates content",
    subtitle: "Surfer scores your content. Ranqapex audits, plans, and writes it — plus generates llms.txt for AI search engines. From $1.",
  },
  intro:
    "SurferSEO is a strong on-page SEO optimization tool that grades your content against the top-ranking pages on Google. But it doesn't generate articles, doesn't audit your site holistically, and starts at $99/month. If you want one tool that handles audit-to-article-to-llms.txt — at a fraction of the price — Ranqapex is built for that.",
  whyTheySwitch: [
    "Surfer costs $99/month. Ranqapex starts at $1 (one-time).",
    "Surfer doesn't run technical SEO audits. Ranqapex crawls your site and surfaces fix-it issues.",
    "Surfer doesn't generate full articles. Ranqapex writes editorial articles with your products woven in.",
    "Surfer has no GEO tooling. Ranqapex generates llms.txt so ChatGPT and Perplexity cite you.",
    "Surfer doesn't import your Shopify product catalog. Ranqapex does, with up to 376+ products tested.",
  ],
  featureCompare: [
    { feature: "Technical SEO audit", ranqapex: "Yes — 47 checks, scored", competitor: "No", winner: "ranqapex" },
    { feature: "AI article generation", ranqapex: "10–15 articles per plan", competitor: "Optimization only", winner: "ranqapex" },
    { feature: "On-page content scoring", ranqapex: "Quality score per article", competitor: "Industry leader", winner: "competitor" },
    { feature: "Keyword research", ranqapex: "Magic Keyword Planner + GSC", competitor: "Keyword Surfer extension", winner: "tie" },
    { feature: "llms.txt generator (GEO)", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "Pillar-cluster strategy", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "Product CSV integration", ranqapex: "Yes (Shopify, custom)", competitor: "No", winner: "ranqapex" },
    { feature: "Internal linking", ranqapex: "AI-suggested", competitor: "Manual review", winner: "ranqapex" },
    { feature: "WordPress publishing", ranqapex: "Direct", competitor: "Plugin", winner: "tie" },
    { feature: "Starting price", ranqapex: "$1 one-time", competitor: "$99/month", winner: "ranqapex" },
  ],
  bottomLine:
    "If you already have content and just need to optimize it, SurferSEO is excellent at that one thing. But if you need to audit, plan, write, AND get cited by AI engines — at solo-founder pricing — Ranqapex covers the full workflow at 99% less per month. Try the free audit, generate one article for $1, and decide for yourself.",
};

export default function SurferAlternativePage() {
  return <AlternativePage data={data} />;
}
