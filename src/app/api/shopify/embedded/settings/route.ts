import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";

const TONES = ["professional", "friendly", "playful", "authoritative", "conversational"];
const FREQUENCIES = ["daily", "weekly", "biweekly", "monthly"];

export function getShopSettings(domainId: string) {
  const row = db.select().from(schema.storeSettings).where(eq(schema.storeSettings.domainId, domainId)).get();
  const parseList = (s: string | null | undefined): string[] => {
    try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; }
    catch { return []; }
  };
  return {
    tone: row?.tone || "professional",
    language: row?.language || "English",
    audience: row?.audience || "shoppers",
    authorName: row?.authorName || "",
    autopilotEnabled: !!row?.autopilotEnabled,
    autopilotFrequency: row?.autopilotFrequency || "weekly",
    autopilotDay: row?.autopilotDay ?? 1,
    autopilotDays: (() => {
      try { const v = JSON.parse(row?.autopilotDays || "[]"); return Array.isArray(v) && v.length ? v.map(Number).filter((n) => n >= 0 && n <= 6) : [1]; }
      catch { return [1]; }
    })(),
    timezone: row?.timezone || "UTC",
    targetBlogId: row?.targetBlogId || "",
    targetBlogHandle: row?.targetBlogHandle || "",
    targetBlogTitle: row?.targetBlogTitle || "",
    autopilotHour: row?.autopilotHour ?? 9,
    autoPublish: row?.autoPublish ?? true,
    promoteProducts: row?.promoteProducts ?? true,
    nextRunAt: row?.nextRunAt || null,
    lastRunAt: row?.lastRunAt || null,
    notifyEmail: row?.notifyEmail || "",
    brandInfo: row?.brandInfo || "",
    avoidInfo: row?.avoidInfo || "",
    customKeywords: parseList(row?.customKeywords),
    competitorDomains: parseList(row?.competitorDomains),
  };
}

/** Offset of a timezone (ms to ADD to UTC to get local wall time) at a given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  try {
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const p: Record<string, string> = {};
    for (const part of f.formatToParts(new Date(utcMs))) p[part.type] = part.value;
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +(p.hour === "24" ? "0" : p.hour), +p.minute, +p.second);
    return asUtc - utcMs;
  } catch { return 0; }
}

/**
 * Next occurrence (UTC ISO) of the configured slot, strictly in the future,
 * interpreted in the store's timezone ("Every day at 9am" means 9am local).
 * daily: any day; weekly/biweekly: any of `days` (weekdays 0-6); monthly: `dayOfMonth`.
 */
export function computeNextRunAt(
  frequency: string,
  days: number[],
  dayOfMonth: number,
  hour: number,
  tz = "UTC",
  from = new Date(),
): string {
  const wanted = new Set((days || []).filter((n) => n >= 0 && n <= 6));
  if (!wanted.size) wanted.add(1);
  const dom = Math.min(Math.max(1, dayOfMonth || 1), 28);

  for (let i = 0; i < 62; i++) {
    // Candidate calendar day: "now + i days" as seen in the store's timezone.
    const probe = from.getTime() + i * 86400000;
    const local = new Date(probe + tzOffsetMs(probe, tz));
    const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
    if (frequency === "monthly" && d !== dom) continue;
    if ((frequency === "weekly" || frequency === "biweekly") && !wanted.has(local.getUTCDay())) continue;
    // Convert local y-m-d hour:00 back to UTC (two-pass for DST edges).
    let utc = Date.UTC(y, m, d, hour, 0, 0) - tzOffsetMs(Date.UTC(y, m, d, hour, 0, 0), tz);
    utc = Date.UTC(y, m, d, hour, 0, 0) - tzOffsetMs(utc, tz);
    if (utc > from.getTime()) return new Date(utc).toISOString();
  }
  return new Date(from.getTime() + 7 * 86400000).toISOString(); // safety fallback
}

// GET /api/shopify/embedded/settings — full preferences + autopilot state.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  const { domainId } = getOrCreateShopAccount(claims.shop);
  return NextResponse.json(getShopSettings(domainId));
}

