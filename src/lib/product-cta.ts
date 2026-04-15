/**
 * Score and pick the N most relevant products for an article.
 * Used by the blog writer to choose which product photos appear in the hero composite.
 */

import type { ProductListing } from "./product-source";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "to", "of", "in", "for", "on", "with",
  "at", "by", "from", "and", "but", "or", "not", "no", "so", "yet",
  "if", "then", "that", "this", "it", "its", "as", "into", "through",
  "about", "your", "our", "their", "how", "what", "when", "where",
  "who", "which", "why", "can", "get", "make", "use", "like", "just",
  "also", "more", "most", "very", "much", "than", "other", "some",
]);

const MIN_RELEVANCE = 35; // strict — a poorly-matched product hurts the article more than a missing slot

export interface PickedProduct extends ProductListing {
  relevance: number;
}

export function pickRelevantProducts(
  products: ProductListing[],
  articleTitle: string,
  articleKeyword: string,
  articleBody: string,
  limit = 5,
): PickedProduct[] {
  if (products.length === 0) return [];

  const articleText = `${articleTitle} ${articleKeyword} ${articleBody}`;
  const articleWords = keywords(articleText);
  const body = articleText.toLowerCase();

  return products
    .filter((p) => !!p.imageUrl)
    .map((p) => {
      const productWords = keywords(
        `${p.name} ${p.description || ""} ${p.category || ""}`,
      );
      return { ...p, relevance: score(articleWords, productWords, body) };
    })
    .filter((p) => p.relevance >= MIN_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map(stem);
}

// Tiny stemmer so "runner", "running", "runs" all reduce to "run" — enough for
// product-matching without dragging in a full Porter implementation.
function stem(w: string): string {
  if (w.length <= 3) return w;
  for (const suffix of ["ings", "ing", "ers", "er", "ies", "ied", "ed", "es", "s"]) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      const root = w.slice(0, -suffix.length);
      return suffix === "ies" ? root + "y" : root;
    }
  }
  return w;
}

function score(articleWords: string[], productWords: string[], articleBody: string): number {
  if (productWords.length === 0) return 0;
  const article = new Set(articleWords);
  const overlap = productWords.filter((w) => article.has(w));
  const overlapScore = (overlap.length / productWords.length) * 100;
  // Body check uses stemmed article words already, so we substring-match the stem
  const bodyMatches = productWords.filter((w) => articleBody.includes(w));
  const bodyScore = (bodyMatches.length / productWords.length) * 100;
  return Math.min(100, Math.round(overlapScore * 0.4 + bodyScore * 0.6));
}
