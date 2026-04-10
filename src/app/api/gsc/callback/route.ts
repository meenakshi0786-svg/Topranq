import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, fetchSiteList } from "@/lib/gsc";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

// GET /api/gsc/callback?code=xxx&state=domainId — Handle Google OAuth callback
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const domainId = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/domain/${domainId}/search-console?error=denied`
    );
  }

  if (!code || !domainId) {
    return NextResponse.redirect(
      `${APP_URL}/domain/${domainId || ""}/search-console?error=missing_params`
    );
  }

  try {
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${APP_URL}/domain/${domainId}/search-console?error=no_refresh_token`
      );
    }

    const sites = await fetchSiteList(tokens.refresh_token);

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

    return NextResponse.redirect(
      `${APP_URL}/domain/${domainId}/search-console?connected=true`
    );
  } catch (err) {
    console.error("GSC callback error:", err);
    return NextResponse.redirect(
      `${APP_URL}/domain/${domainId}/search-console?error=auth_failed`
    );
  }
}
