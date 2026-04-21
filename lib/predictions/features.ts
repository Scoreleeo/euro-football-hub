import "server-only";

type RawFixture = any;
type RawStanding = any;

export type TeamFormFeatures = {
  teamId: number;
  teamName: string;
  matchesUsed: number;
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
  tableRank: number;
  tablePoints: number;
  goalDifference: number;
  formScore: number;
};

export type MatchFeatures = {
  home: TeamFormFeatures;
  away: TeamFormFeatures;
  rankGap: number;
  pointsGap: number;
  goalDifferenceGap: number;
  homeAdvantage: number;
  expectedGoals: {
    home: number;
    away: number;
  };
};

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeAverage(total: number, count: number) {
  return count > 0 ? total / count : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getStandingRow(standingsRaw: RawStanding, teamId: number) {
  const table = standingsRaw?.response?.[0]?.league?.standings?.[0] || [];
  return table.find((row: any) => row.team?.id === teamId);
}

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

export function buildTeamFormFeatures(input: {
  teamId: number;
  teamName: string;
  recentFixturesRaw: RawFixture;
  standingsRaw: RawStanding;
  isHomeContext: boolean;
}): TeamFormFeatures {
  const fixtures = (input.recentFixturesRaw?.response || []).filter(
    (fixture: any) => fixture.fixture?.status?.short === "FT"
  );

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
    const points = getFixturePoints(fixture, input.teamId);
    const { goalsFor, goalsAgainst, isHome } = getFixtureGoals(
      fixture,
      input.teamId
    );

    recentPoints += points;
    goalsForTotal += goalsFor;
    goalsAgainstTotal += goalsAgainst;

    if (points === 3) recentWins += 1;
    else if (points === 1) recentDraws += 1;
    else recentLosses += 1;

    if (goalsAgainst === 0) cleanSheets += 1;
    if (goalsFor === 0) failedToScore += 1;

    if ((input.isHomeContext && isHome) || (!input.isHomeContext && !isHome)) {
      contextMatches += 1;
      contextPoints += points;
      contextGoalsFor += goalsFor;
      contextGoalsAgainst += goalsAgainst;
    }
  }

  const matchesUsed = fixtures.length;
  const goalsForPerGame = safeAverage(goalsForTotal, matchesUsed);
  const goalsAgainstPerGame = safeAverage(goalsAgainstTotal, matchesUsed);
  const homeAwayPointsPerGame = safeAverage(contextPoints, contextMatches);
  const homeAwayGoalsForPerGame = safeAverage(contextGoalsFor, contextMatches);
  const homeAwayGoalsAgainstPerGame = safeAverage(contextGoalsAgainst, contextMatches);

  const tableRank = standing?.rank ?? 99;
  const tablePoints = standing?.points ?? 0;
  const goalDifference =
    safeNumber(standing?.all?.goals?.for) - safeNumber(standing?.all?.goals?.against);

  const formScore =
    recentPoints * 1.15 +
    goalsForPerGame * 1.4 -
    goalsAgainstPerGame * 1.1 +
    homeAwayPointsPerGame * 1.2 +
    homeAwayGoalsForPerGame * 0.9 -
    homeAwayGoalsAgainstPerGame * 0.7 +
    cleanSheets * 0.2 -
    failedToScore * 0.2;

  return {
    teamId: input.teamId,
    teamName: input.teamName,
    matchesUsed,
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
    tableRank,
    tablePoints,
    goalDifference,
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
}): MatchFeatures {
  const home = buildTeamFormFeatures({
    teamId: input.homeTeamId,
    teamName: input.homeTeamName,
    recentFixturesRaw: input.homeRecentFixturesRaw,
    standingsRaw: input.standingsRaw,
    isHomeContext: true,
  });

  const away = buildTeamFormFeatures({
    teamId: input.awayTeamId,
    teamName: input.awayTeamName,
    recentFixturesRaw: input.awayRecentFixturesRaw,
    standingsRaw: input.standingsRaw,
    isHomeContext: false,
  });

  const homeAdvantage = 0.18;

  const baseHomeExpectedGoals =
    (home.homeAwayGoalsForPerGame + away.homeAwayGoalsAgainstPerGame) / 2;

  const baseAwayExpectedGoals =
    (away.homeAwayGoalsForPerGame + home.homeAwayGoalsAgainstPerGame) / 2;

  const tableAdjustment =
    clamp((home.tablePoints - away.tablePoints) / 40, -0.35, 0.35) * 0.18;

  const goalDifferenceAdjustment =
    clamp((home.goalDifference - away.goalDifference) / 25, -0.35, 0.35) * 0.12;

  const formAdjustment =
    clamp((home.recentPoints - away.recentPoints) / 15, -0.35, 0.35) * 0.14;

  const expectedHomeGoals = clamp(
    baseHomeExpectedGoals +
      homeAdvantage +
      tableAdjustment +
      goalDifferenceAdjustment +
      formAdjustment,
    0.35,
    2.8
  );

  const expectedAwayGoals = clamp(
    baseAwayExpectedGoals -
      tableAdjustment * 0.55 -
      goalDifferenceAdjustment * 0.45 -
      formAdjustment * 0.45,
    0.25,
    2.4
  );

  return {
    home,
    away,
    rankGap: away.tableRank - home.tableRank,
    pointsGap: home.tablePoints - away.tablePoints,
    goalDifferenceGap: home.goalDifference - away.goalDifference,
    homeAdvantage,
    expectedGoals: {
      home: expectedHomeGoals,
      away: expectedAwayGoals,
    },
  };
}