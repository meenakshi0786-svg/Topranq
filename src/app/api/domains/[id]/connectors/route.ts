import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// GET /api/domains/:id/connectors — list connectors
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const connectors = db
    .select({
      id: schema.connectors.id,
      platform: schema.connectors.platform,
      siteUrl: schema.connectors.siteUrl,
      status: schema.connectors.status,
      connectedAt: schema.connectors.connectedAt,
    })
    .from(schema.connectors)
    .where(eq(schema.connectors.domainId, id))
    .all();

  return NextResponse.json(connectors);
}

// POST /api/domains/:id/connectors — add a connector
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { platform, siteUrl, apiToken, username, password } = body as {
    platform: string;
    siteUrl: string;
    apiToken?: string;
    username?: string;
    password?: string;
  };

  if (!platform || !siteUrl) {
    return NextResponse.json({ error: "Missing platform or siteUrl" }, { status: 400 });
  }

  const validPlatforms = ["wordpress", "shopify", "webflow", "webhook"];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // Build auth payload — WordPress uses username + app password, others use token
  let authPayload: string | null = apiToken || null;
  if (platform === "wordpress") {
    if (!username || !password) {
      return NextResponse.json(
        { error: "WordPress requires username and application password" },
        { status: 400 }
      );
    }
    authPayload = JSON.stringify({ username, password });
  }

  // Check if connector already exists for this platform
  const existing = db
    .select()
    .from(schema.connectors)
    .where(
      and(
        eq(schema.connectors.domainId, id),
        eq(schema.connectors.platform, platform as "wordpress" | "shopify" | "webflow" | "webhook")
      )
    )
    .get();

  if (existing) {
    db.update(schema.connectors)
      .set({
        siteUrl,
        status: "connected",
        connectedAt: new Date().toISOString(),
        authCredentialsEncrypted: authPayload || existing.authCredentialsEncrypted,
      })
      .where(eq(schema.connectors.id, existing.id))
      .run();
    return NextResponse.json({ ...existing, siteUrl, status: "connected" });
  }

  const connector = db
    .insert(schema.connectors)
    .values({
      domainId: id,
      platform: platform as "wordpress" | "shopify" | "webflow" | "webhook",
      siteUrl,
      status: "connected",
      connectedAt: new Date().toISOString(),
      authCredentialsEncrypted: authPayload,
    })
    .returning()
    .get();

  return NextResponse.json(connector);
}

// DELETE /api/domains/:id/connectors — disconnect a connector
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { connectorId } = await request.json();

  if (!connectorId) {
    return NextResponse.json({ error: "Missing connectorId" }, { status: 400 });
  }

  db.update(schema.connectors)
    .set({ status: "disconnected" })
    .where(
      and(
        eq(schema.connectors.id, connectorId),
        eq(schema.connectors.domainId, id)
      )
    )
    .run();

  return NextResponse.json({ disconnected: true });
}
