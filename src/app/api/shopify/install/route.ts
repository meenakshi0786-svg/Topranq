import { NextRequest, NextResponse } from "next/server";
import { generateAppInstallAuthUrl, validateShopDomain, verifyShopifyHmac } from "@/lib/shopify";

// GET /api/shopify/install?shop=xxx.myshopify.com&...
// Entry point when a merchant clicks "Install app" from the Shopify App Store
// OR when Shopify redirects to the configured App URL.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const shop = sp.get("shop") || "";

  if (!shop || !validateShopDomain(shop)) {
    return NextResponse.json({ error: "Missing or invalid shop parameter" }, { status: 400 });
  }

  // Verify HMAC if present (Shopify signs install requests from App Store)
  if (sp.get("hmac") && !verifyShopifyHmac(sp)) {
    console.error("[shopify install] HMAC verify failed. query=", request.nextUrl.search);
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
  }

  // Always (re)run OAuth so the stored token reflects the app's CURRENT scopes
  // (write_content, read_content, read_products). Previously this short-circuited
  // when any token already existed, which meant a reinstall never re-granted —
  // leaving an under-scoped token that 403'd on the blog API. If the merchant has
  // already approved these scopes, Shopify re-grants silently and redirects back.
  const authUrl = generateAppInstallAuthUrl(shop);
  return NextResponse.redirect(authUrl);
}
