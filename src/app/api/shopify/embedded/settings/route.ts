import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getShopFromRequest, getOrCreateShopAccount } from "@/lib/shopify-embedded";

const TONES = ["professional", "friendly", "playful", "authoritative", "conversational"];

export function getShopSettings(domainId: string) {
  const row = db.select().from(schema.storeSettings).where(eq(schema.storeSettings.domainId, domainId)).get();
  return {
    tone: row?.tone || "professional",
    language: row?.language || "English",
    audience: row?.audience || "shoppers",
    authorName: row?.authorName || "",
  };
}

// GET /api/shopify/embedded/settings — current preferences for the shop.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  const { domainId } = getOrCreateShopAccount(claims.shop);
  return NextResponse.json(getShopSettings(domainId));
}

// POST /api/shopify/embedded/settings — save preferences.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  const { domainId } = getOrCreateShopAccount(claims.shop);

  const body = await request.json().catch(() => ({}));
  const tone = TONES.includes(body.tone) ? body.tone : "professional";
  const language = typeof body.language === "string" && body.language.trim() ? body.language.trim().slice(0, 40) : "English";
  const audience = typeof body.audience === "string" && body.audience.trim() ? body.audience.trim().slice(0, 120) : "shoppers";
  const authorName = typeof body.authorName === "string" ? body.authorName.trim().slice(0, 80) : "";

  const existing = db.select().from(schema.storeSettings).where(eq(schema.storeSettings.domainId, domainId)).get();
  if (existing) {
    db.update(schema.storeSettings)
      .set({ tone, language, audience, authorName: authorName || null, updatedAt: new Date().toISOString() })
      .where(eq(schema.storeSettings.id, existing.id))
      .run();
  } else {
    db.insert(schema.storeSettings)
      .values({ domainId, tone, language, audience, authorName: authorName || null })
      .run();
  }

  // Keep the domain's language in sync — the writer pipeline reads it from there.
  db.update(schema.domains).set({ language }).where(eq(schema.domains.id, domainId)).run();

  return NextResponse.json({ saved: true, tone, language, audience, authorName });
}
