import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFixtureDetail } from "@/lib/api-football/services";

type Props = {
  params: Promise<{
    fixtureId: string;
  }>;
};

function TeamBadge({
  name,
  logo,
  align = "left",
}: {
  name: string;
  logo?: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-3 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {align === "right" ? (
        <>
          <span className="text-lg font-bold md:text-2xl">{name}</span>
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5">
            {logo ? (
              <Image src={logo} alt={name} fill sizes="40px" className="object-contain p-1" />
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5">
            {logo ? (
              <Image src={logo} alt={name} fill sizes="40px" className="object-contain p-1" />
            ) : null}
          </div>
          <span className="text-lg font-bold md:text-2xl">{name}</span>
        </>
      )}
    </div>
  );
}

export default async function MatchPage({ params }: Props) {
  const { fixtureId } = await params;

  if (!fixtureId) {
    notFound();
  }

  const detail = await getFixtureDetail(Number(fixtureId));

  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      <div className="border-b border-white/10 bg-[#08101c]">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            ← Back to Home
          </Link>

          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
            Match Preview
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            {detail.homeTeam} vs {detail.awayTeam}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Fixture details, lineups, statistics and match context.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e293b] shadow-2xl">
          <div className="px-6 py-8 md:px-8">
            <div className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
              {detail.leagueName}
            </div>

            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
              <TeamBadge name={detail.homeTeam} logo={detail.homeLogo} />
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Kickoff
                </div>
                <div className="mt-2 text-lg font-black">
                  {new Date(detail.date).toLocaleString()}
                </div>
              </div>
              <TeamBadge
                name={detail.awayTeam}
                logo={detail.awayLogo}
                align="right"
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Venue
                </div>
                <div className="mt-2 text-lg font-bold">
                  {detail.venue || "TBC"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Referee
                </div>
                <div className="mt-2 text-lg font-bold">
                  {detail.referee || "TBC"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </div>
                <div className="mt-2 text-lg font-bold">{detail.status}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-[#111827] shadow-xl">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-xl font-bold text-white">Statistics</h2>
            </div>

            <div className="p-5">
              {detail.statistics.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-400">
                  Statistics not available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {detail.statistics.map((team) => (
                    <div
                      key={team.teamName}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2 font-bold">
                        {team.teamLogo ? (
                          <div className="relative h-7 w-7 overflow-hidden rounded-full bg-white/5">
                            <Image
                              src={team.teamLogo}
                              alt={team.teamName}
                              fill
                              sizes="28px"
                              className="object-contain p-1"
                            />
                          </div>
                        ) : null}
                        {team.teamName}
                      </div>

                      <div className="space-y-2 text-sm">
                        {Object.entries(team.stats).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2"
                          >
                            <span className="text-slate-300">{key}</span>
                            <span className="font-semibold text-white">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111827] shadow-xl">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="text-xl font-bold text-white">Lineups</h2>
            </div>

            <div className="p-5">
              {detail.lineups.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-400">
                  Lineups not available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {detail.lineups.map((lineup) => (
                    <div
                      key={lineup.teamName}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2 font-bold">
                        {lineup.teamLogo ? (
                          <div className="relative h-7 w-7 overflow-hidden rounded-full bg-white/5">
                            <Image
                              src={lineup.teamLogo}
                              alt={lineup.teamName}
                              fill
                              sizes="28px"
                              className="object-contain p-1"
                            />
                          </div>
                        ) : null}
                        {lineup.teamName}
                      </div>

                      <div className="mb-3 text-sm text-slate-400">
                        Formation: {lineup.formation || "—"} • Coach:{" "}
                        {lineup.coach || "—"}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Starting XI
                          </div>
                          <div className="space-y-2">
                            {lineup.startXI.map((player, index) => (
                              <div
                                key={`${lineup.teamName}-start-${index}`}
                                className="rounded-lg bg-black/20 px-3 py-2 text-sm"
                              >
                                {player}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Substitutes
                          </div>
                          <div className="space-y-2">
                            {lineup.substitutes.map((player, index) => (
                              <div
                                key={`${lineup.teamName}-sub-${index}`}
                                className="rounded-lg bg-black/20 px-3 py-2 text-sm"
                              >
                                {player}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#111827] shadow-xl">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-xl font-bold text-white">Match Events</h2>
          </div>

          <div className="p-5">
            {detail.events.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-400">
                No match events available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {detail.events.map((event, index) => (
                  <div
                    key={`${event.time}-${event.type}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-bold text-white">
                        {event.time} • {event.teamName}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-red-400">
                        {event.type}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-slate-300">
                      {event.detail}
                    </div>

                    {event.playerName ? (
                      <div className="mt-2 text-xs text-slate-500">
                        Player: {event.playerName}
                        {event.assistName ? ` • Assist: ${event.assistName}` : ""}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}