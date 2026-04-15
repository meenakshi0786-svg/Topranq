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

const MIN_RELEVANCE = 15; // more lenient than before so we have hero material even on thin matches

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

  const scored: PickedProduct[] = products
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

  // If we couldn't find 5 above the threshold, pad with top-scored remaining products
  // so the hero composite always has 5 cells filled.
  if (scored.length < limit) {
    const already = new Set(scored.map((p) => p.imageUrl));
    const extras = products
      .filter((p) => !!p.imageUrl && !already.has(p.imageUrl))
      .slice(0, limit - scored.length)
      .map((p) => ({ ...p, relevance: 0 }));
    scored.push(...extras);
  }

  return scored;
}

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function score(articleWords: string[], productWords: string[], articleBody: string): number {
  if (productWords.length === 0) return 0;
  const overlap = productWords.filter((w) => articleWords.includes(w));
  const overlapScore = (overlap.length / productWords.length) * 100;
  const bodyMatches = productWords.filter((w) => articleBody.includes(w));
  const bodyScore = (bodyMatches.length / productWords.length) * 100;
  return Math.min(100, Math.round(overlapScore * 0.4 + bodyScore * 0.6));
}
