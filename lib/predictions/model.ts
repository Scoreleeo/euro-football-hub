import "server-only";
import type { MatchFeatures } from "./features";

export type PredictionOutput = {
  winner: string;
  score: string;
  confidence: number;
  probabilities: {
    home: number;
    draw: number;
    away: number;
  };
  insights: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function goalFromExpected(xg: number) {
  if (xg < 0.75) return 0;
  if (xg < 1.45) return 1;
  if (xg < 2.15) return 2;
  if (xg < 2.85) return 3;
  return 4;
}

export function buildPrediction(
  features: MatchFeatures,
  context?: {
    lastMeeting?: string | null;
    lastVenueMeeting?: string | null;
  }
): PredictionOutput {
  const homeRecentPoints = num(features.home.recentPoints);
  const awayRecentPoints = num(features.away.recentPoints);
  const homeWeightedPoints = num(features.home.weightedRecentPoints);
  const awayWeightedPoints = num(features.away.weightedRecentPoints);

  const homeGoalsForPerGame = num(features.home.goalsForPerGame);
  const awayGoalsForPerGame = num(features.away.goalsForPerGame);
  const homeGoalsAgainstPerGame = num(features.home.goalsAgainstPerGame);
  const awayGoalsAgainstPerGame = num(features.away.goalsAgainstPerGame);

  const homeHomeGoalsForPerGame = num(features.home.homeAwayGoalsForPerGame);
  const awayAwayGoalsForPerGame = num(features.away.homeAwayGoalsForPerGame);
  const homeHomeGoalsAgainstPerGame = num(features.home.homeAwayGoalsAgainstPerGame);
  const awayAwayGoalsAgainstPerGame = num(features.away.homeAwayGoalsAgainstPerGame);

  const homeFormScore = num(features.home.formScore);
  const awayFormScore = num(features.away.formScore);
  const pointsGap = num(features.pointsGap);
  const goalDifferenceGap = num(features.goalDifferenceGap);
  const homeAdvantage = num(features.homeAdvantage, 0.38);

  const homeAttackStrength = num(features.home.attackStrength);
  const awayAttackStrength = num(features.away.attackStrength);
  const homeDefenceStrength = num(features.home.defenceStrength);
  const awayDefenceStrength = num(features.away.defenceStrength);

  const homeEdge =
    (homeFormScore - awayFormScore) * 0.09 +
    (homeWeightedPoints - awayWeightedPoints) * 0.06 +
    pointsGap * 0.018 +
    goalDifferenceGap * 0.008 +
    homeAdvantage;

  let homeExpectedGoals =
    0.6 +
    homeAttackStrength * 0.28 +
    homeGoalsForPerGame * 0.16 +
    homeHomeGoalsForPerGame * 0.22 +
    awayGoalsAgainstPerGame * 0.11 +
    awayAwayGoalsAgainstPerGame * 0.18 -
    awayDefenceStrength * 0.08 +
    homeEdge * 0.28;

  let awayExpectedGoals =
    0.5 +
    awayAttackStrength * 0.24 +
    awayGoalsForPerGame * 0.14 +
    awayAwayGoalsForPerGame * 0.2 +
    homeGoalsAgainstPerGame * 0.1 +
    homeHomeGoalsAgainstPerGame * 0.14 -
    homeDefenceStrength * 0.08 -
    homeEdge * 0.2;

  if (context?.lastMeeting && context.lastMeeting.includes("0-0")) {
    homeExpectedGoals -= 0.06;
    awayExpectedGoals -= 0.06;
  }

  if (context?.lastVenueMeeting && context.lastVenueMeeting.includes("0-0")) {
    homeExpectedGoals -= 0.04;
    awayExpectedGoals -= 0.04;
  }

  homeExpectedGoals = clamp(homeExpectedGoals, 0.25, 2.7);
  awayExpectedGoals = clamp(awayExpectedGoals, 0.2, 2.4);

  const expectedGoalGap = homeExpectedGoals - awayExpectedGoals;
  const totalExpectedGoals = homeExpectedGoals + awayExpectedGoals;

  let homeGoals = goalFromExpected(homeExpectedGoals);
  let awayGoals = goalFromExpected(awayExpectedGoals);

  if (Math.abs(expectedGoalGap) < 0.18) {
    if (totalExpectedGoals < 2.2) {
      homeGoals = 1;
      awayGoals = 1;
    } else {
      homeGoals = 2;
      awayGoals = 2;
    }
  }

  if (Math.abs(expectedGoalGap) >= 0.22 && Math.abs(expectedGoalGap) < 0.55) {
    if (expectedGoalGap > 0) {
      homeGoals = Math.max(homeGoals, awayGoals + 1);
    } else {
      awayGoals = Math.max(awayGoals, homeGoals + 1);
    }
  }

  if (Math.abs(expectedGoalGap) >= 0.55) {
    if (expectedGoalGap > 0) {
      homeGoals = Math.max(homeGoals, awayGoals + 1);
    } else {
      awayGoals = Math.max(awayGoals, homeGoals + 1);
    }
  }

  if (homeGoals >= 4 && totalExpectedGoals < 3.6) {
    homeGoals = 3;
  }

  if (awayGoals >= 4 && totalExpectedGoals < 3.4) {
    awayGoals = 3;
  }

  if (homeGoals === 3 && awayGoals === 3) {
    homeGoals = 2;
    awayGoals = 2;
  }

  if (homeGoals === 4 && awayGoals >= 2 && expectedGoalGap > 0.45) {
    awayGoals -= 1;
  }

  if (awayGoals === 4 && homeGoals >= 2 && expectedGoalGap < -0.45) {
    homeGoals -= 1;
  }

  homeGoals = clamp(homeGoals, 0, 4);
  awayGoals = clamp(awayGoals, 0, 4);

  const drawBias =
    1.35 -
    Math.abs(expectedGoalGap) * 1.55 -
    Math.max(0, totalExpectedGoals - 2.35) * 0.18;

  const [homeProbRaw, drawProbRaw, awayProbRaw] = softmax([
    homeEdge * 1.45 + homeExpectedGoals * 0.12,
    drawBias,
    -homeEdge * 1.3 + awayExpectedGoals * 0.1,
  ]);

  let homeProb = Math.round(homeProbRaw * 100);
  let drawProb = Math.round(drawProbRaw * 100);
  let awayProb = Math.round(awayProbRaw * 100);

  const total = homeProb + drawProb + awayProb;
  if (total !== 100) {
    homeProb += 100 - total;
  }

  homeProb = clamp(homeProb, 14, 72);
  drawProb = clamp(drawProb, 16, 36);
  awayProb = clamp(awayProb, 12, 70);

  const adjustedTotal = homeProb + drawProb + awayProb;
  if (adjustedTotal !== 100) {
    const diff = 100 - adjustedTotal;
    if (homeProb >= awayProb && homeProb >= drawProb) homeProb += diff;
    else if (awayProb >= homeProb && awayProb >= drawProb) awayProb += diff;
    else drawProb += diff;
  }

  let winner = "Draw";
  if (homeGoals > awayGoals) winner = features.home.teamName;
  if (awayGoals > homeGoals) winner = features.away.teamName;

  if (winner === "Draw") {
    if (homeProb >= 45 && homeProb - drawProb >= 8) {
      winner = features.home.teamName;
      homeGoals = clamp(awayGoals + 1, 1, 3);
    } else if (awayProb >= 45 && awayProb - drawProb >= 8) {
      winner = features.away.teamName;
      awayGoals = clamp(homeGoals + 1, 1, 3);
    }
  }

  const sorted = [homeProb, drawProb, awayProb].sort((a, b) => b - a);
  const separation = sorted[0] - sorted[1];

const confidenceRaw =
  52 +
  separation * 0.9 +
  Math.abs(expectedGoalGap) * 5 +
  Math.abs(pointsGap) * 0.04;

let confidence = Math.round(confidenceRaw);

if (Math.abs(expectedGoalGap) < 0.2) {
  confidence = clamp(confidence, 50, 62);
} else if (Math.abs(expectedGoalGap) < 0.5) {
  confidence = clamp(confidence, 55, 70);
} else {
  confidence = clamp(confidence, 60, 78);
}

  const insights: string[] = [];

  insights.push(
    `${features.home.teamName} have taken ${homeRecentPoints} points from their last 5, compared with ${awayRecentPoints} for ${features.away.teamName}.`
  );

  insights.push(
    `${features.home.teamName} average ${homeHomeGoalsForPerGame.toFixed(1)} goals at home recently, while ${features.away.teamName} concede ${awayAwayGoalsAgainstPerGame.toFixed(1)} away.`
  );

  insights.push(
    `${features.away.teamName} average ${awayAwayGoalsForPerGame.toFixed(1)} goals away, while ${features.home.teamName} concede ${homeHomeGoalsAgainstPerGame.toFixed(1)} at home.`
  );

  if (Math.abs(pointsGap) >= 4) {
    insights.push(
      `${features.home.teamName} and ${features.away.teamName} are separated by ${Math.abs(pointsGap)} points in the table.`
    );
  } else if (context?.lastMeeting) {
    insights.push(`Last league meeting: ${context.lastMeeting}.`);
  } else if (context?.lastVenueMeeting) {
    insights.push(`Last meeting at this venue: ${context.lastVenueMeeting}.`);
  }

  return {
    winner,
    score: `${homeGoals}-${awayGoals}`,
    confidence,
    probabilities: {
      home: homeProb,
      draw: drawProb,
      away: awayProb,
    },
    insights: insights.slice(0, 4),
  };
}