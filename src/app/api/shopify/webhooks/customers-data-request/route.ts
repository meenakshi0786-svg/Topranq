import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify";

// POST /api/shopify/webhooks/customers-data-request
// GDPR: merchant requests a customer's data we have on file.
// Ranqapex does NOT store any merchant-customer PII — we only store the merchant
// (shop) connection. Return 200 to acknowledge.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log(`[shopify webhook] customers/data_request from ${request.headers.get("x-shopify-shop-domain")}`);
  return NextResponse.json({ ok: true, message: "Ranqapex does not store merchant customer data." });
}
