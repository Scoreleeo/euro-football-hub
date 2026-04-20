import { NextResponse } from "next/server";
import { apiFootballFetch } from "@/lib/api-football/client";

export async function GET() {
  try {
    const data = await apiFootballFetch<any>("/fixtures", {
      live: "all",
    });

    const liveMatches = data.response.map((match: any) => ({
      fixtureId: match.fixture.id,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      goals: {
        home: match.goals.home,
        away: match.goals.away,
      },
      time: match.fixture.status.elapsed,
    }));

    return NextResponse.json({ live: liveMatches });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch live matches" },
      { status: 500 }
    );
  }
}