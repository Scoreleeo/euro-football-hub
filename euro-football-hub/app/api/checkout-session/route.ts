import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return NextResponse.json({
    id: session.id,
    payment_status: session.payment_status,
    status: session.status,
    metadata: session.metadata,
    customer_details: session.customer_details,
  });
}