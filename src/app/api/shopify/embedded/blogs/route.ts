import { NextRequest, NextResponse } from "next/server";
import { getShopFromRequest, getRawSessionToken, resolveOfflineToken } from "@/lib/shopify-embedded";
import { fetchStoreBlogs } from "@/lib/shopify";

// GET /api/shopify/embedded/blogs — the store's blogs, for the Autopilot blog picker.
export async function GET(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  const token = await resolveOfflineToken(claims.shop, getRawSessionToken(request));
  if (!token) return NextResponse.json({ blogs: [] });
  const blogs = await fetchStoreBlogs(claims.shop, token);
  return NextResponse.json({ blogs });
}
