import "server-only";

type RawFixture = any;
type RawStanding = any;

export type TeamFormFeatures = {
teamId: number;
teamName: string;
recentPoints: number;
weightedRecentPoints: number;
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
recentGoalDifferencePerGame: number;
attackStrength: number;
defenceStrength: number;
formScore: number;
};

export type MatchFeatures = {
home: TeamFormFeatures;
away: TeamFormFeatures;
rankGap: number;
pointsGap: number;
goalDifferenceGap: number;
homeAdvantage: number;
};

function getFixturePoints(fixture: RawFixture, teamId: number): number {
const isHome = fixture.teams?.home?.id === teamId;

const teamGoals = isHome
? fixture.goals?.home ?? 0
: fixture.goals?.away ?? 0;

const oppGoals = isHome
? fixture.goals?.away ?? 0
: fixture.goals?.home ?? 0;

if (teamGoals > oppGoals) return 3;
if (teamGoals === oppGoals) return 1;
return 0;
}

function getFixtureGoals(fixture: RawFixture, teamId: number) {
const isHome = fixture.teams?.home?.id === teamId;

return {
goalsFor: isHome
? fixture.goals?.home ?? 0
: fixture.goals?.away ?? 0,
goalsAgainst: isHome
? fixture.goals?.away ?? 0
: fixture.goals?.home ?? 0,
isHome,
};
}

function safeAverage(total: number, count: number) {
return count > 0 ? total / count : 0;
}

function getStandingRow(standingsRaw: RawStanding, teamId: number) {
const table =
standingsRaw?.response?.[0]?.league?.standings?.[0] || [];

return table.find((row: any) => row.team?.id === teamId);
}

export function buildTeamFormFeatures(input: {
teamId: number;
teamName: string;
recentFixturesRaw: RawFixture;
standingsRaw: RawStanding;
isHomeContext: boolean;
}): TeamFormFeatures {
const fixtures = (input.recentFixturesRaw?.response || [])
.filter(
(fixture: any) => fixture.fixture?.status?.short === "FT"
)
.slice(0, 6);

const standing = getStandingRow(
input.standingsRaw,
input.teamId
);

const weights = [1.6, 1.35, 1.15, 1, 0.85, 0.7];

let recentPoints = 0;
let weightedRecentPoints = 0;
let recentWins = 0;
let recentDraws = 0;
let recentLosses = 0;

let goalsForTotal = 0;
let goalsAgainstTotal = 0;
let weightedGoalsFor = 0;
let weightedGoalsAgainst = 0;

let cleanSheets = 0;
let failedToScore = 0;

let contextMatches = 0;
let contextPoints = 0;
let contextGoalsFor = 0;
let contextGoalsAgainst = 0;

fixtures.forEach((fixture, index) => {
const weight = weights[index] ?? 0.6;

const pts = getFixturePoints(fixture, input.teamId);

const { goalsFor, goalsAgainst, isHome } =
  getFixtureGoals(fixture, input.teamId);

recentPoints += pts;
weightedRecentPoints += pts * weight;

goalsForTotal += goalsFor;
goalsAgainstTotal += goalsAgainst;

weightedGoalsFor += goalsFor * weight;
weightedGoalsAgainst += goalsAgainst * weight;

if (pts === 3) recentWins += 1;
else if (pts === 1) recentDraws += 1;
else recentLosses += 1;

if (goalsAgainst === 0) cleanSheets += 1;
if (goalsFor === 0) failedToScore += 1;

if (
  (input.isHomeContext && isHome) ||
  (!input.isHomeContext && !isHome)
) {
  contextMatches += 1;
  contextPoints += pts;
  contextGoalsFor += goalsFor;
  contextGoalsAgainst += goalsAgainst;
}

});

const fixtureCount = fixtures.length || 1;

const totalWeight =
weights
.slice(0, fixtures.length)
.reduce((a, b) => a + b, 0) || 1;

const goalsForPerGame = safeAverage(
goalsForTotal,
fixtureCount
);

const goalsAgainstPerGame = safeAverage(
goalsAgainstTotal,
fixtureCount
);

const homeAwayPointsPerGame = safeAverage(
contextPoints,
contextMatches
);

const homeAwayGoalsForPerGame = safeAverage(
contextGoalsFor,
contextMatches
);

const homeAwayGoalsAgainstPerGame = safeAverage(
contextGoalsAgainst,
contextMatches
);

const recentGoalDifferencePerGame = safeAverage(
goalsForTotal - goalsAgainstTotal,
fixtureCount
);

const weightedGoalsForPerGame =
weightedGoalsFor / totalWeight;

const weightedGoalsAgainstPerGame =
weightedGoalsAgainst / totalWeight;

const tableRank = standing?.rank ?? 99;
const tablePoints = standing?.points ?? 0;

const goalDifference =
standing?.all?.goals?.for -
standing?.all?.goals?.against ?? 0;

const attackStrength =
weightedGoalsForPerGame * 1.25 +
homeAwayGoalsForPerGame * 0.9 +
recentWins * 0.08;

const defenceStrength =
2.2 -
weightedGoalsAgainstPerGame * 0.95 -
homeAwayGoalsAgainstPerGame * 0.45 +
cleanSheets * 0.06;

const formScore =
weightedRecentPoints * 1.15 +
weightedGoalsForPerGame * 1.2 -
weightedGoalsAgainstPerGame * 0.95 +
homeAwayPointsPerGame * 0.85 +
recentGoalDifferencePerGame * 0.55 +
cleanSheets * 0.15 -
failedToScore * 0.18;

return {
teamId: input.teamId,
teamName: input.teamName,
recentPoints,
weightedRecentPoints,
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
recentGoalDifferencePerGame,
attackStrength,
defenceStrength,
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

return {
home,
away,
rankGap: away.tableRank - home.tableRank,
pointsGap: home.tablePoints - away.tablePoints,
goalDifferenceGap:
home.goalDifference - away.goalDifference,
homeAdvantage: 0.38,
};
}