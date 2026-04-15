import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { getGSCInsights } from "../gsc-intelligence";
import { analyzeCompetitors } from "../competitor-research";
import { generateFeaturedImageUrl, buildImagePrompt } from "../image-gen";
import { pickRelevantProducts } from "../product-cta";
import { fetchProductsFromDomain } from "../product-source";
import { composeProductHero } from "../product-composite";
async function askClaude(prompt: string, maxTokens = 4000): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-haiku",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export interface BlogWriterConfig {
  topic: string;
  keywords: string[];
  tone: "professional" | "casual" | "technical";
  wordCount: number;
  language?: string; // ISO language code or display name (defaults to English)
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
  featuredImageUrl: string;
  featuredImagePrompt: string;
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

  // ── GSC Intelligence: smart keyword selection from real search data ──
  const gsc = await getGSCInsights(domainId);
  let finalKeywords: string[];
  let gscContext = "";

  if (gsc.connected && gsc.keywords.length > 0) {
    // Use GSC to find the best keywords for this blog topic
    const bestKws = gsc.getBestKeywordsForBlog(config.topic, config.keywords);

    // Build final keyword list: primary → user keywords → GSC secondary → GSC long-tail
    const seen = new Set<string>();
    finalKeywords = [];

    // 1. GSC primary keyword (highest opportunity, real search data)
    if (bestKws.primary && bestKws.primary !== config.topic) {
      finalKeywords.push(bestKws.primary);
      seen.add(bestKws.primary.toLowerCase());
    }

    // 2. User-provided keywords
    for (const k of config.keywords) {
      if (!seen.has(k.toLowerCase())) {
        finalKeywords.push(k);
        seen.add(k.toLowerCase());
      }
    }

    // 3. GSC secondary keywords (high impression, different angles)
    for (const k of bestKws.secondary) {
      if (!seen.has(k.toLowerCase())) {
        finalKeywords.push(k);
        seen.add(k.toLowerCase());
      }
    }

    // 4. GSC long-tail keywords (4+ words, specific queries)
    for (const k of bestKws.longTail) {
      if (!seen.has(k.toLowerCase())) {
        finalKeywords.push(k);
        seen.add(k.toLowerCase());
      }
    }

    // Cap at 8 to avoid keyword stuffing
    finalKeywords = finalKeywords.slice(0, 8);

    // Build context for article sections
    const topicKws = gsc.topKeywordsForTopic(config.topic);
    const rankedQueries = topicKws.slice(0, 5).map((k) =>
      `"${k.query}" (${k.impressions} impressions, position ${k.position.toFixed(1)}, ${k.intent} intent)`
    );
    if (rankedQueries.length > 0) {
      gscContext = `\n\nGSC Search Data: This site ranks for: ${rankedQueries.join("; ")}. ` +
        `Primary target: "${bestKws.primary}". ` +
        (bestKws.relatedQueries.length > 0 ? `Related queries people also search: ${bestKws.relatedQueries.join(", ")}. ` : "") +
        `Use these naturally throughout the article — especially in headings, intro, and FAQ sections.`;
    }
  } else {
    finalKeywords = [...config.keywords];
  }

  const { topic, tone, wordCount } = config;
  const keywords = finalKeywords.length > 0 ? finalKeywords : [config.topic];
  const intent = config.intent || "informational";
  const audience = config.audience || "general";
  const primaryKeyword = keywords[0] || topic;

  const slug = generateSlug(topic, primaryKeyword);

  // ── Competitor Research: analyze what's ranking on Google ──
  const competitors = await analyzeCompetitors(primaryKeyword);
  const competitorBrief = competitors.contentBrief || "";
  const targetWordCount = competitors.avgWordCount > 500
    ? Math.round(competitors.avgWordCount * 1.2) // Write 20% more than competitors
    : wordCount;

  // ── AI-powered generation ──
  // Competitor titles for Claude to analyze and beat
  const competitorTitles = competitors.topResults.slice(0, 5).map((r) => r.title).filter(Boolean);
  const titleContext = competitorTitles.length > 0
    ? `\n\nCompetitor titles ranking on Google:\n${competitorTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\nWrite a title that's more compelling than ALL of these.`
    : "";

  const title = await generateTitleAI(topic, primaryKeyword, tone, intent, gscContext + titleContext);
  const metaTitle = title.length <= 60 ? title : title.slice(0, 57) + "...";
  const metaDescription = await generateMetaDescriptionAI(topic, primaryKeyword, intent, title);
  const h1 = title;

  const { outline, bodyMarkdown, faqItems } = await generateFullArticle(
    topic, keywords, tone, targetWordCount, intent, primaryKeyword,
    gscContext + (competitorBrief ? `\n\n${competitorBrief}` : ""),
    config.productContext, config.reworkNotes, config.language,
  );

  const suggestedInternalLinks = findInternalLinks(existingPages, keywords, topic);
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

  // Featured image:
  //   1) fetch product catalog from the domain,
  //   2) pick 5 products most relevant to this article,
  //   3) composite their photos into a single hero image.
  // If that fails, fall back to the Pollinations AI hero.
  const featuredImagePrompt = buildImagePrompt(metaTitle || title, config.topic, tone);
  let featuredImageUrl = generateFeaturedImageUrl(featuredImagePrompt);

  try {
    const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
    const domainUrl = domain?.domainUrl;
    if (domainUrl) {
      const products = await fetchProductsFromDomain(domainUrl);
      if (products.length > 0) {
        const picked = pickRelevantProducts(products, title, primaryKeyword, bodyMarkdown, 5);
        const imageUrls = picked.map((p) => p.imageUrl).filter(Boolean);
        if (imageUrls.length > 0) {
          const composite = await composeProductHero(imageUrls, `${slug}-${primaryKeyword}`);
          if (composite?.url) featuredImageUrl = composite.url;
        }
      }
    }
  } catch (err) {
    console.warn("[blog-writer] product hero composite failed:", err);
  }

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
      bodyMarkdown: bodyMarkdown,
      bodyHtml,
      faqSchemaJson: JSON.stringify(faqItems),
      schemaJsonLd: JSON.stringify(schemaJsonLd),
      internalLinksJson: JSON.stringify(suggestedInternalLinks),
      imageSuggestionsJson: JSON.stringify(imageSuggestions),
      featuredImageUrl,
      featuredImagePrompt,
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
    bodyMarkdown: bodyMarkdown,
    bodyHtml,
    frontMatter,
    suggestedInternalLinks,
    faqItems,
    imageSuggestions,
    featuredImageUrl,
    featuredImagePrompt,
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

