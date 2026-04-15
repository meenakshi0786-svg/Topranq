import { db, schema } from "../src/lib/db";
import { buildProductCta } from "../src/lib/product-cta";
import { eq } from "drizzle-orm";

// Ensure a test user + domain exist (data/seo-analyzer.db may be empty)
let anyDomain = db.select().from(schema.domains).limit(1).all()[0];
if (!anyDomain) {
  const userId = crypto.randomUUID();
  db.insert(schema.users).values({ id: userId, email: "test@local.test", name: "Test" }).run();
  const domainId = crypto.randomUUID();
  db.insert(schema.domains).values({ id: domainId, userId, domainUrl: "test.local" }).run();
  anyDomain = db.select().from(schema.domains).where(eq(schema.domains.id, domainId)).get()!;
}
const domainId = anyDomain.id;
console.log("Using domain:", anyDomain.domainUrl, domainId);

// Clear + seed 8 test products (5 running-shoe related, 3 unrelated)
db.delete(schema.storeProducts).where(eq(schema.storeProducts.domainId, domainId)).run();

const seed = [
  { name: "CloudRunner Pro Running Shoes", category: "running shoes", description: "Cushioned running shoes for long-distance runners", price: "$149", url: "https://shop.example.com/cloudrunner-pro", imageUrl: "https://cdn.example.com/cloudrunner.jpg" },
  { name: "Trail Blaze Running Shoes", category: "trail running", description: "Grippy outsole trail running shoes", price: "$169", url: "https://shop.example.com/trail-blaze", imageUrl: "https://cdn.example.com/trail.jpg" },
  { name: "Marathon Elite Running Sneakers", category: "running shoes", description: "Lightweight carbon-plate running sneakers for races", price: "$229", url: "https://shop.example.com/marathon-elite", imageUrl: "https://cdn.example.com/marathon.jpg" },
  { name: "Daily Trainer Running Shoes", category: "running shoes", description: "Everyday running shoes with responsive foam", price: "$119", url: "https://shop.example.com/daily-trainer", imageUrl: "https://cdn.example.com/daily.jpg" },
  { name: "Speed Racer Running Flats", category: "running shoes", description: "Minimalist racing flats for fast runners", price: "$139", url: "https://shop.example.com/speed-racer", imageUrl: "https://cdn.example.com/speed.jpg" },
  { name: "Wool Crew Socks", category: "socks", description: "Merino wool crew socks", price: "$18", url: "https://shop.example.com/socks", imageUrl: "https://cdn.example.com/socks.jpg" },
  { name: "Yoga Mat Deluxe", category: "yoga", description: "Premium yoga mat", price: "$79", url: "https://shop.example.com/mat", imageUrl: "https://cdn.example.com/mat.jpg" },
  { name: "Protein Bar 12-pack", category: "nutrition", description: "Chocolate protein bars", price: "$29", url: "https://shop.example.com/bars", imageUrl: "https://cdn.example.com/bars.jpg" },
];
for (const p of seed) db.insert(schema.storeProducts).values({ domainId, ...p }).run();
console.log(`Seeded ${seed.length} products\n`);

const articleTitle = "The Best Running Shoes of 2026";
const articleKeyword = "best running shoes 2026";
const articleBody = `Running shoes have evolved. Modern running shoes combine carbon plates, responsive foam, and breathable uppers. Whether you're a marathon runner or a casual jogger, the right running shoes make every mile better. Lightweight trainers excel at speed, while cushioned running shoes protect over long distances. Trail running shoes add grip for off-road adventures.`;

const cta = buildProductCta(domainId, articleTitle, articleKeyword, articleBody);
console.log(`Picked ${cta.products.length} products:`);
for (const p of cta.products) console.log(`  ${p.relevance}  ${p.name}`);
console.log("\n--- MARKDOWN ---\n" + cta.markdown);
console.log("\n--- HTML (first 400 chars) ---\n" + cta.html.slice(0, 400));
