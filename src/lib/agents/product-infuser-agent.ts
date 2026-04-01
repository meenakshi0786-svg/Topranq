import { db, schema } from "../db";
import { eq } from "drizzle-orm";
export interface ProductInfuserConfig {
  productName: string;
  productUrl: string;
  productDescription: string;
  targetPages: string[]; // URLs, empty = auto-detect
}

export interface InfusionSuggestion {
  pageUrl: string;
  pageTitle: string;
  insertAfterHeading: string;
  suggestedText: string;
  relevanceScore: number;
  reason: string;
}

export interface ProductInfuserOutput {
  suggestions: InfusionSuggestion[];
  stats: {
    pagesAnalyzed: number;
    pagesWithOpportunities: number;
    totalSuggestions: number;
  };
}

export const PRODUCT_INFUSER_CREDITS = 2;

export async function runProductInfuser(
  domainId: string,
  config: ProductInfuserConfig
): Promise<ProductInfuserOutput> {
  const { productName, productUrl, productDescription } = config;

  // Load pages — either specified or all crawled pages
  const allPages = db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.domainId, domainId))
    .all();

  // Get full page data from the most recent crawl for HTML content
  const targetPages =
    config.targetPages.length > 0
      ? allPages.filter((p) => config.targetPages.includes(p.url))
      : allPages.filter((p) => (p.wordCount || 0) > 200); // Only content-rich pages

  const productWords = extractWords(productName + " " + productDescription);
  const suggestions: InfusionSuggestion[] = [];

  for (const page of targetPages) {
    // Skip homepage and product pages themselves
    if (page.url === productUrl) continue;
    const isHomepage = page.url.replace(/\/$/, "").split("/").length <= 3;
    if (isHomepage) continue;

    // Calculate content relevance
    const pageText = `${page.title || ""} ${page.h1 || ""} ${page.metaDescription || ""}`.toLowerCase();
    const pageWords = extractWords(pageText);
    const overlap = productWords.filter((w) => pageWords.includes(w));
    const relevanceScore = Math.min(100, Math.round((overlap.length / Math.max(productWords.length, 1)) * 100));

    if (relevanceScore < 15) continue; // Not relevant enough

    // Determine the best insertion point
    const heading = page.h1 || page.title || "Main content";

    // Generate contextual product mention
    const suggestedText = generateProductMention(
      productName,
      productUrl,
      productDescription,
      page.title || "",
      relevanceScore
    );

    const reason =
      relevanceScore >= 60
        ? `Highly relevant — shares ${overlap.length} keywords with product description`
        : relevanceScore >= 30
        ? `Moderately relevant — contextual fit with ${overlap.slice(0, 3).join(", ")}`
        : `Potential fit — light topical overlap`;

    suggestions.push({
      pageUrl: page.url,
      pageTitle: page.title || page.url,
      insertAfterHeading: heading,
      suggestedText,
      relevanceScore,
      reason,
    });
  }

  // Sort by relevance
  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topSuggestions = suggestions.slice(0, 15);

  return {
    suggestions: topSuggestions,
    stats: {
      pagesAnalyzed: targetPages.length,
      pagesWithOpportunities: topSuggestions.length,
      totalSuggestions: topSuggestions.length,
    },
  };
}

function generateProductMention(
  productName: string,
  productUrl: string,
  productDescription: string,
  pageTitle: string,
  relevanceScore: number
): string {
  if (relevanceScore >= 60) {
    return `If you're looking for a solution, [${productName}](${productUrl}) offers ${productDescription.slice(0, 100).toLowerCase()}${productDescription.length > 100 ? "..." : ""}. It's designed to help with exactly the kind of challenges discussed in this article.`;
  }

  if (relevanceScore >= 30) {
    return `**Related:** [${productName}](${productUrl}) — ${productDescription.slice(0, 80).toLowerCase()}${productDescription.length > 80 ? "..." : ""}`;
  }

  return `You might also find [${productName}](${productUrl}) useful for this topic.`;
}

function extractWords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "and", "but", "or", "not", "no", "so", "yet", "if", "then",
    "that", "this", "it", "its", "as", "into", "through",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}
