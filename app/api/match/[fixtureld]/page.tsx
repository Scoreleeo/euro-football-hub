"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MatchDetailPayload = {
  match: {
    fixtureId: number;
    date: string;
    referee: string;
    timezone: string;
    venue: string;
    city: string;
    statusShort: string;
    statusLong: string;
    elapsed?: number | null;
    leagueName: string;
    leagueRound: string;
    leagueLogo?: string;
    homeTeam: string;
    awayTeam: string;
    homeLogo?: string;
    awayLogo?: string;
    homeGoals: number | null;
    awayGoals: number | null;
  };
  lineups: Array<{
    teamId: number;
    teamName: string;
    teamLogo?: string;
    formation: string;
    coach: string;
    startXI: Array<{
      name: string;
      number: string | number;
      pos: string;
    }>;
    substitutes: Array<{
      name: string;
      number: string | number;
      pos: string;
    }>;
  }>;
  statistics: Array<{
    type: string;
    home: string;
    away: string;
  }>;
  events: Array<{
    id: string;
    elapsed: number;
    extra?: number | null;
    teamName: string;
    teamLogo?: string;
    playerName: string;
    assistName: string;
    type: string;
    detail: string;
    comments: string;
  }>;
};

function TeamLogo({
  src,
  alt,
  size = 28,
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
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827] shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatBar({
  home,
  away,
}: {
  home: number;
  away: number;
}) {
  const total = home + away || 1;
  const homeWidth = `${(home / total) * 100}%`;
  const awayWidth = `${(away / total) * 100}%`;

  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
      <div className="bg-red-500" style={{ width: homeWidth }} />
      <div className="bg-blue-400" style={{ width: awayWidth }} />
    </div>
  );
}

