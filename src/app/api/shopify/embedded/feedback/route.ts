import { NextRequest, NextResponse } from "next/server";
import { getShopFromRequest } from "@/lib/shopify-embedded";
import { sendFeatureRequestEmail } from "@/lib/email";

// POST /api/shopify/embedded/feedback — in-app feature request form.
export async function POST(request: NextRequest) {
  const claims = getShopFromRequest(request);
  if (!claims) return NextResponse.json({ error: "Invalid session token" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clean = (v: unknown, len: number) => (typeof v === "string" ? v.trim().slice(0, len) : "");
  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const feature = clean(body.feature, 120);
  const message = clean(body.message, 2000);
  if (!message && !feature) return NextResponse.json({ error: "Tell us a little about your idea first." }, { status: 400 });

  await sendFeatureRequestEmail({ shop: claims.shop, name, email, feature, message }).catch(() => {});
  return NextResponse.json({ sent: true });
}
