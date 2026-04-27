import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { getGSCInsights } from "../gsc-intelligence";
import { analyzeCompetitors } from "../competitor-research";
import { generateFeaturedImageUrl, buildImagePrompt } from "../image-gen";
import { pickRelevantProducts } from "../product-cta";
import { fetchProductsFromDomain } from "../product-source";
import { composeProductHero } from "../product-composite";
async function askClaude(prompt: string, maxTokens = 4000, preferredModel?: "sonnet" | "opus"): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  // Model selection based on plan: opus for $5, sonnet for $1/free
  const models = preferredModel === "opus"
    ? [
        process.env.OPENROUTER_MODEL_OPUS,
        process.env.OPENROUTER_MODEL_SONNET,
        "google/gemini-2.5-flash",
      ].filter(Boolean) as string[]
    : [
        process.env.OPENROUTER_MODEL_SONNET,
        "google/gemini-2.5-flash",
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
        const errText = await res.text().catch(() => "");
        const status = res.status;
        if (status === 402) console.warn(`[blog-writer] ${model} — insufficient credits or free-tier limit. Trying next...`);
        else if (status === 429) console.warn(`[blog-writer] ${model} — rate limited. Trying next...`);
        else if (status === 401) console.warn(`[blog-writer] ${model} — invalid API key. Trying next...`);
        else console.warn(`[blog-writer] ${model} failed (${status}), trying next...`, errText.slice(0, 150));
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

  throw new Error("Article generation failed — all AI models returned errors. Please check your OpenRouter API key and credit balance at openrouter.ai/settings");
}

export interface BlogWriterConfig {
  topic: string;
  keywords: string[];
  tone: "professional" | "casual" | "technical";
  preferredModel?: "sonnet" | "opus";
  wordCount: number;
  language?: string;
  intent?: string;
  audience?: string;
  competitorUrls?: string[];
  productContext?: string;
  reworkNotes?: string;
  pillarClusterContext?: {
    pillarTitle: string;
    pillarSlug: string;
    isPillarArticle: boolean;
    clusters: Array<{ topic: string; slug: string; hasArticle: boolean }>;
  };
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
      // Pick products ONLY if they're genuinely relevant to the article topic.
      // A fashion product in an SEO software article = spam. Skip entirely if no match.
      const topicLower = `${topic} ${keywords.join(" ")}`.toLowerCase();
      const scored = products.map((p) => {
        const pText = `${p.name} ${p.description || ""} ${p.category || ""}`.toLowerCase();
        const words = pText.split(/\s+/).filter((w) => w.length > 3);
        const matches = words.filter((w) => topicLower.includes(w)).length;
        return { ...p, score: matches };
      }).sort((a, b) => b.score - a.score);

      // Only include products that actually match the topic (score > 0)
      const relevant = scored.filter((p) => p.score > 0);

