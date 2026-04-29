import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/auth";
import { sendPaymentConfirmationEmail } from "@/lib/email";

// POST /api/payments/verify — verify payment and upgrade user plan
export async function POST(request: NextRequest) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
  }

  const body = await request.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
  } = body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan: "dollar1" | "dollar5";
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  // Verify signature
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    console.error("[payments] Signature verification failed");
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Payment verified — upgrade user plan
  const user = await getOrCreateUser();

  db.update(schema.users)
    .set({ plan: plan, planPurchasedAt: new Date().toISOString() })
    .where(eq(schema.users.id, user.id))
    .run();

  console.log(`[payments] User ${user.email} upgraded to ${plan} (payment: ${razorpay_payment_id})`);

  // Send payment confirmation email (don't block response)
  sendPaymentConfirmationEmail(user.email, user.name || "", plan, razorpay_payment_id).catch(err => {
    console.error("[payments] Failed to send confirmation email:", err);
  });

  return NextResponse.json({
    success: true,
    plan: plan,
    message: `Successfully upgraded to ${plan === "dollar1" ? "$1" : "$5"} Plan`,
  });
}
