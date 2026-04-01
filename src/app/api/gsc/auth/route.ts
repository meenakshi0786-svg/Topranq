import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gsc";

// GET /api/gsc/auth?domainId=xxx — Start Google OAuth flow
export async function GET(request: NextRequest) {
  const domainId = request.nextUrl.searchParams.get("domainId");
  if (!domainId) {
    return NextResponse.json({ error: "Missing domainId" }, { status: 400 });
  }

  try {
    const url = getAuthUrl(domainId);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create auth URL" },
      { status: 500 }
    );
  }
}
