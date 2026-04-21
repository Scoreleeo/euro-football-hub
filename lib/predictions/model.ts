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

function buildScoreMatrix(homeXG: number, awayXG: number, maxGoals = 5) {
  const matrix: Array<{
    homeGoals: number;
    awayGoals: number;
    probability: number;
  }> = [];

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const probability =
        poissonProbability(homeXG, h) * poissonProbability(awayXG, a);

      matrix.push({
        homeGoals: h,
        awayGoals: a,
        probability,
      });
    }
  }

  return matrix;
}

export function buildPrediction(
  features: MatchFeatures,
  context?: {
    lastMeeting?: string | null;
    lastVenueMeeting?: string | null;
  }
): PredictionOutput {
  const homeXG = features.expectedGoals.home;
  const awayXG = features.expectedGoals.away;

  const matrix = buildScoreMatrix(homeXG, awayXG, 5);

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  for (const row of matrix) {
    if (row.homeGoals > row.awayGoals) {
      homeWinProb += row.probability;
    } else if (row.homeGoals < row.awayGoals) {
      awayWinProb += row.probability;
    } else {
      drawProb += row.probability;
    }
  }

  let homeProb = Math.round(homeWinProb * 100);
  let drawProbRounded = Math.round(drawProb * 100);
  let awayProb = Math.round(awayWinProb * 100);

  const totalProb = homeProb + drawProbRounded + awayProb;
  if (totalProb !== 100) {
    homeProb += 100 - totalProb;
  }

  const likelyScores = matrix
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

  let confidence = Math.round(
    50 + separation * 1.15 + expectedGoalGap * 8 + Math.abs(features.pointsGap) * 0.07
  );

  if (expectedGoalGap < 0.2) {
    confidence = clamp(confidence, 50, 61);
  } else if (expectedGoalGap < 0.45) {
    confidence = clamp(confidence, 55, 68);
  } else {
    confidence = clamp(confidence, 60, 77);
  }

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

  if (Math.abs(features.pointsGap) >= 4) {
    insights.push(
      `${features.home.teamName} and ${features.away.teamName} are separated by ${Math.abs(
        features.pointsGap
      )} points in the table.`
    );
  } else {
    insights.push(
      `${features.home.teamName} have taken ${features.home.recentPoints} points from their recent matches, compared with ${features.away.recentPoints} for ${features.away.teamName}.`
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