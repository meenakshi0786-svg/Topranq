import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export interface ProductInfuserConfig {
  products: Array<{
    name: string;
    url: string;
    price: string;
    description: string;
    category: string;
  }>;
}

export interface ProductLink {
  articleId: string;
  articleTitle: string;
  productName: string;
  productUrl: string;
  anchorText: string;
  context: string; // sentence where link was inserted
  relevanceScore: number;
  reason: string;
}

export interface ProductInfuserOutput {
  linksInserted: ProductLink[];
  articlesUpdated: number;
  stats: {
    articlesAnalyzed: number;
    productsMatched: number;
    totalLinksInserted: number;
    averageRelevance: number;
    infusionScore: number; // 0-100 accuracy/quality score
  };
  articleDetails: Array<{
    articleId: string;
    title: string;
    linksAdded: number;
    products: string[];
  }>;
}

export const PRODUCT_INFUSER_CREDITS = 2;

export async function runProductInfuser(
  domainId: string,
  config: ProductInfuserConfig
): Promise<ProductInfuserOutput> {
  const { products } = config;

  if (!products || products.length === 0) {
    return {
      linksInserted: [],
      articlesUpdated: 0,
      stats: {
        articlesAnalyzed: 0,
        productsMatched: 0,
        totalLinksInserted: 0,
        averageRelevance: 0,
        infusionScore: 0,
      },
      articleDetails: [],
    };
  }

  // Load all articles for this domain
  const articles = db
    .select()
    .from(schema.articles)
    .where(eq(schema.articles.domainId, domainId))
    .all();

  // Also load crawled pages for additional content
  const pages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, domainId))
    .all();

  const allLinksInserted: ProductLink[] = [];
  const articleUpdates: Array<{ articleId: string; title: string; linksAdded: number; products: string[] }> = [];
  const productsMatched = new Set<string>();

  // Process each article
  for (const article of articles) {
    if (!article.bodyMarkdown) continue;

    let markdown = article.bodyMarkdown;
    const articleTitle = article.metaTitle || article.h1 || "Untitled";
    const articleKeywords = extractKeywords(
      `${articleTitle} ${article.targetKeyword || ""} ${article.metaDescription || ""}`
    );
    const linksForArticle: ProductLink[] = [];
    const productsInArticle: string[] = [];

    // Find relevant products for this article
    const scoredProducts = products.map((product) => {
      const productKeywords = extractKeywords(
        `${product.name} ${product.description || ""} ${product.category || ""}`
      );
      const relevance = calculateRelevance(articleKeywords, productKeywords, markdown);
      return { product, relevance };
    }).filter((p) => p.relevance >= 20)
      .sort((a, b) => b.relevance - a.relevance);

    // Insert up to 3 product links per article (avoid over-stuffing)
    const maxLinksPerArticle = Math.min(3, scoredProducts.length);
    const paragraphs = markdown.split(/\n\n+/);
    const usedPositions = new Set<number>();

    for (let i = 0; i < maxLinksPerArticle; i++) {
      const { product, relevance } = scoredProducts[i];

      // Skip if product link already exists in article
      if (product.url && markdown.includes(product.url)) continue;
      if (markdown.toLowerCase().includes(`[${product.name.toLowerCase()}]`)) continue;

      // Find the best paragraph to insert the link
      const insertResult = findBestInsertionPoint(
        paragraphs,
        product,
        usedPositions
      );

      if (!insertResult) continue;

      const { paragraphIndex, anchor, contextSentence, updatedParagraph } = insertResult;
      usedPositions.add(paragraphIndex);
      paragraphs[paragraphIndex] = updatedParagraph;

      productsMatched.add(product.name);
      productsInArticle.push(product.name);

      linksForArticle.push({
        articleId: article.id,
        articleTitle,
        productName: product.name,
        productUrl: product.url || "#",
        anchorText: anchor,
        context: contextSentence,
        relevanceScore: relevance,
        reason: generateReason(product, articleKeywords, relevance),
      });
    }

    if (linksForArticle.length > 0) {
      // Rebuild markdown with updated paragraphs
      const updatedMarkdown = paragraphs.join("\n\n");

      // Save updated markdown back to article
      db.update(schema.articles)
        .set({ bodyMarkdown: updatedMarkdown })
        .where(eq(schema.articles.id, article.id))
        .run();

      allLinksInserted.push(...linksForArticle);
      articleUpdates.push({
        articleId: article.id,
        title: articleTitle,
        linksAdded: linksForArticle.length,
        products: productsInArticle,
      });
    }
  }

  // Calculate infusion score
  const totalRelevance = allLinksInserted.reduce((s, l) => s + l.relevanceScore, 0);
  const averageRelevance = allLinksInserted.length > 0
    ? Math.round(totalRelevance / allLinksInserted.length)
    : 0;

  // Score based on: coverage (articles with links / total), relevance quality, link count
  const coverageScore = articles.length > 0
    ? Math.round((articleUpdates.length / articles.length) * 40) // up to 40 points
    : 0;
  const relevanceScore = Math.round((averageRelevance / 100) * 35); // up to 35 points
  const productCoverage = products.length > 0
    ? Math.round((productsMatched.size / products.length) * 25) // up to 25 points
    : 0;
  const infusionScore = Math.min(100, coverageScore + relevanceScore + productCoverage);

  // Also try to link products in crawled pages content (for page-level analysis)
  // This adds to stats but doesn't modify page content (pages are external)
  let pagesWithOpportunities = 0;
  for (const page of pages) {
    if (!page.title && !page.h1) continue;
    const pageText = `${page.title || ""} ${page.h1 || ""} ${page.metaDescription || ""}`;
    const pageKeywords = extractKeywords(pageText);
    const hasMatch = products.some((p) => {
      const pKw = extractKeywords(`${p.name} ${p.description || ""}`);
      return calculateRelevance(pageKeywords, pKw, pageText) >= 25;
    });
    if (hasMatch) pagesWithOpportunities++;
  }

  return {
    linksInserted: allLinksInserted,
    articlesUpdated: articleUpdates.length,
    stats: {
      articlesAnalyzed: articles.length,
      productsMatched: productsMatched.size,
      totalLinksInserted: allLinksInserted.length,
      averageRelevance,
      infusionScore,
    },
    articleDetails: articleUpdates,
  };
}