// ── AI-Powered Title ──────────────────────────────────────────────────

async function generateTitleAI(topic: string, keyword: string, tone: string, intent: string, gscContext: string): Promise<string> {
  const prompt = `Generate ONE blog post title for this topic.

Today's date: ${new Date().toISOString().split("T")[0]}. Current year: ${new Date().getFullYear()}.

Topic: ${topic}
Primary keyword: ${keyword}
Tone: ${tone}
Intent: ${intent}
${gscContext}

Rules:
- 50-60 characters max
- Include the primary keyword near the beginning
- Make it compelling and click-worthy
- No generic titles like "Complete Guide to..." unless truly appropriate
- Match the search intent (informational = how-to/guide, commercial = comparison/best, transactional = setup/get started)
- If including a year, use ${new Date().getFullYear()} — NEVER 2024 or 2025

Return ONLY the title, nothing else.`;

  return (await askClaude(prompt, 100)).replace(/^["']|["']$/g, "").trim();
}

// ── AI-Powered Meta Description ──────────────────────────────────────

async function generateMetaDescriptionAI(topic: string, keyword: string, intent: string, title: string): Promise<string> {
  const prompt = `Write a meta description for this blog post.

Title: ${title}
Topic: ${topic}
Primary keyword: ${keyword}
Intent: ${intent}

Rules:
- 150-160 characters max
- Include the primary keyword naturally
- Include a clear value proposition
- End with a subtle call-to-action or hook
- Don't start with "Learn about" or "Discover"

Return ONLY the meta description, nothing else.`;

  return (await askClaude(prompt, 200)).replace(/^["']|["']$/g, "").trim();
}

// ── AI-Powered Full Article Generation ───────────────────────────────

async function generateFullArticle(
  topic: string,
  keywords: string[],
  tone: string,
  targetWordCount: number,
  intent: string,
  primaryKeyword: string,
  gscContext: string,
  productContext?: string,
  reworkNotes?: string,
  language?: string,
): Promise<{
  outline: Array<{ heading: string; summary: string; keyPoints: string[] }>;
  bodyMarkdown: string;
  faqItems: Array<{ question: string; answer: string }>;
}> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString("en-US", { month: "long" });

  const languageInstruction = language && language !== "English" && language !== "en"
    ? `\nLANGUAGE: Write the ENTIRE article (title, headings, body, FAQ, everything) in ${language}. Do NOT use English. All output must be native ${language}.\n`
    : "";

  const prompt = `You are an expert SEO content writer. Write a complete, high-quality blog article.

IMPORTANT: Today's date is ${currentMonth} ${currentDate.getDate()}, ${currentYear}. Use ${currentYear} as the current year throughout the article. NEVER reference 2024 or any past year as the current year.
${languageInstruction}
TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
SECONDARY KEYWORDS: ${keywords.slice(1).join(", ")}
TONE: ${tone}
INTENT: ${intent}
TARGET WORD COUNT: ${targetWordCount}
${gscContext}
${productContext ? `PRODUCT CONTEXT: ${productContext}` : ""}
${reworkNotes ? `REVISION NOTES: ${reworkNotes}` : ""}

INSTRUCTIONS:
1. Write a complete blog article in markdown format
2. Use ## for main headings and ### for subheadings
3. Include the primary keyword in the first paragraph, at least 2 headings, and naturally throughout
4. Include secondary keywords naturally — don't force them
5. Write substantive, unique content — no filler sentences like "in today's fast-paced world"
6. Include specific examples, data points, or actionable advice
7. Use bullet points or numbered lists where appropriate
8. Write for real humans, not search engines — be genuinely helpful
9. Match the tone: ${tone === "casual" ? "conversational, friendly, use contractions" : tone === "technical" ? "precise, detailed, use technical terms" : "authoritative, clear, balanced"}
10. End with a strong conclusion that summarizes key takeaways
11. Any year references must use ${currentYear} — NEVER use 2024 or 2025

After the article, add this section:
---FAQ_START---
Write 3-4 FAQ items as JSON array: [{"question":"...","answer":"..."}]
Each answer should be 2-3 sentences, genuinely useful.
---FAQ_END---

After FAQ, add:
---OUTLINE_START---
Write the outline as JSON array: [{"heading":"...","summary":"...","keyPoints":["...","...","..."]}]
Extract from the headings you actually used in the article.
---OUTLINE_END---

Write the article now. Make it ${targetWordCount} words. Be specific, original, and valuable.`;

  const response = await askClaude(prompt, Math.max(4000, Math.floor(targetWordCount * 2)));

  // Parse the response
  let bodyMarkdown = response;
  let faqItems: Array<{ question: string; answer: string }> = [];
  let outline: Array<{ heading: string; summary: string; keyPoints: string[] }> = [];

  // Extract FAQ
  const faqMatch = response.match(/---FAQ_START---([\s\S]*?)---FAQ_END---/);
  if (faqMatch) {
    bodyMarkdown = bodyMarkdown.replace(/---FAQ_START---[\s\S]*?---FAQ_END---/, "").trim();
    try {
      const jsonStr = faqMatch[1].trim().replace(/```json\n?/g, "").replace(/```/g, "").trim();
      faqItems = JSON.parse(jsonStr);
    } catch {
      faqItems = [
        { question: `What is ${topic}?`, answer: `${cap(topic)} is a key concept that encompasses strategies and best practices for achieving results in this domain.` },
        { question: `Why is ${primaryKeyword} important?`, answer: `${cap(primaryKeyword)} directly impacts your success by improving efficiency, visibility, and outcomes.` },
        { question: `How do I get started with ${topic}?`, answer: `Start by understanding the fundamentals, then implement step-by-step following the practices outlined in this guide.` },
      ];
    }
  }

  // Extract outline
  const outlineMatch = response.match(/---OUTLINE_START---([\s\S]*?)---OUTLINE_END---/);
  if (outlineMatch) {
    bodyMarkdown = bodyMarkdown.replace(/---OUTLINE_START---[\s\S]*?---OUTLINE_END---/, "").trim();
    try {
      const jsonStr = outlineMatch[1].trim().replace(/```json\n?/g, "").replace(/```/g, "").trim();
      outline = JSON.parse(jsonStr);
    } catch {
      // Extract outline from headings in the article
      outline = extractOutlineFromMarkdown(bodyMarkdown);
    }
  } else {
    outline = extractOutlineFromMarkdown(bodyMarkdown);
  }

  return { outline, bodyMarkdown, faqItems };
}

function extractOutlineFromMarkdown(md: string): Array<{ heading: string; summary: string; keyPoints: string[] }> {
  const headings = md.match(/^## .+$/gm) || [];
  return headings.map((h) => {
    const heading = h.replace(/^## /, "");
    return { heading, summary: "", keyPoints: [] };
  });
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

// (FAQ generation is now handled by AI in generateFullArticle)

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
    author: { "@type": "Organization", name: "Ranqapex" },
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
