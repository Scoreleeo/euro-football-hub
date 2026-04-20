import { NextRequest, NextResponse } from "next/server";
import { hasDivisionPurchase, hasMatchPurchase, getPurchases } from "@/lib/purchases";

export async function GET(request: NextRequest) {
const fixtureId = request.nextUrl.searchParams.get("fixtureId");
const league = request.nextUrl.searchParams.get("league");
const all = request.nextUrl.searchParams.get("all");

if (all === "1") {
const purchases = await getPurchases();
return NextResponse.json({ purchases });
}

if (fixtureId) {
const unlocked = await hasMatchPurchase(Number(fixtureId));
return NextResponse.json({ unlocked });
}

if (league) {
const unlocked = await hasDivisionPurchase(league);
return NextResponse.json({ unlocked });
}

return NextResponse.json(
{ error: "Provide fixtureId, league, or all=1" },
{ status: 400 }
);
}