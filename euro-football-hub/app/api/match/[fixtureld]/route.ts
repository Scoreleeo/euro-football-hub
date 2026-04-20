import { NextRequest, NextResponse } from "next/server";
import { apiFootballFetch } from "@/lib/api-football/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // 🔥 FIX: extract fixtureId manually from URL
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const fixtureId = parts[parts.length - 1];

    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixture id" }, { status: 400 });
    }

    console.log("Fetching match:", fixtureId);

    const fixtureRaw = await apiFootballFetch<any>("/fixtures", {
      ids: fixtureId,
    });

    const fixture = fixtureRaw?.response?.[0];

    if (!fixture) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({
      match: {
        fixtureId: fixture.fixture?.id,
        date: fixture.fixture?.date,
        referee: fixture.fixture?.referee || "-",
        venue: fixture.fixture?.venue?.name || "-",
        city: fixture.fixture?.venue?.city || "-",
        statusShort: fixture.fixture?.status?.short || "",
        statusLong: fixture.fixture?.status?.long || "",
        elapsed: fixture.fixture?.status?.elapsed ?? null,
        leagueName: fixture.league?.name || "Competition",
        leagueRound: fixture.league?.round || "",
        leagueLogo: fixture.league?.logo,
        homeTeam: fixture.teams?.home?.name || "Home",
        awayTeam: fixture.teams?.away?.name || "Away",
        homeLogo: fixture.teams?.home?.logo,
        awayLogo: fixture.teams?.away?.logo,
        homeGoals: fixture.goals?.home ?? 0,
        awayGoals: fixture.goals?.away ?? 0,
      },
    });
  } catch (error: any) {
    console.error("MATCH DETAIL ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load match details" },
      { status: 500 }
    );
  }
}