function parseNumber(value: string) {
  if (!value || value === "-") return 0;
  const cleaned = String(value).replace("%", "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MatchDetailPage() {
  const params = useParams<{ fixtureId: string }>();
  const fixtureId = params?.fixtureId;

  const [data, setData] = useState<MatchDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fixtureId) return;

    setLoading(true);
    setError("");

    fetch(`/api/match/${fixtureId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to load match");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load match");
        setLoading(false);
      });
  }, [fixtureId]);

  const formattedDate = useMemo(() => {
    if (!data?.match?.date) return "-";
    try {
      return new Date(data.match.date).toLocaleString();
    } catch {
      return data.match.date;
    }
  }, [data?.match?.date]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b1220] p-6 text-white">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-[#111827] p-6">
          Loading match details...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#0b1220] p-6 text-white">
        <div className="mx-auto max-w-7xl space-y-4">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            ← Back to homepage
          </Link>

          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
            {error || "Could not load match details."}
          </div>
        </div>
      </main>
    );
  }

  const homeLineup =
    data.lineups.find((item) => item.teamName === data.match.homeTeam) ||
    data.lineups[0];
  const awayLineup =
    data.lineups.find((item) => item.teamName === data.match.awayTeam) ||
    data.lineups[1];

  return (
    <main className="min-h-screen bg-[#0b1220] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            ← Back to homepage
          </Link>

          <Link
            href="/predictions"
            className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Predictions
          </Link>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e293b] shadow-2xl">
          <div className="px-6 py-8 md:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
                Match detail
              </div>
              <div className="inline-flex items-center gap-2">
                <TeamLogo
                  src={data.match.leagueLogo}
                  alt={data.match.leagueName}
                  size={18}
                />
                <span>{data.match.leagueName}</span>
              </div>
              <span>•</span>
              <span>{data.match.leagueRound || "Round"}</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="flex items-center gap-4">
                <TeamLogo src={data.match.homeLogo} alt={data.match.homeTeam} size={44} />
                <div>
                  <div className="text-2xl font-black md:text-4xl">{data.match.homeTeam}</div>
                </div>
              </div>

              <div className="text-center">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                  {data.match.statusLong}
                  {data.match.elapsed ? ` • ${data.match.elapsed}'` : ""}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white px-6 py-4 text-3xl font-black text-slate-950 md:text-5xl">
                  {data.match.homeGoals ?? 0} - {data.match.awayGoals ?? 0}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black md:text-4xl">{data.match.awayTeam}</div>
                </div>
                <TeamLogo src={data.match.awayLogo} alt={data.match.awayTeam} size={44} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Kickoff</div>
                <div className="mt-2 text-sm font-semibold text-white">{formattedDate}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Venue</div>
                <div className="mt-2 text-sm font-semibold text-white">{data.match.venue}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">City</div>
                <div className="mt-2 text-sm font-semibold text-white">{data.match.city}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Referee</div>
                <div className="mt-2 text-sm font-semibold text-white">{data.match.referee}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Match statistics">
            {data.statistics.length === 0 ? (
              <p className="text-slate-300">No statistics available yet.</p>
            ) : (
              <div className="space-y-4">
                {data.statistics.map((stat) => {
                  const homeValue = parseNumber(stat.home);
                  const awayValue = parseNumber(stat.away);

                  return (
                    <div key={stat.type} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="w-14 text-left font-semibold text-white">
                          {stat.home}
                        </span>
                        <span className="flex-1 text-center text-slate-400">
                          {stat.type}
                        </span>
                        <span className="w-14 text-right font-semibold text-white">
                          {stat.away}
                        </span>
                      </div>
                      <StatBar home={homeValue} away={awayValue} />
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Goals & key events">
            {data.events.length === 0 ? (
              <p className="text-slate-300">No events available yet.</p>
            ) : (
              <div className="space-y-3">
                {data.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2">
                        <TeamLogo src={event.teamLogo} alt={event.teamName} size={18} />
                        <span className="text-sm font-semibold text-white">
                          {event.teamName}
                        </span>
                      </div>

                      <div className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                        {event.elapsed}'
                        {event.extra ? ` +${event.extra}` : ""}
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {event.playerName || "Unknown player"}
                    </div>

                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                      {event.type}
                      {event.detail ? ` • ${event.detail}` : ""}
                    </div>

                    {event.assistName ? (
                      <div className="mt-1 text-sm text-slate-300">
                        Assist: {event.assistName}
                      </div>
                    ) : null}

                    {event.comments ? (
                      <div className="mt-1 text-sm text-slate-300">
                        {event.comments}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title={`${data.match.homeTeam} line-up`}
            right={
              homeLineup ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {homeLineup.formation}
                </span>
              ) : null
            }
          >
            {!homeLineup ? (
              <p className="text-slate-300">No lineup available yet.</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Coach</div>
                  <div className="mt-1 font-semibold text-white">{homeLineup.coach}</div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Starting XI
                  </div>
                  <div className="space-y-2">
                    {homeLineup.startXI.map((player, index) => (
                      <div
                        key={`${player.name}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="text-xs font-semibold text-slate-400">
                          #{player.number} • {player.pos}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Substitutes
                  </div>
                  <div className="space-y-2">
                    {homeLineup.substitutes.map((player, index) => (
                      <div
                        key={`${player.name}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="text-xs font-semibold text-slate-400">
                          #{player.number} • {player.pos}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={`${data.match.awayTeam} line-up`}
            right={
              awayLineup ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {awayLineup.formation}
                </span>
              ) : null
            }
          >
            {!awayLineup ? (
              <p className="text-slate-300">No lineup available yet.</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Coach</div>
                  <div className="mt-1 font-semibold text-white">{awayLineup.coach}</div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Starting XI
                  </div>
                  <div className="space-y-2">
                    {awayLineup.startXI.map((player, index) => (
                      <div
                        key={`${player.name}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="text-xs font-semibold text-slate-400">
                          #{player.number} • {player.pos}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Substitutes
                  </div>
                  <div className="space-y-2">
                    {awayLineup.substitutes.map((player, index) => (
                      <div
                        key={`${player.name}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="text-xs font-semibold text-slate-400">
                          #{player.number} • {player.pos}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </main>
  );
}