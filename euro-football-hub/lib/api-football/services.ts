import "server-only";
import { TOP_EURO_LEAGUES } from "@/lib/constants";
import { buildDashboardPayload, mapStandingsResponse, mapFixturesResponse } from "./mappers";
import {
  fetchFixturesRaw,
  fetchLiveRaw,
  fetchStandingsRaw,
  fetchTeamInjuriesRaw,
  fetchTransfersRaw,
} from "./queries";

const TOP_EURO_LEAGUE_IDS = new Set(TOP_EURO_LEAGUES.map((league) => league.id));

function filterTopEuroLiveRaw(liveRaw: any) {
  const rows = liveRaw?.response || [];

  return {
    ...liveRaw,
    response: rows.filter((item: any) =>
      TOP_EURO_LEAGUE_IDS.has(Number(item.league?.id))
    ),
  };
}

export async function getDashboardData(leagueId: number, season: number) {
  const [standingsRaw, fixturesRaw, resultsRaw, liveRaw] = await Promise.all([
    fetchStandingsRaw(leagueId, season),
    fetchFixturesRaw(leagueId, season, "NS"),
    fetchFixturesRaw(leagueId, season, "FT"),
    fetchLiveRaw(),
  ]);

  const standings = mapStandingsResponse(standingsRaw);
  const teamIds = standings
    .slice(0, 10)
    .map((row) => row.teamId)
    .filter((teamId): teamId is number => Boolean(teamId));

  const [injuryBlocks, transferBlocks] = await Promise.all([
    Promise.allSettled(
      teamIds.map((teamId) => fetchTeamInjuriesRaw(teamId, leagueId, season))
    ),
    Promise.allSettled(teamIds.map((teamId) => fetchTransfersRaw(teamId))),
  ]);

  const filteredLiveRaw = filterTopEuroLiveRaw(liveRaw);

  return buildDashboardPayload({
    standingsRaw,
    fixturesRaw,
    resultsRaw,
    liveRaw: filteredLiveRaw,
    injuryBlocks: injuryBlocks.flatMap((item) =>
      item.status === "fulfilled" ? [item.value] : []
    ),
    transferBlocks: transferBlocks.flatMap((item) =>
      item.status === "fulfilled" ? [item.value] : []
    ),
  });
}

export async function getLiveMatches() {
  const raw = await fetchLiveRaw();
  const filteredLiveRaw = filterTopEuroLiveRaw(raw);
  return mapFixturesResponse(filteredLiveRaw);
}