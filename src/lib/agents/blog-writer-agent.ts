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

  // Fallback chain: Opus → Sonnet → Haiku. If a model fails (402 credits, etc.), try the next.
  const models = [
    process.env.OPENROUTER_MODEL_OPUS,
    process.env.OPENROUTER_MODEL_SONNET,
    process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku",
  ].filter(Boolean) as string[];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        console.warn(`[blog-writer] ${model} failed (${res.status}), trying next model...`, err.slice(0, 150));
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Reject truncated responses — if content is too short, the model likely ran out of credits mid-response
      const wordCount = content.split(/\s+/).length;
      if (wordCount < 300 && maxTokens > 2000) {
        console.warn(`[blog-writer] ${model} returned only ${wordCount} words (expected ${maxTokens / 2}+), trying next model...`);
        continue;
      }

      // Reject "continued in next reply" patterns — model thinks it's in a conversation
      if (/\(continued|to be continued|next reply|will continue\)/i.test(content)) {
        console.warn(`[blog-writer] ${model} returned partial response with continuation marker, trying next model...`);
        continue;
      }

      return content;
    } catch (err) {
      console.warn(`[blog-writer] ${model} threw error, trying next:`, (err as Error).message);
      continue;
    }
  }

  throw new Error("All AI models failed — check OpenRouter credits and API key");
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

  // ── Load product catalog for inline product weaving ──
  let productCatalog = "";
  try {
    const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
    const domainUrl = domain?.domainUrl;

    // Try DB products first (CSV import), then auto-fetch from store
    let products = db.select().from(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).all();
    if (products.length === 0 && domainUrl) {
      const fetched = await fetchProductsFromDomain(domainUrl);
      if (fetched.length > 0) {
        products = fetched.map((p) => ({
          id: "", domainId, createdAt: null,
          name: p.name, url: p.url, price: p.price || null,
          description: p.description || null, category: p.category || null,
          imageUrl: p.imageUrl,
        }));
      }
    }

    if (products.length > 0) {
      // Pick products relevant to the topic + build catalog string
      const topicLower = `${topic} ${keywords.join(" ")}`.toLowerCase();
      const scored = products.map((p) => {
        const pText = `${p.name} ${p.description || ""} ${p.category || ""}`.toLowerCase();
        const words = pText.split(/\s+/).filter((w) => w.length > 3);
        const matches = words.filter((w) => topicLower.includes(w)).length;
        return { ...p, score: matches };
      }).sort((a, b) => b.score - a.score);

      const topProducts = scored.slice(0, 20);
      productCatalog = topProducts.map((p, i) =>
        `${i + 1}. ${p.name}${p.price ? ` — ${p.price}` : ""}${p.category ? ` [${p.category}]` : ""}\n   URL: ${p.url || "N/A"}${p.imageUrl ? `\n   Image: ${p.imageUrl}` : ""}${p.description ? `\n   ${p.description.slice(0, 120)}` : ""}`
      ).join("\n");
    }
  } catch (err) {
    console.warn("[blog-writer] product catalog load failed:", err);
  }

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
    productCatalog, config.reworkNotes, config.language,
  );

  // Post-process: hyperlink any product names mentioned in the article
  const linkedMarkdown = hyperlinkProducts(bodyMarkdown, domainId);

  const suggestedInternalLinks = findInternalLinks(existingPages, keywords, topic);
  const imageSuggestions = generateImageSuggestions(outline, topic, primaryKeyword);
  const estimatedWordCount = linkedMarkdown.split(/\s+/).length;

  // Build HTML from markdown
  const bodyHtml = markdownToHtml(linkedMarkdown);

  // Build JSON-LD schema
  const schemaJsonLd = buildSchemaJsonLd(title, metaDescription, slug, faqItems);

  // Build front matter
  const frontMatter = buildFrontMatter(title, metaDescription, slug, primaryKeyword, keywords, intent, audience);

  // Quality checks
  const qualityChecks = runQualityChecks(
    title, h1, metaTitle, metaDescription, linkedMarkdown,
    primaryKeyword, suggestedInternalLinks, faqItems, imageSuggestions
  );

  // Featured image:
  //   1) fetch product catalog from the domain,
  //   2) pick 5 products most relevant to this article,
  //   3) composite their photos into a single hero image.
  // If that fails, fall back to the Pollinations AI hero.
  const featuredImagePrompt = buildImagePrompt(metaTitle || title, config.topic, tone);
  let featuredImageUrl = await generateFeaturedImageUrl(featuredImagePrompt);

  try {
    const domain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get();
    const domainUrl = domain?.domainUrl;
    if (domainUrl) {
      const products = await fetchProductsFromDomain(domainUrl);
      if (products.length > 0) {
        const picked = pickRelevantProducts(products, title, primaryKeyword, linkedMarkdown, 5);
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
      bodyMarkdown: linkedMarkdown,
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
    bodyMarkdown: linkedMarkdown,
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

  const hasProducts = productContext && productContext.trim().length > 20;

  const productInstructions = hasProducts ? `
PRODUCT CATALOG (use these as contextual recommendations in the article):
${productContext}

PRODUCT INTEGRATION RULES (CRITICAL):
- Weave 5-15 relevant products NATURALLY throughout the article as contextual solutions
- Pattern: explain a concept or problem → recommend a product as the solution → link it
- Format each product mention as: [Product Name](product-url) — include price if available
- After introducing a product, add its image on the next line: ![Product Name](image-url)
- Spread products across different sections — never cluster them all in one place
- Each product mention must be EARNED by the preceding paragraph (explain WHY this product fits)
- Products should feel like helpful recommendations within a teaching context, NOT a product listing
- BAD: "Here are some products you might like: Product A, Product B, Product C"
- GOOD: "For the base layer, a fitted turtleneck creates a clean silhouette. The [Slim Turtleneck in Black](url) ($49) works well here because its stretch fabric stays flat under a blazer."
- Only recommend products that are genuinely relevant to the section topic
- If fewer than 5 products are relevant, use only the relevant ones — never force a product
` : "";

  const prompt = `You are an expert editorial content writer who creates articles that teach and recommend products naturally.

CRITICAL: Output the FULL article immediately. Do NOT ask clarifying questions, request confirmation, or say "before I begin". Start writing from the first line. Single-shot generation — no human in the loop.

Today's date is ${currentMonth} ${currentDate.getDate()}, ${currentYear}. Use ${currentYear} as the current year. NEVER reference past years as current.
${languageInstruction}
TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
SECONDARY KEYWORDS: ${keywords.slice(1).join(", ")}
TONE: ${tone === "casual" ? "conversational, friendly, directive — like a knowledgeable friend giving advice" : tone === "technical" ? "precise, detailed, expert-level — like a specialist writing a guide" : "clear, authoritative, approachable — like an editorial magazine piece"}
INTENT: ${intent}
TARGET WORD COUNT: ${targetWordCount}
${gscContext}
${reworkNotes ? `REVISION NOTES: ${reworkNotes}` : ""}
${productInstructions}
ARTICLE STRUCTURE:
1. Start with a ## heading immediately — no preamble
2. Opening paragraph: 2-3 sentences that hook the reader and establish what they'll learn
3. Body: 6-10 sections, each following this pattern:
   - ## Heading (keyword-rich, sounds like something a user would search for)
   - Teach a concept, rule, or technique (2-3 short paragraphs, 2-4 sentences each)
   - ${hasProducts ? "Where relevant, recommend a specific product as a solution with [Product Name](url) link and image" : "Include specific examples or actionable advice"}
4. Keep paragraphs SHORT: 2-4 sentences max. Scannable. No walls of text.
5. Use bullet points and numbered lists for steps, comparisons, or feature lists
6. End with a strong conclusion summarizing key takeaways

WRITING RULES:
- Write like an expert editorial piece, not a generic SEO article
- Be directive: "Use this", "Try this", "The key is" — not "You might consider"
- Include specific details: numbers, measurements, comparisons, examples
- Primary keyword in: first paragraph, at least 2 headings, conclusion
- Secondary keywords woven naturally — never forced
- NEVER use filler: "in today's fast-paced world", "it's no secret that"
- NEVER use meta-commentary: "I'll write about...", "Let me clarify..."
- NEVER use hedging: "may", "might", "potentially", "could be"
- All year references must use ${currentYear}

After the article, add:
---FAQ_START---
[{"question":"...", "answer":"..."}] (4-6 items, 2-3 sentence answers)
---FAQ_END---

---OUTLINE_START---
[{"heading":"...", "summary":"...", "keyPoints":["...","...","..."]}]
---OUTLINE_END---

BEGIN NOW — first line must be a ## heading.`;

  // 1 word ≈ 1.5 tokens. Article + FAQ JSON + outline JSON need headroom.
  const estimatedTokens = Math.ceil(targetWordCount * 1.5) + 2000;
  // Cap at 7000 to stay within OpenRouter free-tier per-request limits
  const response = await askClaude(prompt, Math.min(7000, Math.max(4000, estimatedTokens)));

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

/**
 * Post-process: scan the article for product name mentions and convert them
 * to markdown hyperlinks [Product Name](product-url). Skips names that are
 * already inside an existing markdown link. Each product is linked only once
 * (first occurrence) to avoid over-linking.
 */
function hyperlinkProducts(markdown: string, domainId: string): string {
  const products = db
    .select()
    .from(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, domainId))
    .all()
    .filter((p) => p.url && p.name && p.name.length > 3);

  if (products.length === 0) return markdown;

  // Sort by name length descending so longer names match first
  // (e.g. "Slim Fit Turtleneck Black" before "Turtleneck")
  const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
  const linked = new Set<string>();
  let result = markdown;

  for (const product of sorted) {
    if (linked.has(product.name)) continue;

    // Escape regex special chars in product name
    const escaped = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match product name NOT already inside a markdown link [...](...)
    // Negative lookbehind for [ and negative lookahead for ](
    const regex = new RegExp(
      `(?<!\\[)\\b(${escaped})\\b(?!\\]\\()`,
      "i",
    );

    const match = result.match(regex);
    if (match && match.index !== undefined) {
      const before = result.slice(0, match.index);
      const after = result.slice(match.index + match[0].length);
      // Don't link inside headings (lines starting with #)
      const lineStart = before.lastIndexOf("\n") + 1;
      const line = before.slice(lineStart);
      if (line.trimStart().startsWith("#")) continue;

      result = `${before}[${match[0]}](${product.url})${after}`;
      linked.add(product.name);
    }
  }

  return result;
}
