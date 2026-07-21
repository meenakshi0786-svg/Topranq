import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";

const TONES = ["professional", "friendly", "playful", "authoritative", "conversational"];
const FREQUENCIES = ["weekly", "biweekly", "monthly"];

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
    autopilotHour: row?.autopilotHour ?? 9,
    autoPublish: row?.autoPublish ?? true,
    promoteProducts: row?.promoteProducts ?? true,
    nextRunAt: row?.nextRunAt || null,
    lastRunAt: row?.lastRunAt || null,
    brandInfo: row?.brandInfo || "",
    avoidInfo: row?.avoidInfo || "",
    customKeywords: parseList(row?.customKeywords),
    competitorDomains: parseList(row?.competitorDomains),
  };
}

/** Next occurrence (UTC) of the configured slot, strictly in the future. */
export function computeNextRunAt(frequency: string, day: number, hour: number, from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, 0, 0));
  if (frequency === "monthly") {
    d.setUTCDate(Math.min(Math.max(1, day), 28));
    while (d <= from) d.setUTCMonth(d.getUTCMonth() + 1);
  } else {
    const targetDow = ((day % 7) + 7) % 7;
    while (d.getUTCDay() !== targetDow || d <= from) d.setUTCDate(d.getUTCDate() + 1);
    // biweekly just means the NEXT slot is normal; subsequent runs advance 14d in the cron.
  }
  return d.toISOString();
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
  const autopilotHour = Number.isInteger(body.autopilotHour) ? Math.min(Math.max(0, body.autopilotHour), 23) : cur.autopilotHour;
  const autoPublish = typeof body.autoPublish === "boolean" ? body.autoPublish : cur.autoPublish;
  const promoteProducts = typeof body.promoteProducts === "boolean" ? body.promoteProducts : cur.promoteProducts;

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

  const nextRunAt = autopilotEnabled ? computeNextRunAt(autopilotFrequency, autopilotDay, autopilotHour) : null;

  const values = {
    tone, language, audience, authorName: authorName || null,
    autopilotEnabled, autopilotFrequency, autopilotDay, autopilotHour, autoPublish, promoteProducts,
    nextRunAt,
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
