// Blog article templates for the Shopify embedded app.
//
// Single source of truth: the embedded UI renders the gallery from this list,
// and the generate endpoint enforces the paywall + injects `structure` into the
// writer prompt. `structure` stays server-side only — clients just send the id.

export interface BlogTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji shown on the card
  premium: boolean;
  exampleTopic: string; // placeholder shown in the generator when selected
  structure: string; // server-side: appended to the writer prompt
}

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: "how-to",
    name: "How-To Guide",
    description: "Step-by-step tutorial that solves one problem your customers have.",
    icon: "🛠️",
    premium: false,
    exampleTopic: "How to brew pour-over coffee at home",
    structure:
      "Format as a step-by-step how-to guide: brief intro stating the outcome, numbered steps with clear headings, a tools/materials list near the top, common-mistakes section, and a short FAQ at the end.",
  },
  {
    id: "listicle",
    name: "Top-N Listicle",
    description: "\"7 best…\" style list post — the workhorse of ecommerce content.",
    icon: "🔢",
    premium: false,
    exampleTopic: "7 best gifts for coffee lovers in 2026",
    structure:
      "Format as a numbered listicle: intro that promises the payoff, one H2 per item with a 2-3 sentence pitch and who it's best for, a comparison summary near the end, and a closing recommendation.",
  },
  {
    id: "comparison",
    name: "X vs Y Comparison",
    description: "Head-to-head comparison that captures high-intent buyers deciding.",
    icon: "⚖️",
    premium: true,
    exampleTopic: "French press vs pour-over: which is right for you?",
    structure:
      "Format as a head-to-head comparison: quick verdict up front, a side-by-side comparison table, sections comparing on 4-5 criteria that matter to buyers, who-should-buy-which recommendations, and an FAQ.",
  },
  {
    id: "buying-guide",
    name: "Buying Guide",
    description: "\"How to choose…\" deep-dive that ranks for research keywords.",
    icon: "🧭",
    premium: true,
    exampleTopic: "How to choose an espresso machine for your home",
    structure:
      "Format as a buying guide: what-to-consider criteria with H2s, budget tiers (entry/mid/premium) with a recommendation each, mistakes-to-avoid section, and a final decision checklist.",
  },
  {
    id: "gift-guide",
    name: "Gift Guide",
    description: "Seasonal gift roundup — perfect for holidays and occasions.",
    icon: "🎁",
    premium: true,
    exampleTopic: "The ultimate holiday gift guide for tea lovers",
    structure:
      "Format as a gift guide: warm intro naming the occasion and recipient, gifts grouped by budget or personality with H2s, a one-line why-they'll-love-it per item, and a wrap-up with a top pick.",
  },
  {
    id: "problem-solution",
    name: "Problem / Solution",
    description: "Agitate a pain point your product solves, then present the fix.",
    icon: "💡",
    premium: true,
    exampleTopic: "Why your morning coffee tastes bitter (and how to fix it)",
    structure:
      "Format as problem/solution: open by naming the pain vividly, explain the root causes with H2s, present solutions in order of impact, and close with a prevention checklist.",
  },
  {
    id: "seasonal",
    name: "Seasonal / Trend Post",
    description: "Timely content that rides seasonal search spikes.",
    icon: "📅",
    premium: true,
    exampleTopic: "Iced coffee trends to try this summer",
    structure:
      "Format as a seasonal trend post: intro tying to the season/moment, trend sections with H2s and why-it's-hot context, practical ways to try each trend, and a look-ahead close.",
  },
  {
    id: "faq-post",
    name: "FAQ / Answer Post",
    description: "Directly answers the questions people ask AI engines and Google.",
    icon: "❓",
    premium: true,
    exampleTopic: "Your top 10 questions about matcha, answered",
    structure:
      "Format as an FAQ post: short intro, each question as an H2 with a concise direct answer first (snippet-ready) then supporting detail, and a summary table of quick answers at the end.",
  },
  {
    id: "case-study",
    name: "Story / Case Study",
    description: "Narrative proof — a customer story or before/after journey.",
    icon: "📖",
    premium: true,
    exampleTopic: "How one home barista cut cafe spending by $100 a month",
    structure:
      "Format as a story/case study: hook with the end result, the before-state and challenge, the journey with concrete details and numbers, the outcome, and takeaways readers can copy.",
  },
  {
    id: "ultimate-guide",
    name: "Ultimate Guide (Pillar)",
    description: "Long-form pillar page that owns a whole topic cluster.",
    icon: "🏛️",
    premium: true,
    exampleTopic: "The ultimate guide to specialty coffee at home",
    structure:
      "Format as an ultimate pillar guide: table of contents, comprehensive H2 sections covering the topic end-to-end (basics through advanced), internal-linking-friendly subtopics, glossary of key terms, and a strong FAQ.",
  },
];

export function getTemplate(id: string): BlogTemplate | undefined {
  return BLOG_TEMPLATES.find((t) => t.id === id);
}

/** Client-safe projection (no prompt internals). */
export function templatesForClient() {
  return BLOG_TEMPLATES.map(({ id, name, description, icon, premium, exampleTopic }) => ({
    id, name, description, icon, premium, exampleTopic,
  }));
}
