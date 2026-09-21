import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
try { require("fs").mkdirSync(dataDir, { recursive: true }); } catch { /* exists */ }
const DB_PATH = path.join(dataDir, "seo-analyzer.db");

const sqlite = new Database(DB_PATH, { timeout: 10000 });
sqlite.pragma("journal_mode = WAL");
// Wait instead of throwing SQLITE_BUSY when parallel workers (e.g. `next
// build` page-data collection) open the database at the same time.
sqlite.pragma("busy_timeout = 10000");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
