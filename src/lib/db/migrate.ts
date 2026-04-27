import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
try { require("fs").mkdirSync(dataDir, { recursive: true }); } catch { /* exists */ }
const DB_PATH = path.join(dataDir, "seo-analyzer.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./drizzle" });

// ── Post-migration: add columns that were added to schema after initial migration ──
// This ensures the DB stays in sync with the schema even without generating new migrations.
function addColumnIfMissing(table: string, column: string, type: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.find(c => c.name === column)) {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`  + ${table}.${column}`);
    } catch { /* already exists */ }
  }
}

// users
addColumnIfMissing("users", "plan_purchased_at", "TEXT");

// domains
addColumnIfMissing("domains", "language", "TEXT DEFAULT 'English'");

// articles — many columns added after initial migration
addColumnIfMissing("articles", "body_html", "TEXT");
addColumnIfMissing("articles", "schema_json_ld", "TEXT");
addColumnIfMissing("articles", "target_keyword", "TEXT");
addColumnIfMissing("articles", "intent", "TEXT");
addColumnIfMissing("articles", "audience", "TEXT");
addColumnIfMissing("articles", "tone", "TEXT");
addColumnIfMissing("articles", "image_suggestions_json", "TEXT");
addColumnIfMissing("articles", "featured_image_url", "TEXT");
addColumnIfMissing("articles", "featured_image_prompt", "TEXT");
addColumnIfMissing("articles", "readability_score", "REAL");
addColumnIfMissing("articles", "pillar_id", "TEXT");
addColumnIfMissing("articles", "cluster_id", "TEXT");
addColumnIfMissing("articles", "article_type", "TEXT");
addColumnIfMissing("articles", "scheduled_for", "TEXT");
addColumnIfMissing("articles", "publish_connector_id", "TEXT");
addColumnIfMissing("articles", "updated_at", "TEXT");

// pillars & clusters
const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
if (!tables.find(t => t.name === "pillars")) {
  sqlite.exec(`CREATE TABLE pillars (
    id TEXT PRIMARY KEY NOT NULL,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    description TEXT,
    pillar_article_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log("  + pillars table");
}
if (!tables.find(t => t.name === "pillar_clusters")) {
  sqlite.exec(`CREATE TABLE pillar_clusters (
    id TEXT PRIMARY KEY NOT NULL,
    pillar_id TEXT NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
    cluster_topic TEXT NOT NULL,
    cluster_keywords TEXT,
    reason TEXT,
    order_index INTEGER DEFAULT 0,
    article_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log("  + pillar_clusters table");
}
if (!tables.find(t => t.name === "article_reviews")) {
  sqlite.exec(`CREATE TABLE article_reviews (
    id TEXT PRIMARY KEY NOT NULL,
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_email TEXT,
    rework_notes TEXT,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log("  + article_reviews table");
}
if (!tables.find(t => t.name === "discovered_keywords")) {
  sqlite.exec(`CREATE TABLE discovered_keywords (
    id TEXT PRIMARY KEY NOT NULL,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    intent TEXT NOT NULL,
    relevancy_score INTEGER NOT NULL,
    source TEXT NOT NULL,
    source_detail TEXT,
    competitor_url TEXT,
    run_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log("  + discovered_keywords table");
}
if (!tables.find(t => t.name === "store_products")) {
  sqlite.exec(`CREATE TABLE store_products (
    id TEXT PRIMARY KEY NOT NULL,
    domain_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    image_url TEXT,
    price TEXT,
    category TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log("  + store_products table");
}

console.log("Migration complete.");
sqlite.close();