      // If fewer than 3 products match, the topic probably doesn't relate to the catalog — skip entirely
      if (relevant.length >= 3) {
        const topProducts = relevant.slice(0, 15);
        productCatalog = topProducts.map((p, i) =>
          `${i + 1}. ${p.name}${p.price ? ` — ${p.price}` : ""}${p.category ? ` [${p.category}]` : ""}\n   URL: ${p.url || "N/A"}${p.imageUrl ? `\n   Image: ${p.imageUrl}` : ""}${p.description ? `\n   ${p.description.slice(0, 120)}` : ""}`
        ).join("\n");
      }
      // If < 3 match, productCatalog stays empty → no product integration in this article
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
    productCatalog, config.pillarClusterContext,
    config.reworkNotes, config.language, config.preferredModel,
  );

  // Post-process: hyperlink any product names mentioned in the article
  const linkedMarkdown = await hyperlinkProducts(bodyMarkdown, domainId);

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
  // Hero image: always AI-generated editorial lifestyle photo.
  // Product photos belong INLINE in the article body (from CSV CDN URLs), not as the hero.
  const featuredImagePrompt = buildImagePrompt(metaTitle || title, config.topic, tone, config.language);
  const featuredImageUrl = await generateFeaturedImageUrl(featuredImagePrompt, config.language);

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
  const prompt = `Optimize this blog post title for SEO while keeping its original meaning.

Today's date: ${new Date().toISOString().split("T")[0]}. Current year: ${new Date().getFullYear()}.

Original topic/title: ${topic}
Primary keyword: ${keyword}
Tone: ${tone}
Intent: ${intent}
${gscContext}

Rules:
- KEEP the core topic the same — do NOT change the subject matter
- The title must still be about "${topic}" — just make it more compelling
- 50-60 characters max
- Include the primary keyword near the beginning
- If the original topic is already good (under 60 chars, has keyword), use it as-is or with minor tweaks only
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
  pillarClusterCtx?: BlogWriterConfig["pillarClusterContext"],
  reworkNotes?: string,
  language?: string,
  preferredModel?: "sonnet" | "opus",
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
PRODUCT CATALOG (these products are topically relevant to this article):
${productContext}

PRODUCT INTEGRATION RULES (CRITICAL):
- Weave relevant products NATURALLY as contextual recommendations within the teaching
- Pattern: explain a concept → recommend a specific product as the solution
- DISPLAY FORMAT for each product recommendation (use this EXACT format):

👉 **[Product Name](product-url)** — Price

![Product Name](image-url)

Brief 1-sentence description of why this product fits this section.

- Spread products across sections — maximum 2-3 products per section
- Each product must be EARNED: the preceding paragraph explains WHY this product fits
- ONLY recommend products that genuinely solve a problem discussed in that section
- When listing multiple products for one category, use this format:

**Our picks:**

- 👉 **[Product 1](url)** — Price — One-line reason
- 👉 **[Product 2](url)** — Price — One-line reason

ABSOLUTE RULES:
- NEVER use metaphors to justify a product
- NEVER recommend a product that doesn't directly relate to the section's topic
- NEVER force a product — if a section doesn't naturally need one, skip it
- Products must match the article's domain (fashion products in fashion articles only)
` : "";

  const isPillar = targetWordCount >= 2500;
  const articleType = isPillar ? "PILLAR ARTICLE" : "CLUSTER ARTICLE";
  const wordRange = isPillar ? "2,200–2,800 words (DO NOT exceed 3,000)" : "1,200–1,600 words (DO NOT exceed 1,800)";

  const prompt = `You are an expert SEO content strategist and editorial writer. Generate a production-ready blog article with STRICT adherence to professional standards.

CRITICAL: Output ONLY clean publishable markdown. No JSON, no markers, no metadata. Start with ## heading. Article ends at the conclusion — nothing after it.

Today's date is ${currentMonth} ${currentDate.getDate()}, ${currentYear}. Use ${currentYear} only.
${languageInstruction}

═══ ARTICLE SPECIFICATION ═══

ARTICLE TYPE: ${articleType}
TARGET LENGTH: ${wordRange}
TOPIC: ${topic}
PRIMARY KEYWORD: ${primaryKeyword}
SECONDARY KEYWORDS: ${keywords.slice(1).join(", ")}
TONE: ${tone === "casual" ? "conversational, friendly, directive" : tone === "technical" ? "precise, detailed, expert-level" : "clear, authoritative, approachable — editorial magazine quality"}
INTENT: ${intent}
${gscContext}
${reworkNotes ? `REVISION NOTES: ${reworkNotes}` : ""}
${productInstructions}

═══ STRUCTURE (MANDATORY) ═══

## Title (SEO-optimized, under 60 characters)

### Introduction (100–150 words)
- Hook the reader with a specific problem, question, or bold statement
- Mention the primary keyword naturally in the first sentence
- End with a bullet list: "**Dans ce guide, vous allez apprendre :**" (or English equivalent)
  - 3-4 concrete learning objectives as bullets

### Body Sections (${isPillar ? "8-12" : "5-7"} sections)
Each section MUST:
- Start with ## heading (keyword-rich, searchable phrase)
- Use ### for numbered sub-points (e.g. "### 1) Base layer", "### 2) Mid layer")
- Be 100–200 words (NOT more)
- Paragraphs: 1-3 sentences MAX. One idea per paragraph.
- Use bullet points aggressively — at least one bullet list per section
- Use **bold** for key terms at the start of bullets
- Include actionable insights, specific data, or examples

${hasProducts ? `### Product Integration
- Display products using the 👉 emoji format specified above
- Add product image after each recommendation
- Each product must be EARNED by the preceding paragraph
- Only include products relevant to the section topic` : ""}

### Pro Tips & Mistakes
- Include 2-3 "> **💡 Astuce :**" (or "> **Pro Tip:**") blockquotes spread through the article
- Add a "## Erreurs à éviter" (or "## Common Mistakes") section with numbered list
- Each mistake: ### heading + 2-3 sentence explanation

### Conclusion (80–120 words)
- Summarize 3-5 key takeaways as **bold** bullet points
- Include a soft CTA or next step
- Mention primary keyword naturally

═══ FORMATTING RULES ═══

MARKDOWN:
- ## for main sections, ### for numbered sub-points and subsections
- Never use # (title) or #### (too deep)
- --- separator between major sections (creates visual breathing room)
- Blank line between EVERY paragraph, list, and section — NO exceptions

READABILITY (THIS IS THE #1 PRIORITY):
- Paragraphs: 1-3 sentences MAXIMUM. One idea per paragraph. Break aggressively.
- A paragraph of 4+ sentences = FAIL. Split it.
- Short punchy sentences mixed with one longer one
- Active voice, directive tone: "Use this", "Start with", "Choose"
- Grade level: 6-8

LISTS (USE LIBERALLY):
- Bullet points (-) for features, tips, characteristics, criteria
- Numbered lists (1. 2. 3.) for steps, sequences, rules
- **Bold key term** at start of each bullet, followed by explanation
- 1 line per bullet max
- At least ONE bullet list per section — no section should be all paragraphs
- Checklists and criteria lists make content scannable

EMPHASIS:
- **Bold** key terms, product names, important concepts
- > Blockquotes for pro tips: "> **💡 Astuce :**" or "> **Pro Tip:**"
- 👉 emoji for product recommendations
- NO walls of text anywhere — if you see 5+ lines without a break, split it

LINKS & IMAGES:
- [Natural keyword-rich anchor text](url) — never "click here" or "read more"
- Minimum 3 words per anchor
- Product images: ![Descriptive alt](url) — blank line before and after
- Product images should appear right after the product recommendation

═══ QUALITY CONSTRAINTS (STRICT) ═══

- NO fluff: "in today's world", "it's no secret", "without further ado"
- NO meta-commentary: "I'll explain", "let me clarify", "in this article"
- NO hedging: "may", "might", "potentially", "could be"
- NO repetition — every paragraph must add new value
- NO exceeding word limit — ${wordRange}
- Be directive: "Use this", "Start with", "The key is"
- Include specific numbers, measurements, prices, comparisons
- Primary keyword in: first paragraph, 2+ headings, conclusion
- Year references: ${currentYear} only

═══ OUTPUT RULES (ABSOLUTE) ═══

- Output ONLY the article in clean markdown
- Do NOT add JSON, metadata, outlines, FAQ arrays, or any structured data
- Do NOT add ---FAQ_START---, ---OUTLINE_START---, or ANY markers
- The article ENDS at the conclusion — NOTHING after it
- The output must be EXACTLY what appears on a published blog

═══ FINAL VALIDATION ═══

Before returning, verify:
□ Word count is within ${wordRange}
□ Heading hierarchy: ## then ### (no skipping)
□ Introduction is 120-180 words with "What you'll learn"
□ Each body section is 120-250 words
□ Conclusion is 100-150 words with bold takeaways
□ Internal links correctly placed
□ No paragraph exceeds 4 sentences
□ No fluff, no repetition, no hedging
□ No JSON or markers anywhere in the output
□ Article ends cleanly at the conclusion

BEGIN NOW — first line must be a ## heading.`;

  // 1 word ≈ 1.5 tokens. Article + FAQ JSON + outline JSON need headroom.
  const estimatedTokens = Math.ceil(targetWordCount * 1.5) + 2000;
  const response = await askClaude(prompt, Math.max(4000, estimatedTokens), preferredModel);

  // The article is now CLEAN — no markers, no JSON, just publishable markdown.
  // Strip any accidental markers the AI might still add (safety net).
  let bodyMarkdown = response
    .replace(/-+\s*(?:FAQ|OUTLINE|END)[_\s]*(?:START|END|FAQ|OUTLINE)\s*-+/gi, "")
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/\[\{\"(?:question|heading)\"[\s\S]*?\}\]/g, "")
    .trim();

  // Generate FAQ separately (fast, small call)
  let faqItems: Array<{ question: string; answer: string }> = [];
  try {
    const faqResponse = await askClaude(
      `Based on this article topic: "${topic}" (primary keyword: "${primaryKeyword}"), generate 4-6 FAQ items. Return ONLY a JSON array, no other text:\n[{"question":"...","answer":"..."}]`,
      500,
    );
    const faqJson = faqResponse.match(/\[[\s\S]*\]/);
    if (faqJson) faqItems = JSON.parse(faqJson[0]);
  } catch {
    faqItems = [
      { question: `What is ${topic}?`, answer: `${cap(topic)} encompasses key strategies and best practices for achieving results in this domain.` },
      { question: `Why is ${primaryKeyword} important?`, answer: `${cap(primaryKeyword)} directly impacts success by improving efficiency, visibility, and outcomes.` },
    ];
  }

  // Extract outline from the article's actual headings (no AI call needed)
  const outline = extractOutlineFromMarkdown(bodyMarkdown);

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
  const { marked } = require("marked");
  marked.setOptions({ breaks: true, gfm: true });
  return marked.parse(md) as string;
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
/**
 * Post-process: scan the article for product name mentions, convert them
 * to hyperlinks [Product Name](url), and insert product images below.
 * - Products WITH CDN images from CSV → use the CDN image
 * - Products WITHOUT CDN images → generate a lifestyle image with Nano Banana
 * Each product is linked + imaged only once (first occurrence).
 */
async function hyperlinkProducts(markdown: string, domainId: string): Promise<string> {
  const products = db
    .select()
    .from(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, domainId))
    .all()
    .filter((p) => p.url && p.name && p.name.length > 3);

  if (products.length === 0) return markdown;

  const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
  const linked = new Set<string>();
  let result = markdown;
  let generatedImages = 0;

  for (const product of sorted) {
    if (linked.has(product.name)) continue;

    const escaped = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<!\\[)\\b(${escaped})\\b(?!\\]\\()`,
      "i",
    );

    const match = result.match(regex);
    if (match && match.index !== undefined) {
      const before = result.slice(0, match.index);
      const after = result.slice(match.index + match[0].length);
      const lineStart = before.lastIndexOf("\n") + 1;
      const line = before.slice(lineStart);
      if (line.trimStart().startsWith("#")) continue;

      // Build the linked text + image
      const linkText = `[${match[0]}](${product.url})`;
      let imageMarkdown = "";

      if (product.imageUrl) {
        // Use CDN image from CSV
        imageMarkdown = `\n\n![${product.name}](${product.imageUrl})`;
      } else if (generatedImages < 3) {
        // Generate a lifestyle image (limit to 3 per article for cost/speed)
        try {
          // Get domain language for cultural context in generated images
          const domainLang = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get()?.language;
          const imageUrl = await generateFeaturedImageUrl(
            `Person wearing or using ${product.name}, lifestyle editorial photography, natural setting, magazine quality`,
            domainLang || undefined,
          );
          if (imageUrl) {
            imageMarkdown = `\n\n![${product.name}](${imageUrl})`;
            generatedImages++;
          }
        } catch {
          // Skip image generation failure silently
        }
      }

      // Find the end of the current paragraph to insert image after it
      const afterMatch = result.slice(match.index + match[0].length);
      const paragraphEnd = afterMatch.indexOf("\n\n");
      if (paragraphEnd !== -1 && imageMarkdown) {
        const beforeParagraphEnd = result.slice(0, match.index + match[0].length + paragraphEnd);
        const afterParagraphEnd = result.slice(match.index + match[0].length + paragraphEnd);
        result = `${before}${linkText}${afterMatch.slice(0, paragraphEnd)}${imageMarkdown}${afterParagraphEnd}`;
      } else {
        result = `${before}${linkText}${imageMarkdown}${after}`;
      }

      linked.add(product.name);
    }
  }

  return result;
}
