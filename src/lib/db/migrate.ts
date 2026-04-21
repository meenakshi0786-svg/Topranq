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

console.log("Migration complete.");
sqlite.close();
