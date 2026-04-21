import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";

// GET /api/auth/google/callback?code=xxx&state=domainId
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const domainId = request.nextUrl.searchParams.get("state") || "";

  console.log("[auth/callback] code present:", !!code, "domainId from state:", JSON.stringify(domainId));

  if (!code) {
    return NextResponse.redirect(`${APP_URL}?error=google_auth_failed`);
  }

  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_AUTH_REDIRECT_URI || `${APP_URL}/api/auth/google/callback`
    );

    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Get user info
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const { data: userInfo } = await oauth2Api.userinfo.get();

    const email = userInfo.email || "";
    const name = userInfo.name || "";

    // Find or create user
    let user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .get();

    if (!user) {
      user = db
        .insert(schema.users)
        .values({
          email,
          name,
          plan: "free",
        })
        .returning()
        .get();
    } else {
      // Update name if changed
      if (name && name !== user.name) {
        db.update(schema.users)
          .set({ name })
          .where(eq(schema.users.id, user.id))
          .run();
      }
    }

    // Transfer domain ownership from demo user to the signed-in user
    if (domainId && domainId !== "undefined" && domainId !== "null") {
      db.update(schema.domains)
        .set({ userId: user.id })
        .where(eq(schema.domains.id, domainId))
        .run();
    }

    // Set auth cookie with user ID — only redirect to domain if we have a valid ID
    const hasValidDomain = domainId && domainId !== "undefined" && domainId !== "null" && domainId.length > 10;
    const redirectUrl = hasValidDomain
      ? `${APP_URL}/domain/${domainId}?autoaudit=true`
      : `${APP_URL}/dashboard`;
    console.log("[auth/callback] hasValidDomain:", hasValidDomain, "redirecting to:", redirectUrl);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("user_id", user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(`${APP_URL}?error=google_auth_failed`);
  }
}
