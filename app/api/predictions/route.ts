import { NextRequest, NextResponse } from "next/server";
import { apiFootballFetch } from "@/lib/api-football/client";
import { buildMatchFeatures } from "@/lib/predictions/features";
import { buildPrediction } from "@/lib/predictions/model";

function formatScoreline(match: any) {
  const homeName = match.teams?.home?.name || "Home";
  const awayName = match.teams?.away?.name || "Away";
  const homeGoals = match.goals?.home ?? 0;
  const awayGoals = match.goals?.away ?? 0;
  return `${homeName} ${homeGoals}-${awayGoals} ${awayName}`;
}

export async function GET(request: NextRequest) {
  try {
    const league = Number(request.nextUrl.searchParams.get("league") || 39);
    const season = Number(request.nextUrl.searchParams.get("season") || 2025);

    const fixturesRaw = await apiFootballFetch<any>("/fixtures", {
      league,
      season,
      status: "NS",
    });

    const upcomingMatches = (fixturesRaw.response || []).slice(0, 12);

    const standingsRaw = await apiFootballFetch<any>("/standings", {
      league,
      season,
    });

    const matches = await Promise.all(
      upcomingMatches.map(async (match: any) => {
        const homeTeamId = match.teams.home.id;
        const awayTeamId = match.teams.away.id;

        const [
          homeRecentFixturesRaw,
          awayRecentFixturesRaw,
          homeInjuriesRaw,
          awayInjuriesRaw,
          h2hRaw,
        ] = await Promise.all([
          apiFootballFetch<any>("/fixtures", {
            team: homeTeamId,
            league,
            season,
            last: 5,
          }),
          apiFootballFetch<any>("/fixtures", {
            team: awayTeamId,
            league,
            season,
            last: 5,
          }),
          apiFootballFetch<any>("/injuries", {
            team: homeTeamId,
            league,
            season,
          }),
          apiFootballFetch<any>("/injuries", {
            team: awayTeamId,
            league,
            season,
          }),
          apiFootballFetch<any>("/fixtures/headtohead", {
            h2h: `${homeTeamId}-${awayTeamId}`,
            league,
            last: 10,
          }),
        ]);

        const h2hMatches = h2hRaw?.response || [];
        const completedH2hMatches = h2hMatches.filter(
          (item: any) => item.fixture?.status?.short === "FT"
        );

        const lastMeeting =
          completedH2hMatches.length > 0
            ? formatScoreline(completedH2hMatches[0])
            : null;

        const lastVenueMeetingMatch = completedH2hMatches.find(
          (item: any) =>
            item.teams?.home?.id === homeTeamId &&
            item.teams?.away?.id === awayTeamId
        );

        const lastVenueMeeting = lastVenueMeetingMatch
          ? formatScoreline(lastVenueMeetingMatch)
          : null;

        const features = buildMatchFeatures({
          homeTeamId,
          homeTeamName: match.teams.home.name,
          awayTeamId,
          awayTeamName: match.teams.away.name,
          homeRecentFixturesRaw,
          awayRecentFixturesRaw,
          standingsRaw,
          homeInjuriesRaw,
          awayInjuriesRaw,
        });

        const prediction = buildPrediction(features, {
          lastMeeting,
          lastVenueMeeting,
        });

        return {
          fixtureId: match.fixture.id,
          home: match.teams.home.name,
          away: match.teams.away.name,
          homeLogo: match.teams.home.logo,
          awayLogo: match.teams.away.logo,
          league: match.league.name,
          date: match.fixture.date,
          prediction,
        };
      })
    );

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("PREDICTIONS ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    );
  }
}