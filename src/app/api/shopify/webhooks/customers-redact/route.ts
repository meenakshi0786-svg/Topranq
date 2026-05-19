import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify";

// POST /api/shopify/webhooks/customers-redact
// GDPR: merchant requests we delete a customer's data.
// We don't store customer-level PII, so nothing to delete. Acknowledge.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log(`[shopify webhook] customers/redact from ${request.headers.get("x-shopify-shop-domain")}`);
  return NextResponse.json({ ok: true });
}
