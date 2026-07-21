import crypto from "crypto";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";
const SHOPIFY_REDIRECT_URI =
  process.env.SHOPIFY_REDIRECT_URI || "https://ranqapex.com/api/shopify/callback";
const SHOPIFY_SCOPES = "write_content,read_content,read_products";
// Shopify Admin API version. Keep within Shopify's ~12-month support window.
export const SHOPIFY_API_VERSION = "2025-10";

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

/**
 * Exchange a valid App Bridge session token for a durable OFFLINE Admin API
 * access token (shpat_).
 *
 * Why this exists: the classic OAuth redirect was yielding short-lived ONLINE
 * tokens (shpua_) that expire in ~24h, which broke publishing every day. Token
 * exchange lets the embedded app mint an offline token on demand from the
 * session token it already has on every request — the reliable modern pattern.
 */
export async function exchangeSessionTokenForOfflineToken(
  shop: string,
  sessionToken: string,
): Promise<string> {
  // Shopify's token-exchange endpoint expects form-encoded params — sending JSON
  // causes requested_token_type to be ignored and an ONLINE token issued instead.
  const body = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    client_secret: SHOPIFY_CLIENT_SECRET,
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: sessionToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
  });
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[token-exchange] HTTP error", res.status, text.slice(0, 300));
    throw new Error(`Token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("Token exchange returned no access_token");
  // Note: this app's install grant yields online-prefixed tokens (shpua_) even when
  // we request offline — both classic OAuth and token exchange behave this way here.
  // That's fine: callers re-mint on every Admin API operation (the session token is
  // always present on embedded requests), so the token is always fresh and never goes
  // stale. We deliberately do NOT reject by prefix — doing so forced a fallback to the
  // stale stored token, which was the original cause of daily publish failures.
  return data.access_token as string;
}

/**
 * Mint a fresh offline token via token exchange and persist it on the shop's
 * connector (overwriting any stale/online token). Returns the offline token.
 */
export async function refreshAndStoreOfflineToken(
  shop: string,
  sessionToken: string,
): Promise<string> {
  const normalized = normalizeShop(shop);
  const token = await exchangeSessionTokenForOfflineToken(normalized, sessionToken);

  const { db, schema } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const siteUrl = `https://${normalized}`;
  const connector = db
    .select()
    .from(schema.connectors)
    .where(and(eq(schema.connectors.platform, "shopify"), eq(schema.connectors.siteUrl, siteUrl)))
    .get();
  if (connector) {
    db.update(schema.connectors)
      .set({ authCredentialsEncrypted: token, status: "connected", connectedAt: new Date().toISOString() })
      .where(eq(schema.connectors.id, connector.id))
      .run();
  }
  return token;
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

  // Shopify signs the message with sorted key=value pairs, where values are
  // the *raw* (URL-decoded) values — but base64 padding `=` is left intact.
  // The trick: build the message from the *original* query string ordering
  // rather than re-encoding, so characters like `=` in the `host` param match.
  const params: [string, string][] = [];
  searchParams.forEach((value, key) => {
    if (key !== "hmac" && key !== "signature") params.push([key, value]);
  });
  params.sort((a, b) => a[0].localeCompare(b[0]));
  const message = params.map(([k, v]) => `${k}=${v}`).join("&");

  const computed = crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  try {
    if (crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hmac, "hex"))) {
      return true;
    }
  } catch {}

  // Fallback: some Shopify endpoints sign URL-encoded values. Try that too.
  const encodedMessage = params
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .join("&");
  const encodedComputed = crypto
    .createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(encodedMessage)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(encodedComputed, "hex"), Buffer.from(hmac, "hex"));
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
 * Fetch a few products from a connected store via the Admin API (needs the
 * read_products scope). Best-effort: returns [] on any failure.
 */
export async function fetchStoreProducts(
  shop: string,
  accessToken: string,
  limit = 8,
): Promise<Array<{ title: string; description: string; url: string; price: string | null }>> {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${limit}&fields=id,title,handle,body_html,variants`,
      { headers: { "X-Shopify-Access-Token": accessToken } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const storeHandle = shop.replace(".myshopify.com", "");
    return (data.products || []).map((p: Record<string, unknown>) => {
      const variants = (p.variants as Array<{ price?: string }>) || [];
      const body = typeof p.body_html === "string" ? p.body_html.replace(/<[^>]+>/g, " ").trim() : "";
      return {
        title: String(p.title || ""),
        description: body.slice(0, 200),
        url: `https://${storeHandle}.myshopify.com/products/${p.handle}`,
        price: variants[0]?.price ? String(variants[0].price) : null,
      };
    });
  } catch {
    return [];
  }
}