// POST /api/shopify/embedded/settings — save preferences and/or autopilot config.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  const { domainId } = getOrCreateShopAccount(claims.shop);

  const body = await request.json().catch(() => ({}));
  const cur = getShopSettings(domainId);

  const tone = TONES.includes(body.tone) ? body.tone : cur.tone;
  const language = typeof body.language === "string" && body.language.trim() ? body.language.trim().slice(0, 40) : cur.language;
  const audience = typeof body.audience === "string" && body.audience.trim() ? body.audience.trim().slice(0, 120) : cur.audience;
  const authorName = typeof body.authorName === "string" ? body.authorName.trim().slice(0, 80) : cur.authorName;

  const autopilotEnabled = typeof body.autopilotEnabled === "boolean" ? body.autopilotEnabled : cur.autopilotEnabled;
  const autopilotFrequency = FREQUENCIES.includes(body.autopilotFrequency) ? body.autopilotFrequency : cur.autopilotFrequency;
  const autopilotDay = Number.isInteger(body.autopilotDay) ? Math.min(Math.max(0, body.autopilotDay), 28) : cur.autopilotDay;
  const autopilotDays = Array.isArray(body.autopilotDays)
    ? body.autopilotDays.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6)
    : cur.autopilotDays;
  const targetBlog = body.targetBlog && typeof body.targetBlog === "object"
    ? { id: String(body.targetBlog.id || ""), handle: String(body.targetBlog.handle || ""), title: String(body.targetBlog.title || "") }
    : null;
  const autopilotHour = Number.isInteger(body.autopilotHour) ? Math.min(Math.max(0, body.autopilotHour), 23) : cur.autopilotHour;
  const autoPublish = typeof body.autoPublish === "boolean" ? body.autoPublish : cur.autoPublish;
  const promoteProducts = typeof body.promoteProducts === "boolean" ? body.promoteProducts : cur.promoteProducts;

  const notifyEmail = typeof body.notifyEmail === "string" ? body.notifyEmail.trim().slice(0, 120) : cur.notifyEmail;
  const brandInfo = typeof body.brandInfo === "string" ? body.brandInfo.trim().slice(0, 300) : cur.brandInfo;
  const avoidInfo = typeof body.avoidInfo === "string" ? body.avoidInfo.trim().slice(0, 150) : cur.avoidInfo;
  const cleanList = (v: unknown, max: number, itemLen: number): string[] =>
    Array.isArray(v)
      ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().slice(0, itemLen)).slice(0, max)
      : [];
  const customKeywords = body.customKeywords !== undefined ? cleanList(body.customKeywords, 10, 80) : cur.customKeywords;
  const competitorDomains = body.competitorDomains !== undefined
    ? cleanList(body.competitorDomains, 3, 100).map((d) => d.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
    : cur.competitorDomains;

  const nextRunAt = autopilotEnabled
    ? computeNextRunAt(autopilotFrequency, autopilotDays, autopilotDay, autopilotHour, cur.timezone)
    : null;

  const values = {
    tone, language, audience, authorName: authorName || null,
    autopilotEnabled, autopilotFrequency, autopilotDay, autopilotHour, autoPublish, promoteProducts,
    autopilotDays: JSON.stringify(autopilotDays.length ? autopilotDays : [1]),
    ...(targetBlog !== null ? { targetBlogId: targetBlog.id || null, targetBlogHandle: targetBlog.handle || null, targetBlogTitle: targetBlog.title || null } : {}),
    nextRunAt,
    notifyEmail: notifyEmail || null,
    brandInfo: brandInfo || null, avoidInfo: avoidInfo || null,
    customKeywords: JSON.stringify(customKeywords), competitorDomains: JSON.stringify(competitorDomains),
    updatedAt: new Date().toISOString(),
  };

  const existing = db.select().from(schema.storeSettings).where(eq(schema.storeSettings.domainId, domainId)).get();
  if (existing) {
    db.update(schema.storeSettings).set(values).where(eq(schema.storeSettings.id, existing.id)).run();
  } else {
    db.insert(schema.storeSettings).values({ domainId, ...values }).run();
  }

  db.update(schema.domains).set({ language }).where(eq(schema.domains.id, domainId)).run();

  return NextResponse.json({ saved: true, ...getShopSettings(domainId) });
}
