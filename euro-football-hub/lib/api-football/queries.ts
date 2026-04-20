import "server-only";
import { apiFootballFetch } from "./client";

export async function fetchStandingsRaw(league: number, season: number) {
  return apiFootballFetch<any>("/standings", { league, season }, 300);
}

export async function fetchFixturesRaw(league: number, season: number, status?: string) {
  return apiFootballFetch<any>("/fixtures", { league, season, status }, 90);
}

export async function fetchLiveRaw() {
  return apiFootballFetch<any>("/fixtures", { live: "all" }, 15);
}

export async function fetchTeamInjuriesRaw(team: number, league: number, season: number) {
  return apiFootballFetch<any>("/injuries", { team, league, season }, 180);
}

export async function fetchTransfersRaw(team: number) {
  return apiFootballFetch<any>("/transfers", { team }, 3600);
}