/** Fetch the store's display name via the Admin API. Best-effort: null on failure. */
export async function fetchShopName(shop: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json?fields=name`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = data?.shop?.name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the store's collections (custom + smart) via the Admin API (needs the
 * read_products scope). Best-effort: returns [] on any failure.
 */
export async function fetchStoreCollections(
  shop: string,
  accessToken: string,
  limit = 50,
): Promise<Array<{ title: string; handle: string; description: string; url: string; productCount: number | null }>> {
  const storeHandle = shop.replace(".myshopify.com", "");
  const headers = { "X-Shopify-Access-Token": accessToken };
  const out: Array<{ title: string; handle: string; description: string; url: string; productCount: number | null }> = [];

  for (const kind of ["custom_collections", "smart_collections"]) {
    try {
      const res = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/${kind}.json?limit=${limit}&fields=id,title,handle,body_html,products_count`,
        { headers },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const rows = (data[kind] || []) as Array<Record<string, unknown>>;
      for (const c of rows) {
        const body = typeof c.body_html === "string" ? c.body_html.replace(/<[^>]+>/g, " ").trim() : "";
        out.push({
          title: String(c.title || ""),
          handle: String(c.handle || ""),
          description: body.slice(0, 300),
          url: `https://${storeHandle}.myshopify.com/collections/${c.handle}`,
          productCount: typeof c.products_count === "number" ? c.products_count : null,
        });
      }
    } catch {
      // best-effort per collection type
    }
  }
  return out;
}

/** A featured image is only usable by Shopify if it's a public http(s) URL. */
function isPublicImageUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.startsWith("127.") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
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
  const blogsRes = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!blogsRes.ok) {
    const errText = await blogsRes.text().catch(() => "");
    throw new Error(`Failed to list blogs: ${blogsRes.status} ${errText.slice(0, 300)}`);
  }
  const blogsData = await blogsRes.json();
  let blogId: number | null = blogsData.blogs?.[0]?.id || null;

  // Create default blog if none exists
  if (!blogId) {
    const createBlogRes = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ blog: { title: "News" } }),
    });
    if (!createBlogRes.ok) {
      const errText = await createBlogRes.text().catch(() => "");
      throw new Error(`Failed to create blog: ${createBlogRes.status} ${errText.slice(0, 300)}`);
    }
    const newBlog = await createBlogRes.json();
    blogId = newBlog.blog.id;
  }

  // 2. Publish article. Only attach the featured image if it's a public http(s)
  // URL Shopify can fetch — and if Shopify still rejects the image, retry without
  // it so a bad/unreachable image never blocks publishing the article.
  const articleUrl = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/blogs/${blogId}/articles.json`;
  const imageOk = isPublicImageUrl(article.featuredImageUrl);

  const postArticle = (includeImage: boolean) => {
    const articleBody: Record<string, unknown> = {
      title: article.title,
      body_html: article.bodyHtml,
      tags: article.tags || "",
      published: true,
    };
    if (includeImage && article.featuredImageUrl) {
      articleBody.image = { src: article.featuredImageUrl };
    }
    return fetch(articleUrl, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ article: articleBody }),
    });
  };

  let postRes = await postArticle(imageOk);
  if (!postRes.ok && imageOk) {
    const errText = await postRes.text().catch(() => "");
    // If the failure is about the image, retry without it.
    if (/image/i.test(errText)) {
      postRes = await postArticle(false);
    } else {
      throw new Error(`Failed to publish: ${postRes.status} ${errText.slice(0, 300)}`);
    }
  }
  if (!postRes.ok) {
    const errText = await postRes.text().catch(() => "");
    throw new Error(`Failed to publish: ${postRes.status} ${errText.slice(0, 300)}`);
  }

  const result = await postRes.json();
  const articleId = result.article.id;
  const handle = result.article.handle;
  // Use the full shop domain — stripping ".myshopify.com" produces an invalid host.
  return {
    id: articleId,
    url: `https://${shop}/blogs/${blogsData.blogs?.[0]?.handle || "news"}/${handle}`,
  };
}
