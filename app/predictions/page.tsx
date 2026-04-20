"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { TOP_EURO_LEAGUES } from "@/lib/constants";

type PredictionMatch = {
  fixtureId: number;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  date: string;
  prediction: {
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
};

function TeamLogo({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) {
  if (!src) {
    return <div className="h-6 w-6 rounded-full bg-white/10" />;
  }

  return (
    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white/5">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="24px"
        className="object-contain p-1"
      />
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let label = "Low";
  let styles = "bg-red-500/15 text-red-300 border-red-400/20";

  if (confidence >= 72) {
    label = "High";
    styles = "bg-green-500/15 text-green-300 border-green-400/20";
  } else if (confidence >= 62) {
    label = "Medium";
    styles = "bg-yellow-500/15 text-yellow-300 border-yellow-400/20";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

function ProbabilityBar({
  label,
  value,
  barClassName,
}: {
  label: string;
  value: number;
  barClassName: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${barClassName}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getPredictionLabel(match: PredictionMatch) {
  const { winner } = match.prediction;

  if (winner === "Draw") {
    return "Draw";
  }

  if (winner === match.home) {
    return "Home Win";
  }

  if (winner === match.away) {
    return "Away Win";
  }

  return winner;
}

function getPredictionAccent(match: PredictionMatch) {
  const label = getPredictionLabel(match);

  if (label === "Home Win") {
    return "text-green-300";
  }

  if (label === "Away Win") {
    return "text-blue-300";
  }

  return "text-yellow-300";
}

export default function PredictionsPage() {
  const [matches, setMatches] = useState<PredictionMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState<number>(TOP_EURO_LEAGUES[0].id);

  const selectedLeague =
    TOP_EURO_LEAGUES.find((league) => league.id === leagueId) ||
    TOP_EURO_LEAGUES[0];

  useEffect(() => {
    setLoading(true);

    fetch(`/api/predictions?league=${leagueId}&season=2025`)
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches || []);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(() => {
        setMatches([]);
        setLoading(false);
      });
  }, [leagueId]);

  return (
    <main className="min-h-screen bg-[#0b1220] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e293b] p-6 shadow-2xl">
          <div className="mb-3 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
            Premium insights
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Pro Football Intel — Predictions
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Smarter match outlooks for upcoming fixtures across Europe’s top
            leagues. We now focus on the most credible prediction type:
            home win, draw, or away win.
          </p>

          <div className="mt-2 text-sm text-slate-400">
            Showing predictions for{" "}
            <span className="font-semibold text-white">
              {selectedLeague.name}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#101826] p-4 shadow-xl">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Select competition
          </div>

          <div className="flex flex-wrap gap-3">
            {TOP_EURO_LEAGUES.map((league) => {
              const active = league.id === leagueId;

              return (
                <button
                  key={league.id}
                  onClick={() => setLeagueId(league.id)}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[#d90429] text-white shadow-lg"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                  ].join(" ")}
                >
                  {league.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Model status
            </div>
            <div className="mt-2 text-lg font-bold">Outcome mode active</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Prediction style
            </div>
            <div className="mt-2 text-lg font-bold">
              Home win / Draw / Away win
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Access
            </div>
            <div className="mt-2 text-lg font-bold">All unlocked</div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
            <p className="text-slate-300">Loading predictions...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <PredictionCard key={match.fixtureId} match={match} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PredictionCard({
  match,
}: {
  match: PredictionMatch;
}) {
  const predictionLabel = getPredictionLabel(match);
  const predictionAccent = getPredictionAccent(match);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-400">
        <span>{match.league}</span>
        <span>{new Date(match.date).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo src={match.homeLogo} alt={match.home} />
          <span className="truncate font-semibold">{match.home}</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase text-slate-300">
          vs
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right font-semibold">
            {match.away}
          </span>
          <TeamLogo src={match.awayLogo} alt={match.away} />
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-xl border border-green-400/20 bg-green-500/10 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Prediction
            </div>
            <div className={`text-xl font-black ${predictionAccent}`}>
              {predictionLabel}
            </div>
          </div>

          <ConfidenceBadge confidence={match.prediction.confidence} />
        </div>

        <div className="rounded-lg bg-black/20 px-3 py-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            Confidence
          </div>
          <div className="mt-1 text-lg font-bold text-white">
            {match.prediction.confidence}%
          </div>
        </div>

        <div className="pt-2">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">
            Win probabilities
          </div>

          <div className="space-y-2">
            <ProbabilityBar
              label={match.home}
              value={match.prediction.probabilities.home}
              barClassName="bg-green-400"
            />
            <ProbabilityBar
              label="Draw"
              value={match.prediction.probabilities.draw}
              barClassName="bg-yellow-400"
            />
            <ProbabilityBar
              label={match.away}
              value={match.prediction.probabilities.away}
              barClassName="bg-blue-400"
            />
          </div>
        </div>

        <div className="pt-2">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">
            Match insights
          </div>

          <ul className="space-y-2 text-xs text-slate-200">
            {match.prediction.insights.map((insight, index) => (
              <li key={index} className="rounded-lg bg-black/20 px-3 py-2">
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}