import { fetchProductsFromDomain } from "../src/lib/product-source";
import { pickRelevantProducts } from "../src/lib/product-cta";
import { composeProductHero } from "../src/lib/product-composite";

const domain = process.argv[2] || "https://www.allbirds.com";
const articleTitle = process.argv[3] || "The Best Running Shoes of 2026";
const articleKeyword = process.argv[4] || "best running shoes 2026";
const articleBody =
  "Running shoes in 2026 combine breathable uppers, responsive foam, and durable outsoles. Whether you run trails or pavement, finding comfortable running shoes matters.";

(async () => {
  console.log(`\n▶ Fetching products from ${domain}`);
  const t0 = Date.now();
  const products = await fetchProductsFromDomain(domain);
  console.log(`✔ ${products.length} products fetched in ${Date.now() - t0}ms`);
  if (products.length === 0) {
    console.error("No products — endpoint not available or domain has no public product feed.");
    process.exit(1);
  }
  console.log("sample:", products.slice(0, 3).map((p) => `${p.name} — ${p.imageUrl.slice(0, 60)}`));

  const picked = pickRelevantProducts(products, articleTitle, articleKeyword, articleBody, 5);
  console.log(`\nPicked ${picked.length} products:`);
  for (const p of picked) console.log(`  ${String(p.relevance).padStart(3)}  ${p.name}`);

  const imageUrls = picked.map((p) => p.imageUrl);
  console.log(`\n▶ Composing hero image from ${imageUrls.length} photos`);
  const t1 = Date.now();
  const result = await composeProductHero(imageUrls, `${domain}-${articleKeyword}`);
  console.log(`✔ done in ${Date.now() - t1}ms`);
  console.log("output:", result);
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
