import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyShopifyWebhook } from "@/lib/shopify";

// POST /api/shopify/webhooks/uninstall — app uninstalled by merchant
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain");
  if (!shop) return NextResponse.json({ ok: true });

  // Mark the connector as disconnected
  const siteUrl = `https://${shop}`;
  db.update(schema.connectors)
    .set({ status: "disconnected", authCredentialsEncrypted: null })
    .where(eq(schema.connectors.siteUrl, siteUrl))
    .run();

  console.log(`[shopify webhook] App uninstalled from ${shop}`);
  return NextResponse.json({ ok: true });
}
