import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// GET /api/auth/google?domainId=xxx — Start Google Sign-In
export async function GET(request: NextRequest) {
  const domainId = request.nextUrl.searchParams.get("domainId") || "";

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com"}/api/auth/google/callback`
  );

  const url = oauth2.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state: domainId,
  });

  return NextResponse.redirect(url);
}
