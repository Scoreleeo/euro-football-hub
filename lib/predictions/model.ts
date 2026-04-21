import "server-only";
import type { MatchFeatures } from "./features";

export type LikelyScore = {
  score: string;
  probability: number;
};

export type PredictionOutput = {
  winner: string;
  outcome: "HOME_WIN" | "DRAW" | "AWAY_WIN";
  confidence: number;
  probabilities: {
    home: number;
    draw: number;
    away: number;
  };
  likelyScores: LikelyScore[];
  insights: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function poissonProbability(lambda: number, goals: number) {
  if (lambda <= 0) {
    return goals === 0 ? 1 : 0;
  }

  let factorial = 1;
  for (let i = 2; i <= goals; i++) {
    factorial *= i;
  }

  return (Math.exp(-lambda) * Math.pow(lambda, goals)) / factorial;
}

function dixonColesAdjustment(
  homeGoals: number,
  awayGoals: number,
  homeLambda: number,
  awayLambda: number,
  rho: number
) {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - homeLambda * awayLambda * rho;
  }

  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + homeLambda * rho;
  }

  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + awayLambda * rho;
  }

  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }

  return 1;
}

function buildScoreMatrix(homeXG: number, awayXG: number, maxGoals = 5) {
  const matrix: Array<{
    homeGoals: number;
    awayGoals: number;
    probability: number;
  }> = [];

  const rho = -0.08;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const base =
        poissonProbability(homeXG, h) * poissonProbability(awayXG, a);
      const dc = dixonColesAdjustment(h, a, homeXG, awayXG, rho);

      matrix.push({
        homeGoals: h,
        awayGoals: a,
        probability: base * dc,
      });
    }
  }

  const total = matrix.reduce((sum, row) => sum + row.probability, 0);

  return matrix.map((row) => ({
    ...row,
    probability: total > 0 ? row.probability / total : 0,
  }));
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp((v - max) / 8));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export function buildPrediction(
  features: MatchFeatures,
  context?: {
    lastMeeting?: string | null;
    lastVenueMeeting?: string | null;
  }
): PredictionOutput {
  let homeXG = features.expectedGoals.home;
  let awayXG = features.expectedGoals.away;

  const pointsGap = features.pointsGap;
  const goalDifferenceGap = features.goalDifferenceGap;
  const formGap = features.home.weightedRecentPoints - features.away.weightedRecentPoints;

  if (Math.abs(pointsGap) >= 10) {
    if (pointsGap > 0) {
      homeXG += 0.06;
      awayXG -= 0.04;
    } else {
      awayXG += 0.06;
      homeXG -= 0.04;
    }
  }

  if (Math.abs(goalDifferenceGap) >= 8) {
    if (goalDifferenceGap > 0) {
      homeXG += 0.04;
      awayXG -= 0.03;
    } else {
      awayXG += 0.04;
      homeXG -= 0.03;
    }
  }

  if (Math.abs(formGap) >= 0.8) {
    if (formGap > 0) {
      homeXG += 0.04;
      awayXG -= 0.03;
    } else {
      awayXG += 0.04;
      homeXG -= 0.03;
    }
  }

  if (context?.lastMeeting?.includes("0-0")) {
    homeXG -= 0.03;
    awayXG -= 0.03;
  }

  if (context?.lastVenueMeeting?.includes("0-0")) {
    homeXG -= 0.02;
    awayXG -= 0.02;
  }

  homeXG = clamp(homeXG, 0.35, 2.45);
  awayXG = clamp(awayXG, 0.25, 2.1);

  const totalXG = homeXG + awayXG;
  if (totalXG > 3.25) {
    const scale = 3.25 / totalXG;
    homeXG *= scale;
    awayXG *= scale;
  }

  const scoreMatrix = buildScoreMatrix(homeXG, awayXG, 5);

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  for (const row of scoreMatrix) {
    if (row.homeGoals > row.awayGoals) {
      homeWinProb += row.probability;
    } else if (row.homeGoals < row.awayGoals) {
      awayWinProb += row.probability;
    } else {
      drawProb += row.probability;
    }
  }

  const xgGap = homeXG - awayXG;
  const tableEdge = clamp(pointsGap / 20, -1.2, 1.2);
  const formEdge = clamp(formGap / 2.5, -1.1, 1.1);

  const [homeOutcomeRaw, drawOutcomeRaw, awayOutcomeRaw] = softmax([
    xgGap * 7 + tableEdge * 1.7 + formEdge * 1.2,
    0.9 - Math.abs(xgGap) * 3.4,
    -xgGap * 7 - tableEdge * 1.7 - formEdge * 1.2,
  ]);

  homeWinProb = homeWinProb * 0.72 + homeOutcomeRaw * 0.28;
  drawProb = drawProb * 0.72 + drawOutcomeRaw * 0.28;
  awayWinProb = awayWinProb * 0.72 + awayOutcomeRaw * 0.28;

  const probTotal = homeWinProb + drawProb + awayWinProb;
  homeWinProb /= probTotal;
  drawProb /= probTotal;
  awayWinProb /= probTotal;

  let homeProb = Math.round(homeWinProb * 100);
  let drawProbRounded = Math.round(drawProb * 100);
  let awayProb = Math.round(awayWinProb * 100);

  const roundedTotal = homeProb + drawProbRounded + awayProb;
  if (roundedTotal !== 100) {
    homeProb += 100 - roundedTotal;
  }

  const likelyScores = [...scoreMatrix]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .map((item) => ({
      score: `${item.homeGoals}-${item.awayGoals}`,
      probability: Math.round(item.probability * 1000) / 10,
    }));

  let outcome: "HOME_WIN" | "DRAW" | "AWAY_WIN" = "DRAW";
  let winner = "Draw";

  if (homeProb > drawProbRounded && homeProb > awayProb) {
    outcome = "HOME_WIN";
    winner = features.home.teamName;
  } else if (awayProb > drawProbRounded && awayProb > homeProb) {
    outcome = "AWAY_WIN";
    winner = features.away.teamName;
  }

  const sortedOutcomeProbs = [homeProb, drawProbRounded, awayProb].sort(
    (a, b) => b - a
  );
  const separation = sortedOutcomeProbs[0] - sortedOutcomeProbs[1];
  const expectedGoalGap = Math.abs(homeXG - awayXG);
  const edge = Math.abs(homeProb - awayProb);

  let confidence = Math.round(
    50 +
      edge * 0.6 +
      expectedGoalGap * 10 +
      Math.abs(pointsGap) * 0.04
  );

  confidence = clamp(confidence, 52, 78);

  const insights: string[] = [];

  insights.push(
    `${features.home.teamName} average ${round1(
      features.home.homeAwayGoalsForPerGame
    )} goals at home, while ${features.away.teamName} concede ${round1(
      features.away.homeAwayGoalsAgainstPerGame
    )} away.`
  );

  insights.push(
    `${features.away.teamName} average ${round1(
      features.away.homeAwayGoalsForPerGame
    )} goals away, while ${features.home.teamName} concede ${round1(
      features.home.homeAwayGoalsAgainstPerGame
    )} at home.`
  );

  if (Math.abs(pointsGap) >= 5) {
    insights.push(
      `${features.home.teamName} and ${features.away.teamName} are separated by ${Math.abs(
        pointsGap
      )} points in the table.`
    );
  } else {
    insights.push(
      `${features.home.teamName} have taken ${features.home.recentPoints} points recently, compared with ${features.away.recentPoints} for ${features.away.teamName}.`
    );
  }

  if (context?.lastVenueMeeting) {
    insights.push(`Last meeting at this venue: ${context.lastVenueMeeting}.`);
  } else if (context?.lastMeeting) {
    insights.push(`Last league meeting: ${context.lastMeeting}.`);
  }

  return {
    winner,
    outcome,
    confidence,
    probabilities: {
      home: homeProb,
      draw: drawProbRounded,
      away: awayProb,
    },
    likelyScores,
    insights: insights.slice(0, 4),
  };
}