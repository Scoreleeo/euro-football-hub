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

function roundScore(value: number) {
  return clamp(Math.round(num(value)), 0, 4);
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

  const homeGoalsForPerGame = num(features.home.goalsForPerGame);
  const awayGoalsForPerGame = num(features.away.goalsForPerGame);

  const homeGoalsAgainstPerGame = num(features.home.goalsAgainstPerGame);
  const awayGoalsAgainstPerGame = num(features.away.goalsAgainstPerGame);

  const homeAwayGoalsForPerGame = num(features.home.homeAwayGoalsForPerGame);
  const awayAwayGoalsForPerGame = num(features.away.homeAwayGoalsForPerGame);

  const homeAwayGoalsAgainstPerGame = num(
    features.home.homeAwayGoalsAgainstPerGame
  );
  const awayAwayGoalsAgainstPerGame = num(
    features.away.homeAwayGoalsAgainstPerGame
  );

  const homeFormScore = num(features.home.formScore);
  const awayFormScore = num(features.away.formScore);

  const pointsGap = num(features.pointsGap);
  const homeAdvantage = num(features.homeAdvantage, 0.45);

  const modelHomeInjuries = num(features.home.modelInjuryCount);
  const modelAwayInjuries = num(features.away.modelInjuryCount);

  const homeAttack =
    homeGoalsForPerGame * 1.2 + homeAwayGoalsForPerGame * 1.15;

  const awayAttack =
    awayGoalsForPerGame * 1.2 + awayAwayGoalsForPerGame * 1.15;

  const homeDefenceWeakness =
    homeGoalsAgainstPerGame * 0.9 + homeAwayGoalsAgainstPerGame * 1.05;

  const awayDefenceWeakness =
    awayGoalsAgainstPerGame * 0.9 + awayAwayGoalsAgainstPerGame * 1.05;

  const homeRating =
    homeFormScore +
    homeAttack * 1.3 -
    homeDefenceWeakness * 0.7 +
    pointsGap * 0.03 +
    homeAdvantage -
    modelHomeInjuries * 0.15;

  const awayRating =
    awayFormScore +
    awayAttack * 1.3 -
    awayDefenceWeakness * 0.7 -
    pointsGap * 0.03 -
    modelAwayInjuries * 0.15;

  const ratingGap = num(homeRating - awayRating);

  let predictedHomeGoals =
    1.15 +
    homeGoalsForPerGame * 0.55 +
    awayGoalsAgainstPerGame * 0.35 +
    homeAwayGoalsForPerGame * 0.35 +
    homeAdvantage * 0.5 -
    modelHomeInjuries * 0.08;

  let predictedAwayGoals =
    0.85 +
    awayGoalsForPerGame * 0.5 +
    homeGoalsAgainstPerGame * 0.3 +
    awayAwayGoalsForPerGame * 0.3 -
    modelAwayInjuries * 0.08;

  predictedHomeGoals += clamp(ratingGap * 0.12, -0.6, 0.9);
  predictedAwayGoals += clamp(-ratingGap * 0.12, -0.6, 0.9);

  predictedHomeGoals = num(predictedHomeGoals, 1);
  predictedAwayGoals = num(predictedAwayGoals, 1);

  const homeGoals = roundScore(predictedHomeGoals);
  const awayGoals = roundScore(predictedAwayGoals);

  let winner = "Draw";
  if (homeGoals > awayGoals) winner = features.home.teamName;
  if (awayGoals > homeGoals) winner = features.away.teamName;

  const rawHomeProb = 45 + ratingGap * 8 + homeAdvantage * 10;
  const rawAwayProb = 45 - ratingGap * 8 - homeAdvantage * 4;

  let homeProb = clamp(Math.round(num(rawHomeProb, 45)), 12, 78);
  let awayProb = clamp(Math.round(num(rawAwayProb, 45)), 12, 78);
  let drawProb = 100 - homeProb - awayProb;

  if (drawProb < 10) {
    const deficit = 10 - drawProb;
    homeProb -= Math.ceil(deficit / 2);
    awayProb -= Math.floor(deficit / 2);
    drawProb = 10;
  }

  homeProb = clamp(homeProb, 10, 80);
  awayProb = clamp(awayProb, 10, 80);
  drawProb = clamp(100 - homeProb - awayProb, 10, 35);

  const confidence = clamp(
    Math.round(
      56 +
        Math.abs(ratingGap) * 7 +
        Math.abs(pointsGap) * 0.15 +
        Math.abs(homeRecentPoints - awayRecentPoints) * 0.8
    ),
    55,
    89
  );

  const insights: string[] = [];

  insights.push(
    `${features.home.teamName} have taken ${homeRecentPoints} points from their last 5 matches.`
  );

  insights.push(
    `${features.away.teamName} average ${awayGoalsAgainstPerGame.toFixed(
      1
    )} goals conceded per game across their last 5.`
  );

  if (context?.lastMeeting) {
    insights.push(`Last league meeting: ${context.lastMeeting}.`);
  }

  if (context?.lastVenueMeeting) {
    insights.push(`Last meeting at this venue: ${context.lastVenueMeeting}.`);
  }

  if (!context?.lastMeeting && pointsGap !== 0) {
    insights.push(
      `${features.home.teamName} and ${features.away.teamName} are separated by ${Math.abs(
        pointsGap
      )} points in the table.`
    );
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