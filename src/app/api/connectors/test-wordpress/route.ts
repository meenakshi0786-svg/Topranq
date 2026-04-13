import { NextRequest, NextResponse } from "next/server";

// POST /api/connectors/test-wordpress
// Body: { siteUrl, username, password }
// Verifies the credentials work by calling /wp-json/wp/v2/users/me
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { siteUrl, username, password } = body as {
    siteUrl?: string;
    username?: string;
    password?: string;
  };

  if (!siteUrl || !username || !password) {
    return NextResponse.json({ error: "Missing siteUrl, username, or password" }, { status: 400 });
  }

  const baseUrl = siteUrl.replace(/\/$/, "").startsWith("http")
    ? siteUrl.replace(/\/$/, "")
    : `https://${siteUrl.replace(/\/$/, "")}`;

  const basicAuth = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
      headers: { "Authorization": basicAuth },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json(
          { error: "Invalid credentials. Check username and application password." },
          { status: 401 }
        );
      }
      if (res.status === 404) {
        return NextResponse.json(
          { error: "REST API not found. Is this a WordPress site? Ensure /wp-json/ is enabled." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `WordPress returned ${res.status}. Check the site URL.` },
        { status: res.status }
      );
    }

    const user = await res.json();
    return NextResponse.json({
      ok: true,
      username: user.name || user.slug || username,
      roles: user.roles || [],
      baseUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reach site" },
      { status: 500 }
    );
  }
}
