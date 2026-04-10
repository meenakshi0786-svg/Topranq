import crypto from "crypto";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";
const SHOPIFY_REDIRECT_URI =
  process.env.SHOPIFY_REDIRECT_URI || "https://ranqapex.com/api/shopify/callback";
const SHOPIFY_SCOPES = "write_content,read_content";

export function validateShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

function normalizeShop(input: string): string {
  let shop = input.trim().toLowerCase();
  // Strip protocol
  shop = shop.replace(/^https?:\/\//, "");
  // Strip trailing slash/path
  shop = shop.split("/")[0];
  // Add .myshopify.com if missing
  if (!shop.endsWith(".myshopify.com")) {
    shop = `${shop}.myshopify.com`;
  }
  return shop;
}

function signState(data: string): string {
  return crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(data)
    .digest("hex");
}

export function generateShopifyAuthUrl(
  shop: string,
  domainId: string,
  reviewToken?: string
): string {
  const normalized = normalizeShop(shop);
  if (!validateShopDomain(normalized)) {
    throw new Error("Invalid Shopify store domain");
  }

  const stateData = JSON.stringify({
    domainId,
    shop: normalized,
    reviewToken: reviewToken || "",
    nonce: crypto.randomUUID(),
  });
  const encoded = Buffer.from(stateData).toString("base64url");
  const signature = signState(encoded);
  const state = `${encoded}.${signature}`;

  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: SHOPIFY_SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state,
  });

  return `https://${normalized}/admin/oauth/authorize?${params.toString()}`;
}

export function verifyAndParseState(
  stateParam: string
): { domainId: string; shop: string; reviewToken?: string } | null {
  const [encoded, signature] = stateParam.split(".");
  if (!encoded || !signature) return null;

  const expectedSig = signState(encoded);
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    )
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString());
    return {
      domainId: data.domainId,
      shop: data.shop,
      reviewToken: data.reviewToken || undefined,
    };
  } catch {
    return null;
  }
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}
