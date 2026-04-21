import "server-only";
import { apiFootballFetch } from "./client";

export async function fetchStandingsRaw(league: number, season: number) {
  return apiFootballFetch<any>("/standings", { league, season }, 300);
}

export async function fetchFixturesRaw(
  league: number,
  season: number,
  status?: string
) {
  const params: Record<string, string | number> = { league, season };

  if (status) {
    params.status = status;
  }

  return apiFootballFetch<any>("/fixtures", params, 90);
}

export async function fetchLiveRaw() {
  return apiFootballFetch<any>("/fixtures", { live: "all" }, 15);
}

export async function fetchTeamInjuriesRaw(
  team: number,
  league: number,
  season: number
) {
  return apiFootballFetch<any>("/injuries", { team, league, season }, 180);
}

export async function fetchTransfersRaw(team: number) {
  return apiFootballFetch<any>("/transfers", { team }, 3600);
}

export async function fetchFixtureByIdRaw(fixture: number) {
  return apiFootballFetch<any>("/fixtures", { id: fixture }, 60);
}

export async function fetchFixtureEventsRaw(fixture: number) {
  return apiFootballFetch<any>("/fixtures/events", { fixture }, 60);
}

export async function fetchFixtureStatisticsRaw(fixture: number) {
  return apiFootballFetch<any>("/fixtures/statistics", { fixture }, 60);
}

export async function fetchFixtureLineupsRaw(fixture: number) {
  return apiFootballFetch<any>("/fixtures/lineups", { fixture }, 60);
}