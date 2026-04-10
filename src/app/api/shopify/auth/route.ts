import { NextRequest, NextResponse } from "next/server";
import { generateShopifyAuthUrl, validateShopDomain } from "@/lib/shopify";

// GET /api/shopify/auth?shop=xxx&domainId=xxx&reviewToken=xxx
export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");
  const domainId = request.nextUrl.searchParams.get("domainId");
  const reviewToken = request.nextUrl.searchParams.get("reviewToken") || undefined;

  if (!shop || !domainId) {
    return NextResponse.json({ error: "Missing shop or domainId" }, { status: 400 });
  }

  // Normalize: strip protocol, add .myshopify.com if needed
  let normalized = shop.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!normalized.endsWith(".myshopify.com")) {
    normalized = `${normalized}.myshopify.com`;
  }

  if (!validateShopDomain(normalized)) {
    return NextResponse.json({ error: "Invalid Shopify store domain" }, { status: 400 });
  }

  try {
    const url = generateShopifyAuthUrl(normalized, domainId, reviewToken);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create auth URL" },
      { status: 500 }
    );
  }
}
