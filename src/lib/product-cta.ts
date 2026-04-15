import { db, schema } from "./db";
import { eq } from "drizzle-orm";

const MIN_RELEVANCE = 40;
const MAX_PRODUCTS = 5;

interface PickedProduct {
  name: string;
  url: string | null;
  price: string | null;
  imageUrl: string | null;
  relevance: number;
}

export interface ProductCta {
  products: PickedProduct[];
  markdown: string;
  html: string;
}

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

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function relevance(articleWords: string[], productWords: string[], articleText: string): number {
  if (productWords.length === 0) return 0;
  const overlap = productWords.filter((w) => articleWords.includes(w));
  const overlapScore = (overlap.length / productWords.length) * 100;
  const body = articleText.toLowerCase();
  const bodyMatches = productWords.filter((w) => body.includes(w));
  const bodyScore = (bodyMatches.length / productWords.length) * 100;
  return Math.min(100, Math.round(overlapScore * 0.4 + bodyScore * 0.6));
}

export function buildProductCta(
  domainId: string,
  articleTitle: string,
  articleKeyword: string,
  articleBody: string,
): ProductCta {
  const products = db
    .select()
    .from(schema.storeProducts)
    .where(eq(schema.storeProducts.domainId, domainId))
    .all();

  if (products.length === 0) return { products: [], markdown: "", html: "" };

  const articleText = `${articleTitle} ${articleKeyword} ${articleBody}`;
  const articleWords = keywords(articleText);

  const scored: PickedProduct[] = products
    .map((p) => {
      const productWords = keywords(
        `${p.name} ${p.description || ""} ${p.category || ""}`,
      );
      return {
        name: p.name,
        url: p.url,
        price: p.price,
        imageUrl: p.imageUrl,
        relevance: relevance(articleWords, productWords, articleText),
      };
    })
    .filter((p) => p.relevance >= MIN_RELEVANCE && !!p.imageUrl)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_PRODUCTS);

  if (scored.length === 0) return { products: [], markdown: "", html: "" };

  return {
    products: scored,
    markdown: renderMarkdown(scored),
    html: renderHtml(scored),
  };
}

function renderMarkdown(products: PickedProduct[]): string {
  const lines: string[] = ["", "## Shop the edit", ""];
  for (const p of products) {
    const priceLine = p.price ? ` — ${p.price}` : "";
    const img = `![${escapeAlt(p.name)}](${p.imageUrl})`;
    const linked = p.url ? `[${img}](${p.url})` : img;
    const nameLinked = p.url ? `[**${p.name}**](${p.url})` : `**${p.name}**`;
    lines.push(linked);
    lines.push("");
    lines.push(`${nameLinked}${priceLine}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderHtml(products: PickedProduct[]): string {
  const cards = products
    .map((p) => {
      const href = p.url ? escapeAttr(p.url) : "#";
      const img = `<img src="${escapeAttr(p.imageUrl!)}" alt="${escapeAttr(p.name)}" loading="lazy" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;" />`;
      const price = p.price
        ? `<div style="color:#666;font-size:14px;margin-top:2px;">${escapeHtml(p.price)}</div>`
        : "";
      return `<a href="${href}" style="display:block;text-decoration:none;color:inherit;">${img}<div style="margin-top:8px;font-weight:600;font-size:14px;line-height:1.3;">${escapeHtml(p.name)}</div>${price}</a>`;
    })
    .join("");
  return `<section class="product-cta" style="margin:48px 0;padding:24px 0;border-top:1px solid #eee;"><h2 style="margin:0 0 20px;font-size:22px;">Shop the edit</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;">${cards}</div></section>`;
}

function escapeAlt(s: string): string {
  return s.replace(/[\[\]]/g, "");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
