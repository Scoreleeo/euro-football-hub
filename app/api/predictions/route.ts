import { NextRequest, NextResponse } from "next/server";
import { apiFootballFetch } from "@/lib/api-football/client";
import { buildMatchFeatures } from "@/lib/predictions/features";
import { buildPrediction } from "@/lib/predictions/model";

type LikelyScore = {
  score: string;
  probability: number;
};

type ScoreMarket = {
  score: string;
  modelProbability: number;
  bookmaker?: string | null;
  odds?: number | null;
  marketProbability?: number | null;
  edge?: number | null;
  valueLabel: "STRONG_VALUE" | "SMALL_VALUE" | "NO_VALUE" | "NO_ODDS";
};

function formatScoreline(match: any) {
  const homeName = match.teams?.home?.name || "Home";
  const awayName = match.teams?.away?.name || "Away";
  const homeGoals = match.goals?.home ?? 0;
  const awayGoals = match.goals?.away ?? 0;
  return `${homeName} ${homeGoals}-${awayGoals} ${awayName}`;
}

function normalizeScoreLabel(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/:/g, "-")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .toLowerCase();
}

function parseOddValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : null;
}

function buildValueLabel(edge: number | null): ScoreMarket["valueLabel"] {
  if (edge === null) return "NO_ODDS";
  if (edge >= 5) return "STRONG_VALUE";
  if (edge >= 2) return "SMALL_VALUE";
  return "NO_VALUE";
}

function extractCorrectScoreMap(oddsRaw: any) {
  const scoreMap = new Map<string, { odds: number; bookmaker: string | null }>();
  const response = oddsRaw?.response || [];

  for (const item of response) {
    const bookmakers = item?.bookmakers || item?.bookmaker || [];

    for (const bookmakerEntry of bookmakers) {
      const bookmakerName =
        bookmakerEntry?.name ||
        bookmakerEntry?.bookmaker?.name ||
        bookmakerEntry?.bookmaker_name ||
        null;

      const bets = bookmakerEntry?.bets || bookmakerEntry?.bet || [];

      for (const bet of bets) {
        const betName = String(bet?.name || bet?.label || "").toLowerCase();

        if (!betName.includes("correct score")) {
          continue;
        }

        const values = bet?.values || bet?.outcomes || bet?.value || [];

        for (const entry of values) {
          const rawLabel =
            entry?.value || entry?.label || entry?.name || entry?.outcome;
          const rawOdd = entry?.odd || entry?.price || entry?.decimal;

          const label = normalizeScoreLabel(rawLabel);
          const odds = parseOddValue(rawOdd);

          if (!label || odds === null) continue;

          const existing = scoreMap.get(label);

          if (!existing || odds > existing.odds) {
            scoreMap.set(label, {
              odds,
              bookmaker: bookmakerName,
            });
          }
        }
      }
    }
  }

  return scoreMap;
}

function enrichLikelyScoresWithOdds(
  likelyScores: LikelyScore[],
  correctScoreMap: Map<string, { odds: number; bookmaker: string | null }>
): ScoreMarket[] {
  return likelyScores.map((item) => {
    const normalized = normalizeScoreLabel(item.score);
    const market = correctScoreMap.get(normalized) || null;
    const odds = market?.odds ?? null;
    const bookmaker = market?.bookmaker ?? null;
    const marketProbability =
      odds !== null ? Math.round((100 / odds) * 10) / 10 : null;
    const edge =
      marketProbability !== null
        ? Math.round((item.probability - marketProbability) * 10) / 10
        : null;

    return {
      score: item.score,
      modelProbability: item.probability,
      bookmaker,
      odds,
      marketProbability,
      edge,
      valueLabel: buildValueLabel(edge),
    };
  });
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
        const fixtureId = match.fixture.id;

        const [
          homeRecentFixturesRaw,
          awayRecentFixturesRaw,
          h2hRaw,
          oddsRaw,
        ] = await Promise.all([
          apiFootballFetch<any>("/fixtures", {
            team: homeTeamId,
            league,
            season,
            last: 20,
          }),
          apiFootballFetch<any>("/fixtures", {
            team: awayTeamId,
            league,
            season,
            last: 20,
          }),
          apiFootballFetch<any>("/fixtures/headtohead", {
            h2h: `${homeTeamId}-${awayTeamId}`,
            league,
            last: 10,
          }),
          apiFootballFetch<any>("/odds", {
            fixture: fixtureId,
          }).catch(() => ({ response: [] })),
        ]);

        const h2hMatches = (h2hRaw?.response || []).filter(
          (item: any) => item.fixture?.status?.short === "FT"
        );

        const lastMeeting =
          h2hMatches.length > 0 ? formatScoreline(h2hMatches[0]) : null;

        const lastVenueMeetingMatch = h2hMatches.find(
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
        });

        const prediction = buildPrediction(features, {
          lastMeeting,
          lastVenueMeeting,
        });

        const correctScoreMap = extractCorrectScoreMap(oddsRaw);
        const scoreMarkets = enrichLikelyScoresWithOdds(
          prediction.likelyScores,
          correctScoreMap
        );

        return {
          fixtureId,
          home: match.teams.home.name,
          away: match.teams.away.name,
          homeLogo: match.teams.home.logo,
          awayLogo: match.teams.away.logo,
          league: match.league.name,
          date: match.fixture.date,
          prediction: {
            ...prediction,
            scoreMarkets,
          },
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