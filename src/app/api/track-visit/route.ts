import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

// Simple in-memory cache: ip -> { country, city, ts }
// Avoids hammering ip-api.com for the same visitor's repeated page views.
const ipCache = new Map<string, { country: string; city: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function lookupIpLocation(ip: string): Promise<{ country: string; city: string }> {
  const now = Date.now();
  const cached = ipCache.get(ip);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return { country: cached.country, city: cached.city };
  }

  // Skip private/local IPs
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) {
    return { country: "Local", city: "" };
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { country: "", city: "" };
    const data = await res.json() as { status?: string; country?: string; city?: string };
    if (data.status === "success") {
      const result = { country: data.country || "", city: data.city || "" };
      ipCache.set(ip, { ...result, ts: now });
      return result;
    }
  } catch { /* fall through */ }

  return { country: "", city: "" };
}

// POST /api/track-visit — log a page view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = (body.path as string || "/").slice(0, 500);
    const sessionId = (body.sessionId as string || "").slice(0, 100);
    const visitorId = (body.visitorId as string || "").slice(0, 100) || null;
    const referer = (body.referer as string || "").slice(0, 500);
    if (!sessionId || !path) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Skip private/admin paths
    if (path.startsWith("/admin") || path.startsWith("/api/")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Get IP from headers (nginx forwards via x-forwarded-for)
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      || request.headers.get("x-real-ip")
      || "";

    // Truncate user-agent
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 300);

    // Resolve country (cached, never blocks visitor)
    const { country, city } = await lookupIpLocation(ip);

    db.insert(schema.visitorLogs)
      .values({
        visitorId,
        sessionId,
        path,
        country: country || null,
        city: city || null,
        referer: referer || null,
        userAgent: userAgent || null,
      })
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track-visit] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
