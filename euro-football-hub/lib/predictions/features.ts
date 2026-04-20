import "server-only";

type RawFixture = any;
type RawStanding = any;
type RawInjury = any;

export type TeamFormFeatures = {
  teamId: number;
  teamName: string;
  recentPoints: number;
  recentWins: number;
  recentDraws: number;
  recentLosses: number;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  cleanSheets: number;
  failedToScore: number;
  homeAwayPointsPerGame: number;
  homeAwayGoalsForPerGame: number;
  homeAwayGoalsAgainstPerGame: number;
  injuryCount: number;
  tableRank: number;
  tablePoints: number;
  formScore: number;
};

export type MatchFeatures = {
  home: TeamFormFeatures;
  away: TeamFormFeatures;
  rankGap: number;
  pointsGap: number;
  homeAdvantage: number;
};

function getFixturePoints(fixture: RawFixture, teamId: number): number {
  const isHome = fixture.teams?.home?.id === teamId;
  const teamGoals = isHome ? fixture.goals?.home ?? 0 : fixture.goals?.away ?? 0;
  const oppGoals = isHome ? fixture.goals?.away ?? 0 : fixture.goals?.home ?? 0;

  if (teamGoals > oppGoals) return 3;
  if (teamGoals === oppGoals) return 1;
  return 0;
}

function getFixtureGoals(fixture: RawFixture, teamId: number) {
  const isHome = fixture.teams?.home?.id === teamId;
  return {
    goalsFor: isHome ? fixture.goals?.home ?? 0 : fixture.goals?.away ?? 0,
    goalsAgainst: isHome ? fixture.goals?.away ?? 0 : fixture.goals?.home ?? 0,
    isHome,
  };
}

function safeAverage(total: number, count: number) {
  return count > 0 ? total / count : 0;
}

function getStandingRow(standingsRaw: RawStanding, teamId: number) {
  const table = standingsRaw?.response?.[0]?.league?.standings?.[0] || [];
  return table.find((row: any) => row.team?.id === teamId);
}

export function buildTeamFormFeatures(input: {
  teamId: number;
  teamName: string;
  recentFixturesRaw: RawFixture;
  standingsRaw: RawStanding;
  injuriesRaw?: RawInjury;
  isHomeContext: boolean;
}): TeamFormFeatures {
  const fixtures = (input.recentFixturesRaw?.response || []).slice(0, 5);
  const standing = getStandingRow(input.standingsRaw, input.teamId);

  let recentPoints = 0;
  let recentWins = 0;
  let recentDraws = 0;
  let recentLosses = 0;
  let goalsForTotal = 0;
  let goalsAgainstTotal = 0;
  let cleanSheets = 0;
  let failedToScore = 0;

  let contextMatches = 0;
  let contextPoints = 0;
  let contextGoalsFor = 0;
  let contextGoalsAgainst = 0;

  for (const fixture of fixtures) {
    const pts = getFixturePoints(fixture, input.teamId);
    const { goalsFor, goalsAgainst, isHome } = getFixtureGoals(fixture, input.teamId);

    recentPoints += pts;
    goalsForTotal += goalsFor;
    goalsAgainstTotal += goalsAgainst;

    if (pts === 3) recentWins += 1;
    else if (pts === 1) recentDraws += 1;
    else recentLosses += 1;

    if (goalsAgainst === 0) cleanSheets += 1;
    if (goalsFor === 0) failedToScore += 1;

    if ((input.isHomeContext && isHome) || (!input.isHomeContext && !isHome)) {
      contextMatches += 1;
      contextPoints += pts;
      contextGoalsFor += goalsFor;
      contextGoalsAgainst += goalsAgainst;
    }
  }

  const uniqueInjuredPlayers = new Set(
  (input.injuriesRaw?.response || [])
    .map((item: any) => item.player?.id || item.player?.name)
    .filter(Boolean)
);

  const injuryCount = uniqueInjuredPlayers.size;
  const tableRank = standing?.rank ?? 99;
  const tablePoints = standing?.points ?? 0;

  const goalsForPerGame = safeAverage(goalsForTotal, fixtures.length);
  const goalsAgainstPerGame = safeAverage(goalsAgainstTotal, fixtures.length);
  const homeAwayPointsPerGame = safeAverage(contextPoints, contextMatches);
  const homeAwayGoalsForPerGame = safeAverage(contextGoalsFor, contextMatches);
  const homeAwayGoalsAgainstPerGame = safeAverage(contextGoalsAgainst, contextMatches);

  const formScore =
    recentPoints * 1.4 +
    goalsForPerGame * 2 -
    goalsAgainstPerGame * 1.5 +
    cleanSheets * 0.6 -
    failedToScore * 0.5 +
    homeAwayPointsPerGame * 1.2 -
    injuryCount * 0.35;

  return {
    teamId: input.teamId,
    teamName: input.teamName,
    recentPoints,
    recentWins,
    recentDraws,
    recentLosses,
    goalsForPerGame,
    goalsAgainstPerGame,
    cleanSheets,
    failedToScore,
    homeAwayPointsPerGame,
    homeAwayGoalsForPerGame,
    homeAwayGoalsAgainstPerGame,
    injuryCount,
    tableRank,
    tablePoints,
    formScore,
  };
}

export function buildMatchFeatures(input: {
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeRecentFixturesRaw: RawFixture;
  awayRecentFixturesRaw: RawFixture;
  standingsRaw: RawStanding;
  homeInjuriesRaw?: RawInjury;
  awayInjuriesRaw?: RawInjury;
}): MatchFeatures {
  const home = buildTeamFormFeatures({
    teamId: input.homeTeamId,
    teamName: input.homeTeamName,
    recentFixturesRaw: input.homeRecentFixturesRaw,
    standingsRaw: input.standingsRaw,
    injuriesRaw: input.homeInjuriesRaw,
    isHomeContext: true,
  });

  const away = buildTeamFormFeatures({
    teamId: input.awayTeamId,
    teamName: input.awayTeamName,
    recentFixturesRaw: input.awayRecentFixturesRaw,
    standingsRaw: input.standingsRaw,
    injuriesRaw: input.awayInjuriesRaw,
    isHomeContext: false,
  });

  return {
    home,
    away,
    rankGap: away.tableRank - home.tableRank,
    pointsGap: home.tablePoints - away.tablePoints,
    homeAdvantage: 0.45,
  };
}