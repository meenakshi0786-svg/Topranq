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
): { domainId?: string; shop: string; reviewToken?: string; flow?: string } | null {
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
      flow: data.flow || undefined,
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

// ── App Store install flow (no pre-existing Ranqapex domainId required) ──

/**
 * Generate auth URL for the App Store install flow.
 * Different from generateShopifyAuthUrl: no domainId required upfront.
 * The shop is the source of truth.
 */
export function generateAppInstallAuthUrl(shop: string): string {
  const normalized = normalizeShop(shop);
  if (!validateShopDomain(normalized)) {
    throw new Error("Invalid Shopify store domain");
  }

  // State just contains shop + nonce for CSRF protection
  const stateData = JSON.stringify({
    shop: normalized,
    nonce: crypto.randomUUID(),
    flow: "app-install",
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

/**
 * Verify a Shopify webhook HMAC.
 * Required for App Store approval (GDPR webhooks must verify signatures).
 */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const computed = crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

/**
 * Verify an HMAC query-param signature from Shopify admin requests.
 * Used to authenticate embedded app loads.
 */
export function verifyShopifyHmac(searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "hmac" && key !== "signature") params[key] = value;
  });

  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const computed = crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}

/**
 * Look up the stored access token for a shop.
 * Returns null if shop isn't connected.
 */
export async function getShopAccessToken(shop: string): Promise<{ token: string; domainId: string } | null> {
  const { db, schema } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const normalized = normalizeShop(shop);

  const connector = db
    .select()
    .from(schema.connectors)
    .where(
      and(
        eq(schema.connectors.platform, "shopify"),
        eq(schema.connectors.siteUrl, `https://${normalized}`),
      )
    )
    .get();

  if (!connector || !connector.authCredentialsEncrypted) return null;
  return { token: connector.authCredentialsEncrypted, domainId: connector.domainId };
}

/**
 * Publish an article to a Shopify blog as a blog post.
 * Returns the published article URL on success.
 */
export async function publishArticleToShopify(
  shop: string,
  accessToken: string,
  article: { title: string; bodyHtml: string; tags?: string; featuredImageUrl?: string | null }
): Promise<{ url: string; id: number }> {
  // 1. Find or create a default blog
  const blogsRes = await fetch(`https://${shop}/admin/api/2024-01/blogs.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!blogsRes.ok) throw new Error(`Failed to list blogs: ${blogsRes.status}`);
  const blogsData = await blogsRes.json();
  let blogId: number | null = blogsData.blogs?.[0]?.id || null;

  // Create default blog if none exists
  if (!blogId) {
    const createBlogRes = await fetch(`https://${shop}/admin/api/2024-01/blogs.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ blog: { title: "News" } }),
    });
    if (!createBlogRes.ok) throw new Error(`Failed to create blog: ${createBlogRes.status}`);
    const newBlog = await createBlogRes.json();
    blogId = newBlog.blog.id;
  }

  // 2. Publish article
  const body: Record<string, unknown> = {
    article: {
      title: article.title,
      body_html: article.bodyHtml,
      tags: article.tags || "",
      published: true,
    },
  };
  if (article.featuredImageUrl) {
    (body.article as Record<string, unknown>).image = { src: article.featuredImageUrl };
  }

  const postRes = await fetch(
    `https://${shop}/admin/api/2024-01/blogs/${blogId}/articles.json`,
    {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`Failed to publish: ${postRes.status} ${errText}`);
  }

  const result = await postRes.json();
  const articleId = result.article.id;
  const handle = result.article.handle;
  return {
    id: articleId,
    url: `https://${shop.replace(".myshopify.com", "")}/blogs/${blogsData.blogs?.[0]?.handle || "news"}/${handle}`,
  };
}
