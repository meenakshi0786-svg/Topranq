// Embedded Shopify app: session-token (App Bridge JWT) verification and
// per-shop account provisioning.
//
// Shopify App Bridge attaches a session token (a short-lived HS256 JWT signed
// with the app's client secret) to requests from inside Shopify admin. We verify
// it server-side to identify the shop — this replaces cookie/Google auth for the
// embedded experience, which App Store review now requires.

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { db, schema } from "./db";
import { eq, and } from "drizzle-orm";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";

// Small clock-skew leeway (seconds) for nbf/exp checks.
const LEEWAY = 5;

export interface SessionTokenClaims {
  shop: string; // e.g. "my-store.myshopify.com"
  dest: string; // e.g. "https://my-store.myshopify.com"
  sub: string; // Shopify user id
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Verify an App Bridge session token. Returns the claims on success, null on any
 * failure (bad signature, wrong audience, expired, malformed). Never throws.
 */
export function verifySessionToken(token: string): SessionTokenClaims | null {
  if (!token || !SHOPIFY_CLIENT_SECRET || !SHOPIFY_CLIENT_ID) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  // 1. Verify HS256 signature over `header.payload`.
  const expected = crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  let provided: Buffer;
  try {
    provided = b64urlToBuffer(sigB64);
  } catch {
    return null;
  }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }

  // 2. Parse and validate claims.
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(b64urlToBuffer(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const aud = payload.aud;
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : 0;
  const dest = typeof payload.dest === "string" ? payload.dest : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";

  if (aud !== SHOPIFY_CLIENT_ID) return null;
  if (exp && now >= exp + LEEWAY) return null;
  if (nbf && now < nbf - LEEWAY) return null;

  // dest must be a valid myshopify host.
  let shop = "";
  try {
    shop = new URL(dest).host.toLowerCase();
  } catch {
    return null;
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return null;

  return { shop, dest, sub };
}

/**
 * Pull and verify the session token from a request's Authorization header
 * (App Bridge sends `Authorization: Bearer <token>`).
 */
export function getShopFromRequest(request: NextRequest): SessionTokenClaims | null {
  const token = getRawSessionToken(request);
  if (!token) return null;
  return verifySessionToken(token);
}

/** Return the raw bearer session token (unverified) for token-exchange use. */
export function getRawSessionToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/**
 * Resolve a usable OFFLINE Admin API token for an embedded request: mint a fresh
 * offline token via token exchange (durable), falling back to any stored token.
 * Returns null only if we have neither.
 */
export async function resolveOfflineToken(
  shop: string,
  sessionToken: string | null,
): Promise<string | null> {
  const { refreshAndStoreOfflineToken, getShopAccessToken } = await import("./shopify");
  if (sessionToken) {
    try {
      return await refreshAndStoreOfflineToken(shop, sessionToken);
    } catch (e) {
      console.error("[resolveOfflineToken] exchange failed, falling back:", e instanceof Error ? e.message : String(e));
    }
  }
  const stored = await getShopAccessToken(shop);
  return stored?.token ?? null;
}

/**
 * Ensure a RanqApex account (user + domain) exists for an installed shop, and
 * that the shop's stored Shopify connector points at that domain. Returns the
 * internal ids the AI features operate on. Idempotent.
 */
export function getOrCreateShopAccount(shop: string): { userId: string; domainId: string } {
  const normalized = shop.trim().toLowerCase();
  const siteUrl = `https://${normalized}`;
  const email = `${normalized}`; // myshopify domain is unique — used as the account key

  // 1. User
  let user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user) {
    user = db
      .insert(schema.users)
      .values({ email, name: normalized, plan: "free" })
      .returning()
      .get();
  }

  // 2. Domain
  let domain = db
    .select()
    .from(schema.domains)
    .where(and(eq(schema.domains.userId, user.id), eq(schema.domains.domainUrl, siteUrl)))
    .get();
  if (!domain) {
    domain = db
      .insert(schema.domains)
      .values({ userId: user.id, domainUrl: siteUrl, status: "active" })
      .returning()
      .get();
  }

  // 3. Point the shop's Shopify connector (created during install) at the real domain.
  const connector = db
    .select()
    .from(schema.connectors)
    .where(and(eq(schema.connectors.platform, "shopify"), eq(schema.connectors.siteUrl, siteUrl)))
    .get();
  if (connector && connector.domainId !== domain.id) {
    db.update(schema.connectors)
      .set({ domainId: domain.id })
      .where(eq(schema.connectors.id, connector.id))
      .run();
  }

  return { userId: user.id, domainId: domain.id };
}
