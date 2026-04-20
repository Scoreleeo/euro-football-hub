"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { TOP_EURO_LEAGUES } from "@/lib/constants";

type MatchRow = {
  fixtureId: number;
  date: string;
  status: string;
  elapsed?: number | null;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  goals: {
    home: number | null;
    away: number | null;
  };
};

type StandingRow = {
  rank: number;
  teamId: number;
  team: string;
  logo?: string;
  played: number;
  goalDiff: number;
  points: number;
  form: string;
};

type NewsItem = {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  date?: string;
  link?: string;
  kind?: "breaking" | "injury" | "transfer" | "news" | string;
};

type DashboardPayload = {
  standings: StandingRow[];
  fixtures: MatchRow[];
  results: MatchRow[];
  live: MatchRow[];
  news?: NewsItem[];
};

const SEASON = 2025;

function TeamLogo({
  src,
  alt,
  size = 24,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  const boxSize = size + 6;

  if (!src) {
    return (
      <div
        className="shrink-0 rounded-full bg-white/10"
        style={{ width: boxSize, height: boxSize }}
      />
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-white/5"
      style={{ width: boxSize, height: boxSize }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${boxSize}px`}
        className="object-contain p-1"
      />
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827] shadow-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LiveTicker({
  matches,
}: {
  matches: Array<{
    fixtureId: number;
    homeTeam: string;
    awayTeam: string;
    homeLogo?: string;
    awayLogo?: string;
    goals: { home: number | null; away: number | null };
    elapsed?: number | null;
    leagueName: string;
  }>;
}) {
  const previousScoresRef = useRef<Record<number, string>>({});
  const [flashingIds, setFlashingIds] = useState<number[]>([]);

  useEffect(() => {
    const changedIds: number[] = [];

    matches.forEach((match) => {
      const currentScore = `${match.goals.home ?? 0}-${match.goals.away ?? 0}`;
      const previousScore = previousScoresRef.current[match.fixtureId];

      if (previousScore && previousScore !== currentScore) {
        changedIds.push(match.fixtureId);
      }

      previousScoresRef.current[match.fixtureId] = currentScore;
    });

    if (changedIds.length > 0) {
      setFlashingIds((prev) => Array.from(new Set([...prev, ...changedIds])));

      const timeout = window.setTimeout(() => {
        setFlashingIds((prev) =>
          prev.filter((id) => !changedIds.includes(id))
        );
      }, 4000);

      return () => window.clearTimeout(timeout);
    }
  }, [matches]);

  const items =
    matches.length > 0
      ? [...matches, ...matches]
      : [
          {
            fixtureId: 0,
            homeTeam: "No live matches",
            awayTeam: "Check back soon",
            homeLogo: undefined,
            awayLogo: undefined,
            goals: { home: null, away: null },
            elapsed: null,
            leagueName: "Live Centre",
          },
        ];

  return (
    <div className="sticky top-0 z-50 overflow-hidden border-b border-red-400/20 bg-[#09111d]/95 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="shrink-0 rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Live
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="ticker-track flex min-w-max items-center gap-8">
            {items.map((match, index) => {
              const isFlashing =
                match.fixtureId !== 0 && flashingIds.includes(match.fixtureId);

              return (
                <div
                  key={`${match.fixtureId}-${index}`}
                  className="flex shrink-0 items-center gap-3 rounded-lg px-2 py-1 text-sm text-white"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {match.leagueName}
                  </span>

                  {match.fixtureId !== 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.homeLogo} alt={match.homeTeam} />
                        <span className="font-medium">{match.homeTeam}</span>
                      </div>

                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap transition ${
                          isFlashing
                            ? "bg-red-500 text-white ticker-score-flash"
                            : "bg-white text-slate-950"
                        }`}
                      >
                        {match.goals.home ?? 0} - {match.goals.away ?? 0}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="font-medium">{match.awayTeam}</span>
                        <TeamLogo src={match.awayLogo} alt={match.awayTeam} />
                      </div>

                      <span className="text-xs font-semibold whitespace-nowrap text-red-400">
                        {match.elapsed ? `${match.elapsed}'` : "LIVE"}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-300">
                      No live matches right now. Check back soon.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [leagueId, setLeagueId] = useState<number>(TOP_EURO_LEAGUES[0].id);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const selectedLeague = useMemo(
    () =>
      TOP_EURO_LEAGUES.find((league) => league.id === leagueId) ||
      TOP_EURO_LEAGUES[0],
    [leagueId]
  );

  async function loadData(id: number, background = false) {
    if (!background) {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetch(`/api/dashboard/${id}?season=${SEASON}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard: ${res.status}`);
      }

      const json: DashboardPayload = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError("Could not load football data.");
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadData(leagueId, false);

    const interval = setInterval(() => {
      void loadData(leagueId, true);
    }, 120000);

    return () => clearInterval(interval);
  }, [leagueId]);

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  function formatNewsDate(value?: string) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  const news = data?.news?.slice(0, 6) ?? [];

  const kindClasses: Record<string, string> = {
    breaking: "bg-red-500 text-white shadow-md shadow-red-500/30",
    injury: "bg-yellow-500 text-black",
    transfer: "bg-blue-500 text-white",
    news: "bg-white/10 text-white",
  };

  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      <LiveTicker matches={data?.live || []} />

      <div className="border-b border-white/10 bg-[#08101c]">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
            Live Football Centre
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e293b] shadow-2xl">
          <div className="grid gap-6 px-6 py-8 md:px-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
                Matchday coverage
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Pro Football Intel
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Data-driven football insights, live scores, and AI-powered match
                predictions across Europe’s top leagues.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/predictions"
                  className="rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-400"
                >
                  View AI Predictions
                </a>

                <a
                  href="/predictions"
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Premium Insights →
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  League
                </div>
                <div className="mt-2 text-lg font-bold">
                  {selectedLeague.name}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Season
                </div>
                <div className="mt-2 text-lg font-bold">{SEASON}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Live Games
                </div>
                <div className="mt-2 text-lg font-bold">
                  {data?.live?.length ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Updated
                </div>
                <div className="mt-2 text-lg font-bold">
                  {lastUpdated || "--:--:--"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-red-400/20 bg-gradient-to-r from-red-500/10 to-red-400/5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-red-300">
                New
              </div>
              <div className="text-lg font-bold">
                AI Match Predictions Now Live
              </div>
              <div className="text-sm text-slate-300">
                Unlock win probabilities, score predictions and confidence
                ratings.
              </div>
            </div>

            <a
              href="/predictions"
              className="inline-flex rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
            >
              View →
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#101826] p-4 shadow-xl">
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

        {loading ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#111827] p-6">
            <div className="text-slate-300">
              Loading {selectedLeague.name} data...
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-6">
            <div className="font-semibold text-red-200">{error}</div>
          </section>
        ) : null}

        {!loading && data ? (
          <>
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">Live Matches</h2>
                <span className="text-sm font-semibold text-red-400">
                  {data.live.length} LIVE
                </span>
              </div>

              {data.live.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#111827] p-5 text-slate-300">
                  No live matches right now.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  {data.live.map((match) => (
                    <div
                      key={match.fixtureId}
                      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4 shadow-lg transition hover:border-red-400/40"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                        <span className="truncate text-slate-400">
                          {match.leagueName}
                        </span>
                        <span className="shrink-0 text-red-400">
                          LIVE {match.elapsed ?? ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <TeamLogo src={match.homeLogo} alt={match.homeTeam} />
                          <span className="truncate font-semibold">
                            {match.homeTeam}
                          </span>
                        </div>

                        <div className="min-w-[64px] rounded-xl bg-white px-3 py-2 text-center text-sm font-black leading-none whitespace-nowrap text-slate-950">
                          {match.goals.home ?? 0} - {match.goals.away ?? 0}
                        </div>

                        <div className="flex min-w-0 items-center justify-end gap-2">
                          <span className="truncate text-right font-semibold">
                            {match.awayTeam}
                          </span>
                          <TeamLogo src={match.awayLogo} alt={match.awayTeam} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SectionCard title="Standings">
                {data.standings.length === 0 ? (
                  <p className="text-slate-300">
                    No standings returned for this league.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.standings.map((row) => (
                      <div
                        key={row.teamId}
                        className="flex min-h-[60px] items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-6 shrink-0 text-sm font-semibold text-slate-400">
                            {row.rank}
                          </span>
                          <TeamLogo src={row.logo} alt={row.team} />
                          <span className="truncate font-semibold">
                            {row.team}
                          </span>
                        </div>

                        <div className="shrink-0 text-sm text-slate-300">
                          {row.points} pts • GD {row.goalDiff}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Upcoming Fixtures">
                {data.fixtures.length === 0 ? (
                  <p className="text-slate-300">
                    No fixtures returned for this league.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.fixtures.map((match) => (
                      <div
                        key={match.fixtureId}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="text-sm text-slate-400">
                          {match.leagueName}
                        </div>

                        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamLogo
                              src={match.homeLogo}
                              alt={match.homeTeam}
                            />
                            <span className="truncate font-medium">
                              {match.homeTeam}
                            </span>
                          </div>

                          <span className="text-sm font-semibold uppercase text-slate-400">
                            vs
                          </span>

                          <div className="flex min-w-0 items-center justify-end gap-2">
                            <span className="truncate text-right font-medium">
                              {match.awayTeam}
                            </span>
                            <TeamLogo
                              src={match.awayLogo}
                              alt={match.awayTeam}
                            />
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-slate-300">
                          {formatDate(match.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mt-6">
              <SectionCard title="Latest Results">
                {data.results.length === 0 ? (
                  <p className="text-slate-300">
                    No results returned for this league.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.results.map((match) => (
                      <div
                        key={match.fixtureId}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="text-sm text-slate-400">
                          {match.leagueName}
                        </div>

                        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamLogo
                              src={match.homeLogo}
                              alt={match.homeTeam}
                            />
                            <span className="truncate font-medium">
                              {match.homeTeam}
                            </span>
                          </div>

                          <span className="min-w-[64px] rounded-xl bg-slate-950 px-3 py-2 text-center text-sm font-black leading-none whitespace-nowrap">
                            {match.goals.home ?? 0} - {match.goals.away ?? 0}
                          </span>

                          <div className="flex min-w-0 items-center justify-end gap-2">
                            <span className="truncate text-right font-medium">
                              {match.awayTeam}
                            </span>
                            <TeamLogo
                              src={match.awayLogo}
                              alt={match.awayTeam}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="mt-6">
              <SectionCard title="Football News">
                {news.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
                    Football news feed unavailable right now.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"></div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                        Live Updates
                      </span>
                    </div>

                    {news.map((article, i) => {
                      const isFeatured = i === 0;
                      const kind = article.kind?.toLowerCase() || "news";

                      const cardClasses = isFeatured
                        ? "block overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] p-7 shadow-lg transition hover:border-red-400/30 hover:bg-white/[0.04] md:p-8"
                        : "block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10";

                      const titleClasses = isFeatured
                        ? "mt-4 max-w-4xl text-3xl font-black leading-tight text-white md:text-4xl lg:text-5xl"
                        : "mt-2 text-lg font-bold leading-tight text-white md:text-xl";

                      const summaryClasses = isFeatured
                        ? "mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg"
                        : "mt-3 text-sm leading-6 text-slate-300";

                      const content = (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                kindClasses[kind] || kindClasses.news
                              }`}
                            >
                              {kind}
                            </span>

                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                              {article.source || "Football News"}
                            </span>
                          </div>

                          <div className={titleClasses}>{article.title}</div>

                          {article.summary ? (
                            <div className={summaryClasses}>{article.summary}</div>
                          ) : null}

                          {article.date ? (
                            <div className="mt-4 text-xs font-medium text-slate-500">
                              {formatNewsDate(article.date)}
                            </div>
                          ) : null}
                        </>
                      );

                      if (article.link) {
                        return (
                          <a
                            key={article.id}
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cardClasses}
                          >
                            {content}
                          </a>
                        );
                      }

                      return (
                        <div key={article.id} className={cardClasses}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}