// ── Helper functions ──────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "to", "of", "in", "for", "on", "with",
    "at", "by", "from", "and", "but", "or", "not", "no", "so", "yet",
    "if", "then", "that", "this", "it", "its", "as", "into", "through",
    "about", "your", "our", "their", "how", "what", "when", "where",
    "who", "which", "why", "can", "get", "make", "use", "like", "just",
    "also", "more", "most", "very", "much", "than", "other", "some",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function calculateRelevance(
  articleKeywords: string[],
  productKeywords: string[],
  articleText: string
): number {
  if (productKeywords.length === 0) return 0;

  // Keyword overlap score
  const overlap = productKeywords.filter((w) => articleKeywords.includes(w));
  const overlapScore = (overlap.length / productKeywords.length) * 100;

  // Check if product keywords appear in the article body
  const bodyLower = articleText.toLowerCase();
  const bodyMatches = productKeywords.filter((w) => bodyLower.includes(w));
  const bodyScore = (bodyMatches.length / productKeywords.length) * 100;

  // Weighted: 40% keyword overlap, 60% body presence
  return Math.min(100, Math.round(overlapScore * 0.4 + bodyScore * 0.6));
}

function findBestInsertionPoint(
  paragraphs: string[],
  product: { name: string; url: string; description: string; category: string },
  usedPositions: Set<number>
): { paragraphIndex: number; anchor: string; contextSentence: string; updatedParagraph: string } | null {
  const productWords = extractKeywords(`${product.name} ${product.description || ""}`);

  // Score each paragraph for relevance to this product
  const candidates: Array<{ index: number; score: number }> = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    // Skip headings, code blocks, existing links, tables, short paragraphs
    if (p.startsWith("#") || p.startsWith("```") || p.startsWith("|") || p.trim().length < 50) continue;
    if (usedPositions.has(i)) continue;

    const words = extractKeywords(p);
    const matches = productWords.filter((w) => words.includes(w));
    if (matches.length === 0) continue;

    candidates.push({ index: i, score: matches.length });
  }

  if (candidates.length === 0) return null;

  // Pick the best scoring paragraph
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const paragraph = paragraphs[best.index];

  // Find a natural anchor phrase
  const anchor = findNaturalAnchor(paragraph, product);
  const productLink = product.url
    ? `[${anchor}](${product.url})`
    : `**${anchor}**`;

  // Insert link at the end of the paragraph as a natural mention
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const lastSentence = sentences[sentences.length - 1] || paragraph;

  // Append a product mention sentence
  const mention = generateMention(product, anchor);
  const updatedParagraph = `${paragraph} ${mention.replace(anchor, productLink)}`;

  return {
    paragraphIndex: best.index,
    anchor,
    contextSentence: lastSentence.slice(0, 100),
    updatedParagraph,
  };
}

function findNaturalAnchor(
  paragraph: string,
  product: { name: string; description: string }
): string {
  // Try to find a phrase from the product name in the paragraph
  const nameParts = product.name.split(/\s+/);

  // Try full product name
  if (paragraph.toLowerCase().includes(product.name.toLowerCase())) {
    return product.name;
  }

  // Try 2-word combinations from product name
  for (let i = 0; i < nameParts.length - 1; i++) {
    const phrase = `${nameParts[i]} ${nameParts[i + 1]}`;
    if (paragraph.toLowerCase().includes(phrase.toLowerCase())) {
      return phrase;
    }
  }

  // Fall back to product name
  return product.name;
}

function generateMention(
  product: { name: string; description: string; category: string },
  anchor: string
): string {
  const desc = product.description || product.category || "solution";
  const shortDesc = desc.slice(0, 60).toLowerCase();

  const templates = [
    `For this, ${anchor} can be a great ${shortDesc.includes("tool") ? "tool" : "option"} to consider.`,
    `Check out ${anchor} for a reliable ${product.category || "solution"} in this space.`,
    `${anchor} is worth exploring if you need a proven ${shortDesc.split(" ").slice(0, 4).join(" ")}.`,
    `Consider ${anchor} as a trusted choice for ${product.category || "this use case"}.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function generateReason(
  product: { name: string; category: string; description: string },
  articleKeywords: string[],
  relevance: number
): string {
  const productKw = extractKeywords(`${product.name} ${product.description || ""}`);
  const overlapping = productKw.filter((w) => articleKeywords.includes(w)).slice(0, 3);

  if (relevance >= 70) {
    return `Strong match — product keywords (${overlapping.join(", ")}) align closely with article content`;
  }
  if (relevance >= 40) {
    return `Good contextual fit — shares topic overlap on ${overlapping.join(", ")}`;
  }
  return `Relevant product mention — related through ${product.category || "category"} context`;
}
