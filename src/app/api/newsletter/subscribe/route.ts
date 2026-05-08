import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string || "").trim().toLowerCase().slice(0, 200);
    const source = (body.source as string || "landing").slice(0, 100);

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    // Check if already subscribed
    const existing = db.select().from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, email)).get();
    if (existing) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    db.insert(schema.newsletterSubscribers).values({ email, source }).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter/subscribe] failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
