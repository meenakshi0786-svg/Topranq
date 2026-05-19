import { NextRequest, NextResponse } from "next/server";
import { generateAppInstallAuthUrl, validateShopDomain, verifyShopifyHmac, getShopAccessToken } from "@/lib/shopify";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";

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

  // If the shop is already connected, redirect to the embedded app
  const existing = await getShopAccessToken(shop);
  if (existing) {
    return NextResponse.redirect(`${APP_URL}/api/shopify/app?shop=${encodeURIComponent(shop)}`);
  }

  // Otherwise begin OAuth
  const authUrl = generateAppInstallAuthUrl(shop);
  return NextResponse.redirect(authUrl);
}
