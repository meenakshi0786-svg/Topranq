import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export interface BlogWriterConfig {
  topic: string;
  keywords: string[];
  tone: "professional" | "casual" | "technical";
  wordCount: number;
  intent?: string; // informational, commercial, transactional
  audience?: string;
  competitorUrls?: string[];
  productContext?: string;
  reworkNotes?: string; // feedback from reviewer for regeneration
}

export interface ImageSuggestion {
  placement: string; // after which heading
  altText: string;
  description: string;
}

export interface BlogWriterOutput {
  articleId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  h1: string;
  outline: Array<{ heading: string; summary: string; keyPoints: string[] }>;
  bodyMarkdown: string;
  bodyHtml: string;
  frontMatter: string;
  suggestedInternalLinks: Array<{ anchorText: string; targetUrl: string }>;
  faqItems: Array<{ question: string; answer: string }>;
  imageSuggestions: ImageSuggestion[];
  schemaJsonLd: Record<string, unknown>;
  qualityChecks: QualityChecks;
  estimatedWordCount: number;
}

export interface QualityChecks {
  readabilityScore: number; // 0–100
  keywordInTitle: boolean;
  keywordInH1: boolean;
  keywordInFirst100Words: boolean;
  keywordDensity: number; // percentage
  metaTitleLength: number;
  metaDescLength: number;
  hasInternalLinks: boolean;
  hasFaq: boolean;
  hasImages: boolean;
  overallScore: number;
}

export const BLOG_WRITER_CREDITS = 3;

export async function runBlogWriter(
  domainId: string,
  config: BlogWriterConfig
): Promise<BlogWriterOutput> {
  const existingPages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, domainId))
    .all();

  const { topic, keywords, tone, wordCount } = config;
  const intent = config.intent || "informational";
  const audience = config.audience || "general";
  const primaryKeyword = keywords[0] || topic;

  const slug = generateSlug(topic, primaryKeyword);
  const title = generateTitle(topic, primaryKeyword, tone, config.reworkNotes);
  const metaTitle = title.length <= 60 ? title : title.slice(0, 57) + "...";
  const metaDescription = generateMetaDescription(topic, primaryKeyword, intent);
  const h1 = title;

  const outline = generateOutline(topic, keywords, tone, wordCount, intent, config.reworkNotes);
  const bodyMarkdown = generateBody(topic, keywords, outline, tone, wordCount, primaryKeyword, config.productContext, config.reworkNotes);
  const suggestedInternalLinks = findInternalLinks(existingPages, keywords, topic);
  const faqItems = generateFAQs(topic, keywords, intent);
  const imageSuggestions = generateImageSuggestions(outline, topic, primaryKeyword);
  const estimatedWordCount = bodyMarkdown.split(/\s+/).length;

  // Build HTML from markdown
  const bodyHtml = markdownToHtml(bodyMarkdown);

  // Build JSON-LD schema
  const schemaJsonLd = buildSchemaJsonLd(title, metaDescription, slug, faqItems);

  // Build front matter
  const frontMatter = buildFrontMatter(title, metaDescription, slug, primaryKeyword, keywords, intent, audience);

  // Quality checks
  const qualityChecks = runQualityChecks(
    title, h1, metaTitle, metaDescription, bodyMarkdown,
    primaryKeyword, suggestedInternalLinks, faqItems, imageSuggestions
  );

  // Store in articles table
  const articleId = crypto.randomUUID();
  db.insert(schema.articles)
    .values({
      id: articleId,
      domainId,
      metaTitle,
      metaDescription,
      slug,
      h1,
      bodyMarkdown,
      bodyHtml,
      faqSchemaJson: JSON.stringify(faqItems),
      schemaJsonLd: JSON.stringify(schemaJsonLd),
      internalLinksJson: JSON.stringify(suggestedInternalLinks),
      imageSuggestionsJson: JSON.stringify(imageSuggestions),
      targetKeyword: primaryKeyword,
      intent,
      audience,
      tone,
      qualityScore: qualityChecks.overallScore,
      readabilityScore: qualityChecks.readabilityScore,
      status: "draft",
      revisionCount: config.reworkNotes ? 1 : 0,
    })
    .run();

  return {
    articleId,
    title,
    metaTitle,
    metaDescription,
    slug,
    h1,
    outline,
    bodyMarkdown,
    bodyHtml,
    frontMatter,
    suggestedInternalLinks,
    faqItems,
    imageSuggestions,
    schemaJsonLd,
    qualityChecks,
    estimatedWordCount,
  };
}

