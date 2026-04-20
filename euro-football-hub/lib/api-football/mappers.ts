import type {
  DashboardPayload,
  MatchRow,
  StandingRow,
  TeamNewsItem,
} from "@/lib/types";

export function mapStandingsResponse(data: any): StandingRow[] {
  const table = data?.response?.[0]?.league?.standings?.[0] || [];
  return table.map((row: any) => ({
    rank: row.rank,
    teamId: row.team?.id,
    team: row.team?.name,
    logo: row.team?.logo,
    played: row.all?.played ?? 0,
    goalDiff: row.goalsDiff ?? 0,
    points: row.points ?? 0,
    form: row.form ?? "",
  }));
}

export function mapFixturesResponse(data: any): MatchRow[] {
  const rows = data?.response || [];
  return rows.map((item: any) => ({
    fixtureId: item.fixture?.id,
    date: item.fixture?.date,
    status: item.fixture?.status?.short || item.fixture?.status?.long || "",
    elapsed: item.fixture?.status?.elapsed ?? null,
    leagueId: item.league?.id,
    leagueName: item.league?.name,
    homeTeam: item.teams?.home?.name,
    awayTeam: item.teams?.away?.name,
    homeLogo: item.teams?.home?.logo,
    awayLogo: item.teams?.away?.logo,
    goals: {
      home: item.goals?.home ?? null,
      away: item.goals?.away ?? null,
    },
  }));
}

export function mapInjuriesToNews(data: any): TeamNewsItem[] {
  const rows = data?.response || [];
  return rows.map((item: any) => ({
    id: `injury-${item.player?.id || item.player?.name}-${item.fixture?.id || "none"}`,
    title: `${item.player?.name || "Player"} injury update`,
    summary: [item.team?.name, item.player?.type, item.player?.reason]
      .filter(Boolean)
      .join(" • "),
    kind: "injury" as const,
  }));
}

export function mapTransfersToNews(data: any): TeamNewsItem[] {
  const rows = data?.response || [];
  return rows.flatMap((entry: any, index: number) =>
    (entry.transfers || []).map((transfer: any, innerIndex: number) => ({
      id: `transfer-${entry.player?.id || index}-${innerIndex}`,
      title: `${entry.player?.name || "Player"} transfer update`,
      summary: [transfer.type, transfer.teams?.out?.name, transfer.teams?.in?.name]
        .filter(Boolean)
        .join(" • "),
      kind: "transfer" as const,
    }))
  );
}

export function buildDashboardPayload(input: {
  standingsRaw: any;
  fixturesRaw: any;
  resultsRaw: any;
  liveRaw: any;
  injuryBlocks: any[];
  transferBlocks: any[];
}): DashboardPayload {
  const allNews = [
    ...input.injuryBlocks.flatMap((block) => mapInjuriesToNews(block)),
    ...input.transferBlocks.flatMap((block) => mapTransfersToNews(block)),
  ];

  const shuffledNews = [...allNews].sort(() => Math.random() - 0.5);

  return {
    standings: mapStandingsResponse(input.standingsRaw),
    fixtures: mapFixturesResponse(input.fixturesRaw)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 12),
    results: mapFixturesResponse(input.resultsRaw)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12),
    live: mapFixturesResponse(input.liveRaw),
    teamNews: shuffledNews.slice(0, 20),
  };
}