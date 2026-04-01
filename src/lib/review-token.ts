import crypto from "crypto";

const TOKEN_EXPIRY_HOURS = 72; // 3 days
const SECRET = process.env.REVIEW_TOKEN_SECRET || "topranq-review-secret-change-in-prod";

export interface ReviewTokenPayload {
  articleId: string;
  revision: number;
  email: string;
  exp: number; // Unix timestamp
}

/** Generate a signed review token and its hash for DB storage */
export function createReviewToken(articleId: string, revision: number, email: string): {
  token: string;
  tokenHash: string;
  expiresAt: string;
} {
  const exp = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const payload: ReviewTokenPayload = { articleId, revision, email, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
  const token = `${payloadB64}.${signature}`;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(exp).toISOString();

  return { token, tokenHash, expiresAt };
}

/** Verify and decode a review token. Returns null if invalid or expired. */
export function verifyReviewToken(token: string): ReviewTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const payload: ReviewTokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Hash a token for DB lookup */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
