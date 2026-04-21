import type {
  DashboardPayload,
  FixtureDetail,
  FixtureEvent,
  FixtureLineup,
  FixtureStatistic,
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
    live: mapFixturesResponse(input.liveRaw).slice(0, 20),
    teamNews: shuffledNews.slice(0, 20),
  };
}

export function mapFixtureEventsResponse(data: any): FixtureEvent[] {
  const rows = data?.response || [];
  return rows.map((item: any) => ({
    time: item.time?.elapsed ? `${item.time.elapsed}'` : "—",
    type: item.type || "Event",
    detail: item.detail || "",
    teamName: item.team?.name || "Team",
    playerName: item.player?.name || undefined,
    assistName: item.assist?.name || undefined,
  }));
}

export function mapFixtureStatisticsResponse(data: any): FixtureStatistic[] {
  const rows = data?.response || [];
  return rows.map((item: any) => ({
    teamName: item.team?.name || "Team",
    teamLogo: item.team?.logo || undefined,
    stats: Object.fromEntries(
      (item.statistics || []).map((stat: any) => [
        stat.type,
        stat.value ?? "—",
      ])
    ),
  }));
}

export function mapFixtureLineupsResponse(data: any): FixtureLineup[] {
  const rows = data?.response || [];
  return rows.map((item: any) => ({
    teamName: item.team?.name || "Team",
    teamLogo: item.team?.logo || undefined,
    formation: item.formation || undefined,
    coach: item.coach?.name || undefined,
    startXI: (item.startXI || []).map(
      (player: any) => player.player?.name || "Player"
    ),
    substitutes: (item.substitutes || []).map(
      (player: any) => player.player?.name || "Player"
    ),
  }));
}

export function mapFixtureDetailResponse(input: {
  fixtureRaw: any;
  eventsRaw: any;
  statisticsRaw: any;
  lineupsRaw: any;
}): FixtureDetail | null {
  const item = input.fixtureRaw?.response?.[0];

  if (!item) {
    return null;
  }

  return {
    fixtureId: item.fixture?.id,
    date: item.fixture?.date,
    status: item.fixture?.status?.short || item.fixture?.status?.long || "",
    elapsed: item.fixture?.status?.elapsed ?? null,
    leagueName: item.league?.name || "",
    venue: item.fixture?.venue?.name || undefined,
    referee: item.fixture?.referee || undefined,
    homeTeam: item.teams?.home?.name || "Home",
    awayTeam: item.teams?.away?.name || "Away",
    homeLogo: item.teams?.home?.logo || undefined,
    awayLogo: item.teams?.away?.logo || undefined,
    goals: {
      home: item.goals?.home ?? null,
      away: item.goals?.away ?? null,
    },
    events: mapFixtureEventsResponse(input.eventsRaw),
    statistics: mapFixtureStatisticsResponse(input.statisticsRaw),
    lineups: mapFixtureLineupsResponse(input.lineupsRaw),
  };
}