// ── Slug ──────────────────────────────────────────────────────────────

function generateSlug(topic: string, keyword: string): string {
  const base = keyword.length > 3 ? keyword : topic;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
}

// ── Title ─────────────────────────────────────────────────────────────

function generateTitle(topic: string, keyword: string, tone: string, reworkNotes?: string): string {
  const year = new Date().getFullYear();
  const templates: Record<string, string[]> = {
    professional: [
      `${cap(keyword)}: A Comprehensive Guide for ${year}`,
      `The Complete Guide to ${cap(keyword)} — What You Need to Know`,
      `${cap(topic)}: Best Practices and Expert Insights`,
    ],
    casual: [
      `Everything You Need to Know About ${cap(keyword)}`,
      `${cap(topic)} Made Simple: A Beginner-Friendly Guide`,
      `Why ${cap(keyword)} Matters (And How to Get It Right)`,
    ],
    technical: [
      `${cap(keyword)}: Technical Deep Dive and Implementation Guide`,
      `Understanding ${cap(topic)}: Architecture, Patterns, and Best Practices`,
      `${cap(keyword)} — A Technical Reference Guide`,
    ],
  };
  const pool = templates[tone] || templates.professional;
  // On rework, pick a different title variant
  const idx = reworkNotes ? (Date.now() % pool.length) : Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// ── Meta Description ──────────────────────────────────────────────────

function generateMetaDescription(topic: string, keyword: string, intent: string): string {
  const year = new Date().getFullYear();
  if (intent === "commercial") {
    return `Compare the best ${keyword.toLowerCase()} options in ${year}. Expert analysis, pricing, and recommendations to help you make the right choice.`;
  }
  if (intent === "transactional") {
    return `Get started with ${keyword.toLowerCase()} today. Step-by-step setup guide with pricing, features, and everything you need. Updated ${year}.`;
  }
  return `Learn about ${keyword.toLowerCase()} in this comprehensive guide. Discover best practices, key strategies, and expert tips for ${topic.toLowerCase()}. Updated for ${year}.`;
}

// ── Outline ───────────────────────────────────────────────────────────

function generateOutline(
  topic: string,
  keywords: string[],
  tone: string,
  targetWordCount: number,
  intent: string,
  reworkNotes?: string,
): Array<{ heading: string; summary: string; keyPoints: string[] }> {
  const sectionCount = Math.max(4, Math.min(8, Math.floor(targetWordCount / 250)));
  const kw = keywords.map((k) => cap(k));
  const year = new Date().getFullYear();

  const sections = [
    {
      heading: `What Is ${cap(topic)}?`,
      summary: `Define ${topic} and explain why it matters in today's landscape.`,
      keyPoints: [`Core definition of ${topic}`, `Why it's important in ${year}`, `Who benefits most from understanding ${topic}`],
    },
    {
      heading: `Key Benefits of ${kw[0] || cap(topic)}`,
      summary: `Explore the main advantages and positive outcomes.`,
      keyPoints: [`Improved efficiency and results`, `Competitive advantages`, `Long-term value and ROI`],
    },
    {
      heading: intent === "commercial"
        ? `How to Choose the Right ${cap(topic)} Solution`
        : `How to Get Started with ${cap(topic)}`,
      summary: `Step-by-step guide for ${intent === "commercial" ? "evaluating options" : "beginners"}.`,
      keyPoints: [`Prerequisites and setup`, `First steps to take`, `Common beginner mistakes to avoid`],
    },
    {
      heading: `Best Practices and ${tone === "technical" ? "Implementation Patterns" : "Proven Strategies"}`,
      summary: `Advanced techniques and proven approaches.`,
      keyPoints: [`Industry-proven methodologies`, `Optimization techniques`, `Measuring success and KPIs`],
    },
    {
      heading: `Common Mistakes to Avoid with ${cap(topic)}`,
      summary: `Pitfalls and how to sidestep them.`,
      keyPoints: [`Most frequent errors`, `How to identify problems early`, `Recovery strategies`],
    },
    {
      heading: kw[1] ? `${kw[1]} and Its Role in ${cap(topic)}` : `Advanced Tips for ${cap(topic)}`,
      summary: `Deeper exploration of related concepts.`,
      keyPoints: [`Connection to broader trends`, `Expert insights`, `Future outlook for ${year} and beyond`],
    },
    {
      heading: `Tools and Resources for ${cap(topic)}`,
      summary: `Recommended tools, platforms, and learning resources.`,
      keyPoints: [`Top tools to use`, `Free vs paid options`, `Learning resources and communities`],
    },
    {
      heading: `Conclusion: Your Next Steps`,
      summary: `Summarize key takeaways and actionable next steps.`,
      keyPoints: [`Key takeaways summary`, `Immediate action items`, `Long-term roadmap`],
    },
  ];

  // If rework notes mention structure changes, shuffle slightly
  if (reworkNotes?.toLowerCase().includes("more sections")) {
    return sections.slice(0, Math.min(8, sectionCount + 1));
  }

  return sections.slice(0, sectionCount);
}

// ── Body Generation ───────────────────────────────────────────────────

function generateBody(
  topic: string,
  keywords: string[],
  outline: Array<{ heading: string; summary: string; keyPoints: string[] }>,
  tone: string,
  targetWordCount: number,
  primaryKeyword: string,
  productContext?: string,
  reworkNotes?: string,
): string {
  const wordsPerSection = Math.floor(targetWordCount / outline.length);
  let md = "";

  // Ensure keyword appears in first paragraph
  md += `In the ever-evolving landscape of ${primaryKeyword.toLowerCase()}, staying ahead requires a solid understanding of ${topic.toLowerCase()}. `;
  md += `This guide covers everything you need to know about ${primaryKeyword.toLowerCase()}, from fundamentals to advanced strategies.\n\n`;

  for (let si = 0; si < outline.length; si++) {
    const section = outline[si];
    md += `## ${section.heading}\n\n`;
    md += `${section.summary}\n\n`;

    for (const point of section.keyPoints) {
      md += `### ${point}\n\n`;
      md += generateParagraph(point, topic, keywords, tone, Math.floor(wordsPerSection / section.keyPoints.length), primaryKeyword);
      md += "\n\n";
    }

    // Insert image placeholder at natural breaks
    if (si === 1 || si === Math.floor(outline.length / 2)) {
      md += `<!-- image: ${topic.toLowerCase()} illustration -->\n\n`;
    }

    // Insert product context mention in middle section if provided
    if (productContext && si === Math.floor(outline.length / 2)) {
      md += `> **Pro Tip:** ${productContext}\n\n`;
    }
  }

  // Add internal link placeholders
  md += `<!-- internal-links-placeholder -->\n`;

  return md.trim();
}

function generateParagraph(
  point: string,
  topic: string,
  keywords: string[],
  tone: string,
  targetWords: number,
  primaryKeyword: string,
): string {
  const kw = primaryKeyword;
  const year = new Date().getFullYear();

  const professionalSentences = [
    `When it comes to ${point.toLowerCase()}, understanding the fundamentals is essential for achieving measurable results.`,
    `${cap(kw)} plays a critical role in how effectively organizations approach ${topic.toLowerCase()} in ${year}.`,
    `Industry experts consistently emphasize ${point.toLowerCase()} as a foundation for sustainable growth and competitive advantage.`,
    `By focusing on ${point.toLowerCase()}, you position yourself ahead of competitors who overlook this crucial aspect.`,
    `Research shows that companies prioritizing ${point.toLowerCase()} see a significant improvement in their overall performance metrics.`,
    `To implement this effectively, start with a clear assessment of your current situation and identify gaps.`,
    `Best practices suggest taking an iterative approach — test, measure, and refine as you learn what delivers the best outcomes.`,
    `The relationship between ${kw.toLowerCase()} and ${point.toLowerCase()} has become increasingly important for strategic planning.`,
  ];

  const casualSentences = [
    `Let's talk about ${point.toLowerCase()} — it's one of those things that can really make or break your ${topic.toLowerCase()} game.`,
    `Here's the thing about ${kw.toLowerCase()}: getting ${point.toLowerCase()} right doesn't have to be complicated.`,
    `You'd be surprised how many people skip ${point.toLowerCase()}, and then wonder why they're not seeing results.`,
    `Think of ${point.toLowerCase()} as your foundation — everything else builds on top of it.`,
    `The good news? Once you nail ${point.toLowerCase()}, the rest starts falling into place naturally.`,
    `Start small, test what works, and scale up from there. That's the smart way to approach ${point.toLowerCase()}.`,
    `Don't overthink it — sometimes the simplest approach to ${point.toLowerCase()} is the most effective one.`,
  ];

  const technicalSentences = [
    `From a technical perspective, ${point.toLowerCase()} requires careful consideration of architecture, scalability, and performance trade-offs.`,
    `Implementing ${kw.toLowerCase()} for ${point.toLowerCase()} involves several key design decisions that impact long-term maintainability.`,
    `The technical stack for ${point.toLowerCase()} should be evaluated against specific criteria: latency, throughput, and fault tolerance.`,
    `When optimizing ${point.toLowerCase()}, consider profiling your current implementation to identify bottlenecks before making changes.`,
    `Best practices include modular design, comprehensive test coverage, and automated CI/CD pipelines for ${point.toLowerCase()}.`,
    `Reference implementations suggest a layered approach: data layer, business logic, and presentation, each with clear interfaces.`,
    `Monitoring and observability are non-negotiable for production-grade ${point.toLowerCase()} — instrument early and instrument often.`,
  ];

  const pool = tone === "casual" ? casualSentences
    : tone === "technical" ? technicalSentences
    : professionalSentences;

  const needed = Math.max(3, Math.floor(targetWords / 18));
  const selected: string[] = [];
  for (let i = 0; i < Math.min(needed, pool.length); i++) {
    selected.push(pool[i]);
  }
  // Pad if needed
  while (selected.join(" ").split(/\s+/).length < targetWords && selected.length < pool.length) {
    selected.push(pool[selected.length % pool.length]);
  }

  return selected.join(" ");
}

// ── Internal Links ────────────────────────────────────────────────────

function findInternalLinks(
  pages: Array<{ url: string; title: string | null; h1: string | null }>,
  keywords: string[],
  topic: string,
): Array<{ anchorText: string; targetUrl: string }> {
  const links: Array<{ anchorText: string; targetUrl: string }> = [];
  const usedUrls = new Set<string>();
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const lowerTopic = topic.toLowerCase();

  for (const page of pages) {
    if (links.length >= 5) break;
    const pageText = `${page.title || ""} ${page.h1 || ""}`.toLowerCase();

    for (const kw of lowerKeywords) {
      if (pageText.includes(kw) && !usedUrls.has(page.url)) {
        links.push({ anchorText: page.title || cap(kw), targetUrl: page.url });
        usedUrls.add(page.url);
        break;
      }
    }

    if (pageText.includes(lowerTopic) && !usedUrls.has(page.url) && links.length < 5) {
      links.push({ anchorText: page.title || cap(topic), targetUrl: page.url });
      usedUrls.add(page.url);
    }
  }

  return links.slice(0, 5);
}

// ── FAQ ───────────────────────────────────────────────────────────────

function generateFAQs(
  topic: string,
  keywords: string[],
  intent: string,
): Array<{ question: string; answer: string }> {
  const kw = keywords[0] || topic;
  const faqs = [
    {
      question: `What is ${topic.toLowerCase()}?`,
      answer: `${cap(topic)} refers to the strategies and techniques used to ${topic.toLowerCase()} effectively. It encompasses best practices, tools, and methodologies that help achieve measurable results.`,
    },
    {
      question: `Why is ${kw.toLowerCase()} important?`,
      answer: `${cap(kw)} is critical because it directly impacts your competitive position and long-term success. Organizations that invest in ${kw.toLowerCase()} consistently outperform those that don't.`,
    },
    {
      question: `How do I get started with ${topic.toLowerCase()}?`,
      answer: `Start by assessing your current situation, setting clear and measurable goals, and identifying the key areas where ${topic.toLowerCase()} can make the biggest impact. Then implement changes incrementally, testing and refining as you go.`,
    },
  ];

  if (intent === "commercial") {
    faqs.push({
      question: `How much does ${kw.toLowerCase()} cost?`,
      answer: `The cost of ${kw.toLowerCase()} varies widely depending on scope, tools, and whether you handle it in-house or hire experts. Basic solutions start free, while enterprise tools can range from $50 to $500+ per month.`,
    });
  }

  return faqs;
}

// ── Image Suggestions ─────────────────────────────────────────────────

function generateImageSuggestions(
  outline: Array<{ heading: string }>,
  topic: string,
  keyword: string,
): ImageSuggestion[] {
  const suggestions: ImageSuggestion[] = [
    {
      placement: "After introduction",
      altText: `${cap(keyword)} overview infographic`,
      description: `Hero image or infographic illustrating the key concepts of ${topic.toLowerCase()}`,
    },
  ];

  if (outline.length > 2) {
    suggestions.push({
      placement: `After "${outline[2].heading}"`,
      altText: `Step-by-step ${keyword.toLowerCase()} process diagram`,
      description: `Process flow or step-by-step diagram showing how to implement ${keyword.toLowerCase()}`,
    });
  }

  if (outline.length > 4) {
    suggestions.push({
      placement: `After "${outline[4].heading}"`,
      altText: `Common ${keyword.toLowerCase()} mistakes to avoid`,
      description: `Comparison chart or checklist showing common mistakes and how to avoid them`,
    });
  }

  return suggestions;
}

// ── Schema JSON-LD ────────────────────────────────────────────────────

function buildSchemaJsonLd(
  title: string,
  description: string,
  slug: string,
  faqItems: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: { "@type": "Organization", name: "TopRanq" },
    datePublished: new Date().toISOString().split("T")[0],
    dateModified: new Date().toISOString().split("T")[0],
  };

  if (faqItems.length > 0) {
    (schema as Record<string, unknown>)["mainEntity"] = faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    }));
  }

  return schema;
}

