import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/agents/orchestrator";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";

// GET /api/auth/google/callback?code=xxx&state=domainId|pending:url
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "";

  if (!code) {
    return NextResponse.redirect(`${APP_URL}?error=google_auth_failed`);
  }

  // Parse state: either a domainId or "pending:https://example.com"
  const isPending = state.startsWith("pending:");
  const pendingDomainUrl = isPending ? state.slice(8) : "";
  const domainId = isPending ? "" : state;

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

    let finalDomainId = domainId;

    // Transfer domain ownership from demo user to the signed-in user
    if (domainId && domainId !== "undefined" && domainId !== "null") {
      db.update(schema.domains)
        .set({ userId: user.id })
        .where(eq(schema.domains.id, domainId))
        .run();
    }

    // If user entered a domain before signing in, create it now
    if (isPending && pendingDomainUrl) {
      let domainUrlNormalized = pendingDomainUrl.trim();
      if (!domainUrlNormalized.startsWith("http")) domainUrlNormalized = "https://" + domainUrlNormalized;
      let parsedUrl: URL;
      try { parsedUrl = new URL(domainUrlNormalized); } catch { parsedUrl = new URL("https://" + pendingDomainUrl); }

      // Check if domain already exists for this user
      const existing = db.select().from(schema.domains).where(eq(schema.domains.userId, user.id)).all()
        .find(d => { try { return new URL(d.domainUrl).hostname.replace("www.", "") === parsedUrl.hostname.replace("www.", ""); } catch { return false; } });

      if (existing) {
        finalDomainId = existing.id;
      } else {
        // Check all domains for orphan transfer
        const orphan = db.select().from(schema.domains).all()
          .find(d => { try { return new URL(d.domainUrl).hostname.replace("www.", "") === parsedUrl.hostname.replace("www.", "") && d.userId !== user.id; } catch { return false; } });
        if (orphan) {
          db.update(schema.domains).set({ userId: user.id }).where(eq(schema.domains.id, orphan.id)).run();
          finalDomainId = orphan.id;
        } else {
          // Create new domain + audit
          const newDomainId = crypto.randomUUID();
          db.insert(schema.domains).values({
            id: newDomainId,
            userId: user.id,
            domainUrl: parsedUrl.origin,
            status: "active",
          }).run();
          const auditRunId = crypto.randomUUID();
          db.insert(schema.auditRuns).values({
            id: auditRunId,
            domainId: newDomainId,
            status: "queued",
            maxPages: 25,
            agentVersion: "1.0.0",
          }).run();
          runPipeline(newDomainId, auditRunId).catch(err => console.error("Pipeline failed:", err));
          finalDomainId = newDomainId;
        }
      }
    }

    // Set auth cookie with user ID — redirect to domain if we have one
    const hasValidDomain = finalDomainId && finalDomainId !== "undefined" && finalDomainId !== "null" && finalDomainId.length > 10;
    const redirectUrl = hasValidDomain
      ? `${APP_URL}/domain/${finalDomainId}`
      : `${APP_URL}/dashboard`;
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("user_id", user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });
    response.cookies.set("logged_in", "1", {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(`${APP_URL}?error=google_auth_failed`);
  }
}
