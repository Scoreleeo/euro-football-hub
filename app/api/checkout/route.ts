import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

type CheckoutBody =
| {
type: "division";
league?: string;
}
| {
type: "match";
fixtureId: number;
home: string;
away: string;
league?: string;
};

export async function POST(request: NextRequest) {
try {
const body = (await request.json()) as CheckoutBody;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const isDivision = body.type === "division";

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  success_url: `${appUrl}/predictions/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/predictions`,
  line_items: [
    {
      price_data: {
        currency: "gbp",
        product_data: {
          name: isDivision
            ? `Pro Football Intel Division Pass${body.league ? ` - ${body.league}` : ""}`
            : `Pro Football Intel Match Unlock - ${body.home} vs ${body.away}`,
          description: isDivision
            ? "Unlock every prediction in the current league"
            : "Unlock a single premium prediction",
        },
        unit_amount: isDivision ? 999 : 199,
      },
      quantity: 1,
    },
  ],
  metadata: isDivision
    ? {
        purchase_type: "division",
        league: body.league || "",
      }
    : {
        purchase_type: "match",
        fixture_id: String(body.fixtureId),
        home: body.home,
        away: body.away,
        league: body.league || "",
      },
});

return NextResponse.json({ url: session.url });

} catch (error) {
console.error(error);
return NextResponse.json(
{ error: "Failed to create checkout session" },
{ status: 500 }
);
}
}