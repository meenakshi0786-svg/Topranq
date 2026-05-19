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

    // Two flows:
    //   1. "app-install" — user installed from Shopify App Store. No Ranqapex domainId yet.
    //   2. legacy — user clicked "Connect Shopify" from within Ranqapex (has domainId).
    if (parsed.flow === "app-install") {
      // Store a global Shopify install record (one per shop) using domainId = "shopify-app:" prefix
      // The merchant will link to a real Ranqapex account later from inside the embedded app.
      const placeholderDomainId = `shopify-app:${shop}`;

      const existing = db
        .select()
        .from(schema.connectors)
        .where(
          and(
            eq(schema.connectors.platform, "shopify"),
            eq(schema.connectors.siteUrl, siteUrl),
          )
        )
        .get();

      if (existing) {
        db.update(schema.connectors)
          .set({
            status: "connected",
            connectedAt: new Date().toISOString(),
            authCredentialsEncrypted: accessToken,
          })
          .where(eq(schema.connectors.id, existing.id))
          .run();
      } else {
        db.insert(schema.connectors)
          .values({
            domainId: placeholderDomainId,
            platform: "shopify",
            siteUrl,
            status: "connected",
            connectedAt: new Date().toISOString(),
            authCredentialsEncrypted: accessToken,
          })
          .run();
      }

      // Redirect to embedded app
      return NextResponse.redirect(`${APP_URL}/api/shopify/app?shop=${encodeURIComponent(shop)}`);
    }

    // Legacy flow: connect from within Ranqapex (requires existing domainId)
    if (!parsed.domainId) {
      return NextResponse.redirect(`${APP_URL}?error=shopify_missing_domain`);
    }
    const domainId = parsed.domainId;

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
