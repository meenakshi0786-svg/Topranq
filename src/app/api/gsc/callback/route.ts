import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, fetchSiteList } from "@/lib/gsc";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// GET /api/gsc/callback?code=xxx&state=domainId — Handle Google OAuth callback
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const domainId = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    // User denied access — redirect back to search console page
    return NextResponse.redirect(
      new URL(`/domain/${domainId}/search-console?error=denied`, request.url)
    );
  }

  if (!code || !domainId) {
    return NextResponse.redirect(
      new URL(`/domain/${domainId || ""}/search-console?error=missing_params`, request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(`/domain/${domainId}/search-console?error=no_refresh_token`, request.url)
      );
    }

    // Get list of verified sites
    const sites = await fetchSiteList(tokens.refresh_token);

    // Store the GSC connection
    // Check if connector already exists
    const existing = db
      .select()
      .from(schema.connectors)
      .where(
        and(
          eq(schema.connectors.domainId, domainId),
          eq(schema.connectors.platform, "wordpress") // Reuse field — we'll check for gsc type below
        )
      )
      .get();

    // Store as a special connector entry
    // We'll use a domain learning to store the refresh token securely
    db.insert(schema.domainLearnings)
      .values({
        domainId,
        learningType: "gsc_connection",
        insight: JSON.stringify({
          refreshToken: tokens.refresh_token,
          sites,
          connectedAt: new Date().toISOString(),
        }),
        dataSource: "google_search_console",
        confidence: 1.0,
      })
      .run();

    // Redirect back to search console page
    return NextResponse.redirect(
      new URL(`/domain/${domainId}/search-console?connected=true`, request.url)
    );
  } catch (err) {
    console.error("GSC callback error:", err);
    return NextResponse.redirect(
      new URL(`/domain/${domainId}/search-console?error=auth_failed`, request.url)
    );
  }
}
