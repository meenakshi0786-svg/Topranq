import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyShopifyWebhook } from "@/lib/shopify";

// POST /api/shopify/webhooks/shop-redact
// GDPR: fires 48h after app is uninstalled — we must delete all data tied to the shop.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain");
  if (!shop) return NextResponse.json({ ok: true });

  // Delete the connector and any publish logs tied to this shop's connectors
  const siteUrl = `https://${shop}`;
  const connectors = db.select().from(schema.connectors).where(eq(schema.connectors.siteUrl, siteUrl)).all();
  for (const c of connectors) {
    db.delete(schema.publishLog).where(eq(schema.publishLog.connectorId, c.id)).run();
    db.delete(schema.connectors).where(eq(schema.connectors.id, c.id)).run();
  }

  console.log(`[shopify webhook] shop/redact: deleted ${connectors.length} connector(s) for ${shop}`);
  return NextResponse.json({ ok: true });
}
