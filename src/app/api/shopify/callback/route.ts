import { NextRequest, NextResponse } from "next/server";
import { verifyAndParseState, exchangeCodeForToken } from "@/lib/shopify";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";

// GET /api/shopify/callback?code=xxx&shop=xxx&state=xxx
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const shop = request.nextUrl.searchParams.get("shop");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !shop || !state) {
    return NextResponse.redirect(`${APP_URL}?error=shopify_missing_params`);
  }

  // Verify state (CSRF protection)
  const parsed = verifyAndParseState(state);
  if (!parsed) {
    return NextResponse.redirect(`${APP_URL}?error=shopify_invalid_state`);
  }

  // Verify shop matches state
  if (shop !== parsed.shop) {
    return NextResponse.redirect(`${APP_URL}?error=shopify_shop_mismatch`);
  }

  try {
    // Exchange code for permanent access token
    const accessToken = await exchangeCodeForToken(shop, code);

    const siteUrl = `https://${shop}`;
    const domainId = parsed.domainId;

    // Upsert connector
    const existing = db
      .select()
      .from(schema.connectors)
      .where(
        and(
          eq(schema.connectors.domainId, domainId),
          eq(schema.connectors.platform, "shopify")
        )
      )
      .get();

    if (existing) {
      db.update(schema.connectors)
        .set({
          siteUrl,
          status: "connected",
          connectedAt: new Date().toISOString(),
          authCredentialsEncrypted: accessToken,
        })
        .where(eq(schema.connectors.id, existing.id))
        .run();
    } else {
      db.insert(schema.connectors)
        .values({
          domainId,
          platform: "shopify",
          siteUrl,
          status: "connected",
          connectedAt: new Date().toISOString(),
          authCredentialsEncrypted: accessToken,
        })
        .run();
    }

    // Redirect back to review page or connectors page
    if (parsed.reviewToken) {
      return NextResponse.redirect(`${APP_URL}/review/${parsed.reviewToken}?shopify=connected`);
    }
    return NextResponse.redirect(`${APP_URL}/domain/${domainId}/connectors?shopify=connected`);
  } catch (error) {
    console.error("Shopify OAuth error:", error);
    if (parsed.reviewToken) {
      return NextResponse.redirect(`${APP_URL}/review/${parsed.reviewToken}?error=shopify_auth_failed`);
    }
    return NextResponse.redirect(`${APP_URL}?error=shopify_auth_failed`);
  }
}
