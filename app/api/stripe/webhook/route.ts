import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { savePurchase } from "@/lib/purchases";

export async function POST(request: NextRequest) {
const signature = request.headers.get("stripe-signature");

if (!signature) {
return NextResponse.json(
{ error: "Missing Stripe-Signature header" },
{ status: 400 }
);
}

const body = await request.text();

let event: Stripe.Event;

try {
event = stripe.webhooks.constructEvent(
body,
signature,
process.env.STRIPE_WEBHOOK_SECRET!
);
} catch (err) {
console.error("Webhook signature verification failed:", err);
return NextResponse.json(
{ error: "Invalid webhook signature" },
{ status: 400 }
);
}

try {
if (event.type === "checkout.session.completed") {
const session = event.data.object as Stripe.Checkout.Session;

  const purchaseType = session.metadata?.purchase_type;
  const league = session.metadata?.league || "";
  const paymentStatus = session.payment_status || "unpaid";

  if (purchaseType === "division") {
    await savePurchase({
      id: crypto.randomUUID(),
      type: "division",
      league,
      sessionId: session.id,
      createdAt: new Date().toISOString(),
      paymentStatus,
    });
  }

  if (purchaseType === "match") {
    await savePurchase({
      id: crypto.randomUUID(),
      type: "match",
      fixtureId: Number(session.metadata?.fixture_id || 0),
      league,
      sessionId: session.id,
      createdAt: new Date().toISOString(),
      paymentStatus,
    });
  }
}

return NextResponse.json({ received: true });

} catch (error) {
console.error("Webhook handler error:", error);
return NextResponse.json(
{ error: "Webhook handler failed" },
{ status: 500 }
);
}
}