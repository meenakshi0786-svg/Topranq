import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getOrCreateUser } from "@/lib/auth";

// POST /api/payments/create-order — create a Razorpay order
export async function POST(request: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { plan } = body as { plan: "dollar1" | "dollar5" };

  if (!plan || !["dollar1", "dollar5"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const user = await getOrCreateUser();

  const amountInCents = plan === "dollar1" ? 100 : 500; // $1 = 100 cents, $5 = 500 cents

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: amountInCents,
      currency: "USD",
      receipt: `${plan}_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        userEmail: user.email,
        plan: plan,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
      userName: user.name || "",
      userEmail: user.email,
      plan: plan,
    });
  } catch (error) {
    console.error("[payments] create-order failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
