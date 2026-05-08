"use client";

import { AlternativePage, type AlternativeData } from "@/components/alternative-page";

const data: AlternativeData = {
  competitor: {
    name: "Jasper",
    pricing: "$49/mo",
    tagline: "AI copywriting platform",
  },
  hero: {
    title: "The Jasper alternative built specifically for SEO",
    subtitle: "Jasper writes copy. Ranqapex audits your site, finds keyword gaps, builds a content strategy, and writes AI articles tailored to ranking. From $1.",
  },
  intro:
    "Jasper is a general-purpose AI copywriting tool — great for marketing emails, ad copy, and social posts. But it doesn't audit your website, doesn't research keywords from your Google Search Console data, and doesn't generate llms.txt for AI search engines. If your goal is specifically to RANK on Google and get cited by ChatGPT, Ranqapex is the SEO-focused alternative.",
  whyTheySwitch: [
    "Jasper costs $49/month. Ranqapex starts at $1 (one-time).",
    "Jasper writes copy in any tone. Ranqapex writes SEO-optimized articles built on real keyword research.",
    "Jasper doesn't audit your site. Ranqapex finds the issues holding back your rankings.",
    "Jasper doesn't have GEO tooling. Ranqapex generates llms.txt for ChatGPT and Perplexity.",
    "Jasper doesn't connect to Google Search Console. Ranqapex pulls your real ranking data to find content gaps.",
    "Jasper doesn't build pillar-cluster content strategies. Ranqapex does, automatically.",
  ],
  featureCompare: [
    { feature: "Site SEO audit", ranqapex: "47 checks, scored", competitor: "No", winner: "ranqapex" },
    { feature: "Keyword research", ranqapex: "GSC + competitor SERPs", competitor: "Limited", winner: "ranqapex" },
    { feature: "AI article generation", ranqapex: "Sonnet (10) or Opus (15)", competitor: "Yes (any topic)", winner: "tie" },
    { feature: "General copywriting", ranqapex: "SEO-focused only", competitor: "Industry leader", winner: "competitor" },
    { feature: "Brand voice training", ranqapex: "Tone presets", competitor: "Custom brand voice", winner: "competitor" },
    { feature: "Pillar-cluster strategy", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "llms.txt generator", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "Shopify product import", ranqapex: "Full CSV import", competitor: "No", winner: "ranqapex" },
    { feature: "Multi-language content", ranqapex: "Yes", competitor: "Yes", winner: "tie" },
    { feature: "Starting price", ranqapex: "$1 one-time", competitor: "$49/month", winner: "ranqapex" },
  ],
  bottomLine:
    "Jasper is a fantastic tool if you need general-purpose marketing copy across channels. But for SEO specifically — ranking on Google AND getting cited by AI engines — you need a tool that audits, researches, and writes within an SEO framework. Ranqapex does all three in one workflow at $1, so you can test it for the price of a coffee.",
};

export default function JasperAlternativePage() {
  return <AlternativePage data={data} />;
}
