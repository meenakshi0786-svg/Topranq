import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// GET /api/auth/google?domainId=xxx&pendingDomain=url — Start Google Sign-In
export async function GET(request: NextRequest) {
  const domainId = request.nextUrl.searchParams.get("domainId") || "";
  const pendingDomain = request.nextUrl.searchParams.get("pendingDomain") || "";

  // Pass both domainId and pendingDomain in state so callback can handle either
  const state = pendingDomain ? `pending:${pendingDomain}` : domainId;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com"}/api/auth/google/callback`
  );

  const url = oauth2.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });

  return NextResponse.redirect(url);
}
