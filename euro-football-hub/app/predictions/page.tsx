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

type CheckoutMode =
  | { type: "division" }
  | { type: "match"; match: PredictionMatch }
  | null;

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

  if (confidence >= 70) {
    label = "High";
    styles = "bg-green-500/15 text-green-300 border-green-400/20";
  } else if (confidence >= 60) {
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

export default function PredictionsPage() {
  const [matches, setMatches] = useState<PredictionMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sampleUnlockedIds, setSampleUnlockedIds] = useState<number[]>([]);
  const [divisionUnlocked, setDivisionUnlocked] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutMode>(null);
  const [leagueId, setLeagueId] = useState<number>(TOP_EURO_LEAGUES[0].id);

  const selectedLeague =
    TOP_EURO_LEAGUES.find((league) => league.id === leagueId) ||
    TOP_EURO_LEAGUES[0];

  async function loadPurchaseState(currentMatches: PredictionMatch[]) {
    if (!currentMatches.length) return;

    const league = currentMatches[0]?.league;
    let divisionPaid = false;
    let paidMatchIds: number[] = [];

    if (league) {
      const leagueRes = await fetch(
        `/api/purchases?league=${encodeURIComponent(league)}`,
        { cache: "no-store" }
      );
      const leagueData = await leagueRes.json();
      divisionPaid = Boolean(leagueData.unlocked);
    }

    if (!divisionPaid) {
      const results = await Promise.all(
        currentMatches.map(async (match) => {
          const res = await fetch(`/api/purchases?fixtureId=${match.fixtureId}`, {
            cache: "no-store",
          });
          const data = await res.json();
          return data.unlocked ? match.fixtureId : null;
        })
      );

      paidMatchIds = results.filter((id): id is number => id !== null);
    }

    setDivisionUnlocked(divisionPaid);

    setSampleUnlockedIds((prev) => {
      const combined = new Set([...prev, ...paidMatchIds]);
      return Array.from(combined);
    });
  }

  useEffect(() => {
    setLoading(true);
    setSampleUnlockedIds([]);
    setDivisionUnlocked(false);

    fetch(`/api/predictions?league=${leagueId}&season=2025`)
      .then((res) => res.json())
      .then(async (data) => {
        const loadedMatches = data.matches || [];
        setMatches(loadedMatches);
        await loadPurchaseState(loadedMatches);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(() => {
        setMatches([]);
        setLoading(false);
      });
  }, [leagueId]);

  function unlockSamples() {
    const ids = matches.slice(0, 2).map((m) => m.fixtureId);

    setSampleUnlockedIds((prev) => {
      const combined = new Set([...prev, ...ids]);
      return Array.from(combined);
    });
  }

  function openDivisionCheckout() {
    setCheckout({ type: "division" });
  }

  function openMatchCheckout(match: PredictionMatch) {
    setCheckout({ type: "match", match });
  }

  function closeCheckout() {
    setCheckout(null);
  }

  async function completeFakeCheckout() {
    if (!checkout) return;

    const body =
      checkout.type === "division"
        ? {
            type: "division",
            league: matches[0]?.league || selectedLeague.name,
          }
        : {
            type: "match",
            fixtureId: checkout.match.fixtureId,
            home: checkout.match.home,
            away: checkout.match.away,
            league: checkout.match.league,
          };

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    alert(data.error || "Checkout failed");
  }

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
            AI-style match predictions for upcoming fixtures across Europe’s top
            leagues.
          </p>

          <div className="mt-2 text-sm text-slate-400">
            Showing predictions for{" "}
            <span className="font-semibold text-white">
              {selectedLeague.name}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={openDivisionCheckout}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
            >
              Unlock All Predictions – £9.99
            </button>

            <button
              onClick={unlockSamples}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              View Sample Predictions
            </button>
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

        <section className="rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-yellow-300">
                Premium Division Access
              </div>
              <h2 className="mt-1 text-2xl font-bold">
                Unlock every prediction in this league
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-yellow-100/90">
                Get every upcoming match prediction, win probabilities,
                confidence scores, and premium insights in one unlock.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {divisionUnlocked ? (
                <span className="rounded-2xl border border-green-400/20 bg-green-500/10 px-5 py-4 text-center text-green-300">
                  Division unlocked
                </span>
              ) : (
                <>
                  <div className="rounded-2xl border border-yellow-300/20 bg-black/20 px-5 py-4 text-center">
                    <div className="text-sm text-yellow-200">Division Pass</div>
                    <div className="mt-1 text-3xl font-black">£9.99</div>
                  </div>

                  <button
                    onClick={openDivisionCheckout}
                    className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-300"
                  >
                    Unlock Now
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Model status
            </div>
            <div className="mt-2 text-lg font-bold">Updated today</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Sample access
            </div>
            <div className="mt-2 text-lg font-bold">
              {sampleUnlockedIds.length > 0
                ? `${sampleUnlockedIds.length} unlocked`
                : "Try before you buy"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Division access
            </div>
            <div className="mt-2 text-lg font-bold">
              {divisionUnlocked ? "Active" : "Not unlocked"}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
            <p className="text-slate-300">Loading predictions...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => {
              const isSampleUnlocked = sampleUnlockedIds.includes(
                match.fixtureId
              );
              const unlocked = divisionUnlocked || isSampleUnlocked;

              return (
                <PredictionCard
                  key={match.fixtureId}
                  match={match}
                  unlocked={unlocked}
                  onUnlock={() => openMatchCheckout(match)}
                />
              );
            })}
          </div>
        )}
      </div>

      {checkout ? (
        <FakeCheckoutModal
          checkout={checkout}
          onClose={closeCheckout}
          onConfirm={completeFakeCheckout}
        />
      ) : null}
    </main>
  );
}

function PredictionCard({
  match,
  unlocked,
  onUnlock,
}: {
  match: PredictionMatch;
  unlocked: boolean;
  onUnlock: () => void;
}) {
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

      <div className="mt-4">
        {unlocked ? (
          <div className="space-y-3 rounded-xl border border-green-400/20 bg-green-500/10 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">
                🏆 Winner: {match.prediction.winner}
              </div>
              <ConfidenceBadge confidence={match.prediction.confidence} />
            </div>

            <div>📊 Score: {match.prediction.score}</div>
            <div>🎯 Confidence: {match.prediction.confidence}%</div>

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
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-sm font-medium text-slate-200">
                🔒 Pro Insight Locked
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Unlock win probability, score prediction, confidence rating,
                and match-specific insights.
              </div>
            </div>

            <button
              onClick={onUnlock}
              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
            >
              Unlock for £1.99
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FakeCheckoutModal({
  checkout,
  onClose,
  onConfirm,
}: {
  checkout: CheckoutMode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!checkout) return null;

  const title =
    checkout.type === "division"
      ? "Unlock Full Division"
      : `Unlock ${checkout.match.home} vs ${checkout.match.away}`;

  const price = checkout.type === "division" ? "£9.99" : "£1.99";
  const description =
    checkout.type === "division"
      ? "This will unlock every prediction in the current league."
      : "This will unlock the full prediction insight for this single match.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-300">
          Checkout
        </div>

        <h3 className="text-2xl font-black">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{description}</p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-slate-400">Amount due</div>
          <div className="mt-1 text-3xl font-black">{price}</div>
        </div>

        <div className="mt-5 space-y-3">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold text-white hover:bg-red-400"
          >
            Continue to checkout
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-200 hover:bg-white/10"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          This opens a Stripe Checkout session. Unlocks are applied after
          successful payment via webhook.
        </p>
      </div>
    </div>
  );
}