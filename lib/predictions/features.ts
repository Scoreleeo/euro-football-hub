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

  homeAwayMatchesUsed: number;
  homeAwayPointsPerGame: number;
  homeAwayGoalsForPerGame: number;
  homeAwayGoalsAgainstPerGame: number;

  weightedRecentPoints: number;
  weightedGoalsForPerGame: number;
  weightedGoalsAgainstPerGame: number;

  attackStrength: number;
  defenceStrength: number;

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
  const fixtures = (input.recentFixturesRaw?.response || [])
    .filter((fixture: any) => fixture.fixture?.status?.short === "FT")
    .slice(0, 20);

  const standing = getStandingRow(input.standingsRaw, input.teamId);
  const weights = [
    1.8, 1.65, 1.5, 1.35, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85,
    0.8, 0.75, 0.72, 0.69, 0.66, 0.63, 0.6, 0.58, 0.56, 0.54,
  ];

  let recentPoints = 0;
  let recentWins = 0;
  let recentDraws = 0;
  let recentLosses = 0;
  let goalsForTotal = 0;
  let goalsAgainstTotal = 0;
  let cleanSheets = 0;
  let failedToScore = 0;

  let homeAwayMatchesUsed = 0;
  let homeAwayPoints = 0;
  let homeAwayGoalsFor = 0;
  let homeAwayGoalsAgainst = 0;

  let weightedPointsTotal = 0;
  let weightedGoalsForTotal = 0;
  let weightedGoalsAgainstTotal = 0;
  let totalWeight = 0;

  fixtures.forEach((fixture: any, index: number) => {
    const weight = weights[index] ?? 0.5;
    const points = getFixturePoints(fixture, input.teamId);
    const { goalsFor, goalsAgainst, isHome } = getFixtureGoals(
      fixture,
      input.teamId
    );

    recentPoints += points;
    goalsForTotal += goalsFor;
    goalsAgainstTotal += goalsAgainst;

    weightedPointsTotal += points * weight;
    weightedGoalsForTotal += goalsFor * weight;
    weightedGoalsAgainstTotal += goalsAgainst * weight;
    totalWeight += weight;

    if (points === 3) recentWins += 1;
    else if (points === 1) recentDraws += 1;
    else recentLosses += 1;

    if (goalsAgainst === 0) cleanSheets += 1;
    if (goalsFor === 0) failedToScore += 1;

    if ((input.isHomeContext && isHome) || (!input.isHomeContext && !isHome)) {
      homeAwayMatchesUsed += 1;
      homeAwayPoints += points;
      homeAwayGoalsFor += goalsFor;
      homeAwayGoalsAgainst += goalsAgainst;
    }
  });

  const matchesUsed = fixtures.length;

  const goalsForPerGame = safeAverage(goalsForTotal, matchesUsed);
  const goalsAgainstPerGame = safeAverage(goalsAgainstTotal, matchesUsed);

  const homeAwayPointsPerGame = safeAverage(homeAwayPoints, homeAwayMatchesUsed);
  const homeAwayGoalsForPerGame = safeAverage(
    homeAwayGoalsFor,
    homeAwayMatchesUsed
  );
  const homeAwayGoalsAgainstPerGame = safeAverage(
    homeAwayGoalsAgainst,
    homeAwayMatchesUsed
  );

  const weightedRecentPoints =
    totalWeight > 0 ? weightedPointsTotal / totalWeight : 0;
  const weightedGoalsForPerGame =
    totalWeight > 0 ? weightedGoalsForTotal / totalWeight : 0;
  const weightedGoalsAgainstPerGame =
    totalWeight > 0 ? weightedGoalsAgainstTotal / totalWeight : 0;

  const tableRank = standing?.rank ?? 99;
  const tablePoints = standing?.points ?? 0;
  const goalDifference =
    safeNumber(standing?.all?.goals?.for) -
    safeNumber(standing?.all?.goals?.against);

  const attackStrength =
    homeAwayGoalsForPerGame * 0.65 +
    weightedGoalsForPerGame * 0.25 +
    goalsForPerGame * 0.1;

  const defenceStrength =
    homeAwayGoalsAgainstPerGame * 0.65 +
    weightedGoalsAgainstPerGame * 0.25 +
    goalsAgainstPerGame * 0.1;

  const formScore =
    weightedRecentPoints * 1.2 +
    weightedGoalsForPerGame * 1.1 -
    weightedGoalsAgainstPerGame * 0.9 +
    homeAwayPointsPerGame * 0.85 +
    cleanSheets * 0.1 -
    failedToScore * 0.1;

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
    homeAwayMatchesUsed,
    homeAwayPointsPerGame,
    homeAwayGoalsForPerGame,
    homeAwayGoalsAgainstPerGame,
    weightedRecentPoints,
    weightedGoalsForPerGame,
    weightedGoalsAgainstPerGame,
    attackStrength,
    defenceStrength,
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

  const pointsGap = home.tablePoints - away.tablePoints;
  const goalDifferenceGap = home.goalDifference - away.goalDifference;
  const rankGap = away.tableRank - home.tableRank;
  const homeAdvantage = 0.16;

  const homeAttackStrength =
    home.homeAwayGoalsForPerGame * 0.65 +
    away.homeAwayGoalsAgainstPerGame * 0.35;

  const awayAttackStrength =
    away.homeAwayGoalsForPerGame * 0.65 +
    home.homeAwayGoalsAgainstPerGame * 0.35;

  const homeDefenceStrength =
    home.homeAwayGoalsAgainstPerGame * 0.65 +
    away.homeAwayGoalsForPerGame * 0.35;

  const awayDefenceStrength =
    away.homeAwayGoalsAgainstPerGame * 0.65 +
    home.homeAwayGoalsForPerGame * 0.35;

  let homeExpectedGoals =
    1.22 +
    homeAttackStrength * 0.6 -
    awayDefenceStrength * 0.4 +
    homeAdvantage;

  let awayExpectedGoals =
    1.02 +
    awayAttackStrength * 0.55 -
    homeDefenceStrength * 0.45;

  homeExpectedGoals += clamp(pointsGap / 40, -0.25, 0.25) * 0.22;
  awayExpectedGoals -= clamp(pointsGap / 40, -0.25, 0.25) * 0.12;

  homeExpectedGoals += clamp(goalDifferenceGap / 35, -0.2, 0.2) * 0.18;
  awayExpectedGoals -= clamp(goalDifferenceGap / 35, -0.2, 0.2) * 0.1;

  const totalXG = homeExpectedGoals + awayExpectedGoals;

  if (totalXG > 3.2) {
    const scale = 3.2 / totalXG;
    homeExpectedGoals *= scale;
    awayExpectedGoals *= scale;
  } else if (totalXG < 1.8) {
    const scale = 1.8 / Math.max(totalXG, 0.1);
    homeExpectedGoals *= scale;
    awayExpectedGoals *= scale;
  }

  homeExpectedGoals = clamp(homeExpectedGoals, 0.35, 2.45);
  awayExpectedGoals = clamp(awayExpectedGoals, 0.25, 2.15);

  return {
    home,
    away,
    rankGap,
    pointsGap,
    goalDifferenceGap,
    homeAdvantage,
    expectedGoals: {
      home: homeExpectedGoals,
      away: awayExpectedGoals,
    },
  };
}