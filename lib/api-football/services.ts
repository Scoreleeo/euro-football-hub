import "server-only";
import {
  buildDashboardPayload,
  mapFixtureDetailResponse,
  mapFixturesResponse,
  mapStandingsResponse,
} from "./mappers";
import {
  fetchFixtureByIdRaw,
  fetchFixtureEventsRaw,
  fetchFixtureLineupsRaw,
  fetchFixtureStatisticsRaw,
  fetchFixturesRaw,
  fetchLiveRaw,
  fetchStandingsRaw,
  fetchTeamInjuriesRaw,
  fetchTransfersRaw,
} from "./queries";

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

  return buildDashboardPayload({
    standingsRaw,
    fixturesRaw,
    resultsRaw,
    liveRaw,
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
  return mapFixturesResponse(raw);
}

export async function getFixtureDetail(fixtureId: number) {
  const [fixtureRaw, eventsRaw, statisticsRaw, lineupsRaw] = await Promise.all([
    fetchFixtureByIdRaw(fixtureId),
    fetchFixtureEventsRaw(fixtureId).catch(() => ({ response: [] })),
    fetchFixtureStatisticsRaw(fixtureId).catch(() => ({ response: [] })),
    fetchFixtureLineupsRaw(fixtureId).catch(() => ({ response: [] })),
  ]);

  return mapFixtureDetailResponse({
    fixtureRaw,
    eventsRaw,
    statisticsRaw,
    lineupsRaw,
  });
}