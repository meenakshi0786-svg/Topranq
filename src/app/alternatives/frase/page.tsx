"use client";

import { AlternativePage, type AlternativeData } from "@/components/alternative-page";

const data: AlternativeData = {
  competitor: {
    name: "Frase",
    pricing: "$45/mo",
    tagline: "Content briefs & AI writing",
  },
  hero: {
    title: "The Frase alternative with audits + GEO baked in",
    subtitle: "Frase generates content briefs. Ranqapex audits your whole site, plans pillars, writes articles, AND ships llms.txt for AI search engines. From $1.",
  },
  intro:
    "Frase is a solid content-brief and AI-writing tool that competes head-on with SurferSEO. But like Surfer, it doesn't audit your technical SEO, doesn't generate llms.txt, and doesn't import your product catalog. Ranqapex covers content briefs (via the Magic Keyword Planner), AI articles, audits, AND GEO assets — at 98% lower cost.",
  whyTheySwitch: [
    "Frase costs $45/month. Ranqapex starts at $1 (one-time).",
    "Frase doesn't audit your site. Ranqapex runs a full 47-check technical audit.",
    "Frase doesn't generate llms.txt. Ranqapex does — get cited by ChatGPT and Perplexity.",
    "Frase doesn't import product CSVs. Ranqapex weaves real product links into your articles.",
    "Frase has Q&A research from SERPs. Ranqapex pulls that PLUS your real GSC ranking data.",
    "Frase optimizes existing content. Ranqapex builds the entire content strategy from scratch.",
  ],
  featureCompare: [
    { feature: "Content briefs", ranqapex: "Built into keyword planner", competitor: "Industry-leading", winner: "competitor" },
    { feature: "Site SEO audit", ranqapex: "47 checks, scored", competitor: "No", winner: "ranqapex" },
    { feature: "AI article generation", ranqapex: "Sonnet or Opus", competitor: "Yes", winner: "tie" },
    { feature: "Pillar-cluster strategy", ranqapex: "Auto-generated", competitor: "Manual", winner: "ranqapex" },
    { feature: "Q&A / PAA research", ranqapex: "Via Serper SERP data", competitor: "Native research panel", winner: "competitor" },
    { feature: "GSC integration", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "llms.txt generator (GEO)", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "Shopify product CSV import", ranqapex: "Yes", competitor: "No", winner: "ranqapex" },
    { feature: "Multi-language content", ranqapex: "Yes", competitor: "Yes", winner: "tie" },
    { feature: "Starting price", ranqapex: "$1 one-time", competitor: "$45/month", winner: "ranqapex" },
  ],
  bottomLine:
    "Frase has a sharper content-brief workflow if that's your specific need. But Ranqapex covers more ground: audit + keyword research + content briefs + AI articles + GEO — under one roof at $1. For SMBs and solo founders who don't have a separate budget for an audit tool plus a content tool plus a GEO tool, Ranqapex is the all-in-one alternative.",
};

export default function FraseAlternativePage() {
  return <AlternativePage data={data} />;
}
