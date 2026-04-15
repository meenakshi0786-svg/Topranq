/**
 * Auto-discover products from a store domain.
 * Tries Shopify's /products.json then WooCommerce's /wp-json/wc/store/products.
 * Returns a normalized ProductListing[] — always has name + imageUrl + url.
 */

export interface ProductListing {
  name: string;
  url: string;
  imageUrl: string;
  price?: string;
  description?: string;
  category?: string;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_PRODUCTS = 250;

export async function fetchProductsFromDomain(domainUrl: string): Promise<ProductListing[]> {
  const base = normalizeDomain(domainUrl);
  if (!base) return [];

  const shopify = await tryShopify(base);
  if (shopify.length > 0) return shopify;

  const woo = await tryWooCommerce(base);
  if (woo.length > 0) return woo;

  return [];
}

function normalizeDomain(input: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withScheme);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function fetchJson<T = unknown>(url: string): Promise<T | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RanqapexBot/1.0; +https://ranqapex.com)",
        Accept: "application/json",
      },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  product_type?: string;
  variants?: Array<{ price?: string; compare_at_price?: string }>;
  images?: Array<{ src: string }>;
  image?: { src: string };
}

async function tryShopify(base: string): Promise<ProductListing[]> {
  const results: ProductListing[] = [];
  for (let page = 1; page <= 5 && results.length < MAX_PRODUCTS; page++) {
    const data = await fetchJson<{ products: ShopifyProduct[] }>(
      `${base}/products.json?limit=250&page=${page}`,
    );
    const products = data?.products || [];
    if (products.length === 0) break;
    for (const p of products) {
      const img = p.images?.[0]?.src || p.image?.src;
      if (!img) continue;
      const price = p.variants?.[0]?.price;
      results.push({
        name: p.title,
        url: `${base}/products/${p.handle}`,
        imageUrl: img,
        price: price ? `$${price}` : undefined,
        description: stripHtml(p.body_html || "").slice(0, 300),
        category: p.product_type,
      });
      if (results.length >= MAX_PRODUCTS) break;
    }
    if (products.length < 250) break;
  }
  return results;
}

interface WooProduct {
  id: number;
  name: string;
  permalink?: string;
  prices?: { price?: string; currency_symbol?: string };
  images?: Array<{ src: string }>;
  short_description?: string;
  categories?: Array<{ name: string }>;
}

async function tryWooCommerce(base: string): Promise<ProductListing[]> {
  const results: ProductListing[] = [];
  for (let page = 1; page <= 5 && results.length < MAX_PRODUCTS; page++) {
    const data = await fetchJson<WooProduct[]>(
      `${base}/wp-json/wc/store/products?per_page=100&page=${page}`,
    );
    if (!Array.isArray(data) || data.length === 0) break;
    for (const p of data) {
      const img = p.images?.[0]?.src;
      if (!img) continue;
      const priceStr = p.prices?.price;
      const currency = p.prices?.currency_symbol || "$";
      results.push({
        name: p.name,
        url: p.permalink || `${base}/?p=${p.id}`,
        imageUrl: img,
        price: priceStr ? `${currency}${(Number(priceStr) / 100).toFixed(2)}` : undefined,
        description: stripHtml(p.short_description || "").slice(0, 300),
        category: p.categories?.[0]?.name,
      });
      if (results.length >= MAX_PRODUCTS) break;
    }
    if (data.length < 100) break;
  }
  return results;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