// ── Front Matter ──────────────────────────────────────────────────────

function buildFrontMatter(
  title: string,
  description: string,
  slug: string,
  primaryKeyword: string,
  keywords: string[],
  intent: string,
  audience: string,
): string {
  return `---
title: "${title}"
description: "${description}"
slug: "${slug}"
keywords: [${keywords.map((k) => `"${k}"`).join(", ")}]
primary_keyword: "${primaryKeyword}"
intent: "${intent}"
audience: "${audience}"
date: "${new Date().toISOString().split("T")[0]}"
---`;
}

// ── Markdown to HTML ──────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  let html = md;
  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  // Comments (remove)
  html = html.replace(/<!--.*?-->/g, "");
  // Paragraphs: wrap non-tag lines
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<[a-z]/.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join("\n");
  return html;
}

// ── Quality Checks ────────────────────────────────────────────────────

function runQualityChecks(
  title: string,
  h1: string,
  metaTitle: string,
  metaDescription: string,
  bodyMarkdown: string,
  primaryKeyword: string,
  internalLinks: Array<unknown>,
  faqItems: Array<unknown>,
  imageSuggestions: Array<unknown>,
): QualityChecks {
  const kwLower = primaryKeyword.toLowerCase();
  const bodyLower = bodyMarkdown.toLowerCase();
  const words = bodyMarkdown.split(/\s+/);
  const first100 = words.slice(0, 100).join(" ").toLowerCase();

  const kwCount = (bodyLower.match(new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const keywordDensity = Math.round((kwCount / words.length) * 100 * 10) / 10;

  const keywordInTitle = title.toLowerCase().includes(kwLower);
  const keywordInH1 = h1.toLowerCase().includes(kwLower);
  const keywordInFirst100Words = first100.includes(kwLower);

  const metaTitleLength = metaTitle.length;
  const metaDescLength = metaDescription.length;
  const hasInternalLinks = internalLinks.length > 0;
  const hasFaq = faqItems.length > 0;
  const hasImages = imageSuggestions.length > 0;

  // Readability: simple Flesch-like approximation
  const sentences = bodyMarkdown.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const readabilityScore = Math.max(0, Math.min(100,
    100 - (avgWordsPerSentence - 15) * 3
  ));

  // Overall score
  let score = 50;
  if (keywordInTitle) score += 10;
  if (keywordInH1) score += 5;
  if (keywordInFirst100Words) score += 10;
  if (keywordDensity >= 0.5 && keywordDensity <= 3) score += 5;
  if (metaTitleLength >= 30 && metaTitleLength <= 60) score += 5;
  if (metaDescLength >= 120 && metaDescLength <= 160) score += 5;
  if (hasInternalLinks) score += 5;
  if (hasFaq) score += 3;
  if (hasImages) score += 2;

  return {
    readabilityScore: Math.round(readabilityScore),
    keywordInTitle,
    keywordInH1,
    keywordInFirst100Words,
    keywordDensity,
    metaTitleLength,
    metaDescLength,
    hasInternalLinks,
    hasFaq,
    hasImages,
    overallScore: Math.min(100, score),
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
