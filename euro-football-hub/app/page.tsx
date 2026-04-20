"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TOP_EURO_LEAGUES } from "@/lib/constants";
type MatchRow = {
fixtureId: number;
date: string;
status: string;
elapsed?: number | null;
leagueId?: number;
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
type DashboardPayload = {
standings: StandingRow[];
fixtures: MatchRow[];
results: MatchRow[];
live: MatchRow[];
};
type FootballNewsArticle = {
id: string;
title: string;
link: string;
date: string;
summary: string;
image?: string | null;
source?: string;
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
sizes={boxSize + "px"}
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
function LiveTicker({ matches }: { matches: MatchRow[] }) {
const previousScoresRef = useRef<Record<number, string>>({});
const [flashingIds, setFlashingIds] = useState<number[]>([]);
const safeMatches = matches.filter(
(match) =>
match.fixtureId &&
match.homeTeam &&
match.awayTeam &&
match.leagueName
);
useEffect(() => {
const changedIds: number[] = [];
safeMatches.forEach((match) => {  const currentScore = `${match.goals.home ?? 0}-${match.goals.away ?? 0}`;  const previousScore = previousScoresRef.current[match.fixtureId];  if (previousScore && previousScore !== currentScore) {    changedIds.push(match.fixtureId);  }  previousScoresRef.current[match.fixtureId] = currentScore;});if (changedIds.length > 0) {  setFlashingIds((prev) => Array.from(new Set([...prev, ...changedIds])));  const timeout = window.setTimeout(() => {    setFlashingIds((prev) =>      prev.filter((id) => !changedIds.includes(id))    );  }, 4000);  return () => window.clearTimeout(timeout);}
}, [safeMatches]);
const items =
safeMatches.length > 0
? [...safeMatches, ...safeMatches]
: [
{
fixtureId: 0,
date: "",
status: "",
elapsed: null,
leagueId: 0,
leagueName: "Live Centre",
homeTeam: "No live matches",
awayTeam: "Check back soon",
homeLogo: undefined,
awayLogo: undefined,
goals: { home: null, away: null },
},
];
return (
<div className="sticky top-0 z-50 overflow-hidden border-b border-red-400/20 bg-[#09111d]/95 backdrop-blur">
<div className="flex items-center gap-4 px-4 py-2">
<div className="shrink-0 rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
Live
</div>
    <div className="relative w-full overflow-hidden">      <div className="ticker-track flex min-w-max items-center gap-8">        {items.map((match, index) => {          const isFlashing =            match.fixtureId !== 0 && flashingIds.includes(match.fixtureId);          return (            <div              key={`${match.fixtureId}-${index}`}              className="flex shrink-0 items-center gap-3 rounded-lg px-2 py-1 text-sm text-white"            >              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">                {match.leagueName || "League"}              </span>              {match.fixtureId !== 0 ? (                <>                  <div className="flex items-center gap-2">                    <TeamLogo                      src={match.homeLogo}                      alt={match.homeTeam || "Home"}                      size={20}                    />                    <span className="font-medium text-white">                      {match.homeTeam || "Home"}                    </span>                  </div>                  <span                    className={`rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap transition ${                      isFlashing                        ? "bg-red-500 text-white ticker-score-flash"                        : "bg-white text-slate-950"                    }`}                  >                    {match.goals.home ?? 0} - {match.goals.away ?? 0}                  </span>                  <div className="flex items-center gap-2">                    <span className="font-medium text-white">                      {match.awayTeam || "Away"}                    </span>                    <TeamLogo                      src={match.awayLogo}                      alt={match.awayTeam || "Away"}                      size={20}                    />                  </div>                  <span className="text-xs font-semibold whitespace-nowrap text-red-400">                    {match.elapsed ? `${match.elapsed}'` : "LIVE"}                  </span>                </>              ) : (                <span className="text-slate-300">                  No live matches in top European leagues right now.                </span>              )}            </div>          );        })}      </div>    </div>  </div></div>
);
}
export default function HomePage() {
const [leagueId, setLeagueId] = useState<number>(TOP_EURO_LEAGUES[0].id);
const [data, setData] = useState<DashboardPayload | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
const [lastUpdated, setLastUpdated] = useState<string>("");
const [news, setNews] = useState<FootballNewsArticle[]>([]);
const [newsLoading, setNewsLoading] = useState<boolean>(true);
const [newsError, setNewsError] = useState<string | null>(null);
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
setError(null);try {  const res = await fetch(`/api/dashboard/${id}?season=${SEASON}`, {    cache: "no-store",  });  if (!res.ok) {    throw new Error(`Failed to load dashboard: ${res.status}`);  }  const json: DashboardPayload = await res.json();  const cleanedLive = (json.live || []).filter(    (match) =>      match.fixtureId &&      match.homeTeam &&      match.awayTeam &&      match.leagueName  );  setData({    ...json,    live: cleanedLive,  });  setLastUpdated(new Date().toLocaleTimeString());} catch (err) {  console.error(err);  setError("Could not load football data.");} finally {  if (!background) {    setLoading(false);  }}
}
async function loadNews() {
try {
setNewsLoading(true);
setNewsError(null);
  const res = await fetch("/api/news", {    cache: "no-store",  });  const json = await res.json();  if (!res.ok) {    throw new Error(json.error || "Failed to load football news");  }  setNews(json.articles || []);} catch (err: any) {  console.error(err);  setNewsError(err?.message || "Could not load football news.");} finally {  setNewsLoading(false);}
}
useEffect(() => {
void loadData(leagueId, false);
const interval = setInterval(() => {  void loadData(leagueId, true);}, 120000);return () => clearInterval(interval);
}, [leagueId]);
useEffect(() => {
void loadNews();
const interval = setInterval(() => {  void loadNews();}, 300000);return () => clearInterval(interval);
}, []);
function formatDate(value: string) {
try {
return new Date(value).toLocaleString();
} catch {
return value;
}
}
const visibleLiveMatches = (data?.live || []).filter(
(match) =>
match.fixtureId &&
match.homeTeam &&
match.awayTeam &&
match.leagueName
);
const groupedLiveMatches = useMemo(() => {
const groups = new Map<string, MatchRow[]>();
for (const match of visibleLiveMatches) {  const key = match.leagueName || "Other";  if (!groups.has(key)) {    groups.set(key, []);  }  groups.get(key)!.push(match);}return Array.from(groups.entries()).map(([leagueName, matches]) => ({  leagueName,  matches: matches.sort((a, b) => (a.elapsed ?? 0) - (b.elapsed ?? 0)),}));
}, [visibleLiveMatches]);
return (
<main className="min-h-screen bg-[#0b1220] text-white">
<LiveTicker matches={visibleLiveMatches} />
  <div className="border-b border-white/10 bg-[#08101c]">    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">        Live Football Centre      </div>    </div>  </div>  <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e293b] shadow-2xl">      <div className="grid gap-6 px-6 py-8 md:px-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">        <div>          <div className="mb-3 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">            Matchday coverage          </div>          <h1 className="text-4xl font-black tracking-tight md:text-6xl">            Pro Football Intel          </h1>          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">            Data-driven football insights, live scores, and AI-powered match            predictions across Europe’s top leagues.          </p>          <div className="mt-6 flex flex-wrap gap-3">            <Link              href="/predictions"              className="rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-400"            >              View AI Predictions            </Link>            <Link              href="/predictions"              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"            >              Premium Insights →            </Link>          </div>        </div>        <div className="grid grid-cols-2 gap-3">          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">            <div className="text-xs uppercase tracking-wide text-slate-400">              League            </div>            <div className="mt-2 text-lg font-bold">              {selectedLeague.name}            </div>          </div>          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">            <div className="text-xs uppercase tracking-wide text-slate-400">              Season            </div>            <div className="mt-2 text-lg font-bold">{SEASON}</div>          </div>          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">            <div className="text-xs uppercase tracking-wide text-slate-400">              Live Games            </div>            <div className="mt-2 text-lg font-bold">              {visibleLiveMatches.length}            </div>          </div>          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">            <div className="text-xs uppercase tracking-wide text-slate-400">              Updated            </div>            <div className="mt-2 text-lg font-bold">              {lastUpdated || "--:--:--"}            </div>          </div>        </div>      </div>    </section>    <section className="mt-6 rounded-2xl border border-red-400/20 bg-gradient-to-r from-red-500/10 to-red-400/5 p-5">      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">        <div>          <div className="text-xs uppercase tracking-wide text-red-300">            New          </div>          <div className="text-lg font-bold">            AI Match Predictions Now Live          </div>          <div className="text-sm text-slate-300">            Unlock win probabilities, score predictions and confidence            ratings.          </div>        </div>        <Link          href="/predictions"          className="inline-flex rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"        >          View →        </Link>      </div>    </section>    <section className="mt-6 rounded-3xl border border-white/10 bg-[#101826] p-4 shadow-xl">      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">        Select competition      </div>      <div className="flex flex-wrap gap-3">        {TOP_EURO_LEAGUES.map((league) => {          const active = league.id === leagueId;          return (            <button              key={league.id}              onClick={() => setLeagueId(league.id)}              className={[                "rounded-xl px-4 py-2 text-sm font-semibold transition",                active                  ? "bg-[#d90429] text-white shadow-lg"                  : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",              ].join(" ")}            >              {league.name}            </button>          );        })}      </div>    </section>    {loading ? (      <section className="mt-6 rounded-3xl border border-white/10 bg-[#111827] p-6">        <div className="text-slate-300">          Loading {selectedLeague.name} data...        </div>      </section>    ) : null}    {error ? (      <section className="mt-6 rounded-3xl border border-red-400/20 bg-red-500/10 p-6">        <div className="font-semibold text-red-200">{error}</div>      </section>    ) : null}    {!loading && data ? (      <>        <section className="mt-6">          <div className="mb-3 flex items-center justify-between">            <h2 className="text-xl font-bold">Live Matches</h2>            <span className="text-sm font-semibold text-red-400">              {visibleLiveMatches.length} LIVE            </span>          </div>          {groupedLiveMatches.length === 0 ? (            <div className="rounded-3xl border border-white/10 bg-[#111827] p-5 text-slate-300">              No live matches in top European leagues right now.            </div>          ) : (            <div className="space-y-6">              {groupedLiveMatches.map((group) => (                <div                  key={group.leagueName}                  className="rounded-3xl border border-white/10 bg-[#111827] p-4 shadow-xl"                >                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">                    <h3 className="text-lg font-bold text-white">                      {group.leagueName}                    </h3>                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300">                      {group.matches.length} live                    </span>                  </div>                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">                    {group.matches.map((match) => (                      <Link                        key={match.fixtureId}                        href={`/match/${match.fixtureId}`}                        className="block rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4 shadow-lg transition hover:border-red-400/40"                      >                        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">                          <span className="truncate text-slate-400">                            {match.leagueName || "League"}                          </span>                          <span className="shrink-0 text-red-400">                            LIVE {match.elapsed ?? ""}                          </span>                        </div>                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">                          <div className="flex min-w-0 items-center gap-2">                            <TeamLogo                              src={match.homeLogo}                              alt={match.homeTeam || "Home"}                            />                            <span className="truncate font-semibold text-white">                              {match.homeTeam || "Home"}                            </span>                          </div>                          <div className="min-w-[64px] rounded-xl bg-white px-3 py-2 text-center text-sm font-black leading-none whitespace-nowrap text-slate-950">                            {match.goals.home ?? 0} - {match.goals.away ?? 0}                          </div>                          <div className="flex min-w-0 items-center justify-end gap-2">                            <span className="truncate text-right font-semibold text-white">                              {match.awayTeam || "Away"}                            </span>                            <TeamLogo                              src={match.awayLogo}                              alt={match.awayTeam || "Away"}                            />                          </div>                        </div>                      </Link>                    ))}                  </div>                </div>              ))}            </div>          )}        </section>        <div className="mt-6 grid gap-6 lg:grid-cols-2">          <SectionCard title="Standings">            {data.standings.length === 0 ? (              <p className="text-slate-300">                No standings returned for this league.              </p>            ) : (              <div className="space-y-3">                {data.standings.map((row) => (                  <div                    key={row.teamId}                    className="flex min-h-[60px] items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"                  >                    <div className="flex min-w-0 items-center gap-3">                      <span className="w-6 shrink-0 text-sm font-semibold text-slate-400">                        {row.rank}                      </span>                      <TeamLogo src={row.logo} alt={row.team} />                      <span className="truncate font-semibold">                        {row.team}                      </span>                    </div>                    <div className="shrink-0 text-sm text-slate-300">                      {row.points} pts • GD {row.goalDiff}                    </div>                  </div>                ))}              </div>            )}          </SectionCard>          <SectionCard title="Upcoming Fixtures">            {data.fixtures.length === 0 ? (              <p className="text-slate-300">                No fixtures returned for this league.              </p>            ) : (              <div className="space-y-3">                {data.fixtures.map((match) => (                  <Link                    key={match.fixtureId}                    href={`/match/${match.fixtureId}`}                    className="block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-red-400/30"                  >                    <div className="text-sm text-slate-400">                      {match.leagueName}                    </div>                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">                      <div className="flex min-w-0 items-center gap-2">                        <TeamLogo                          src={match.homeLogo}                          alt={match.homeTeam || "Home"}                        />                        <span className="truncate font-medium">                          {match.homeTeam || "Home"}                        </span>                      </div>                      <span className="text-sm font-semibold uppercase text-slate-400">                        vs                      </span>                      <div className="flex min-w-0 items-center justify-end gap-2">                        <span className="truncate text-right font-medium">                          {match.awayTeam || "Away"}                        </span>                        <TeamLogo                          src={match.awayLogo}                          alt={match.awayTeam || "Away"}                        />                      </div>                    </div>                    <div className="mt-2 text-sm text-slate-300">                      {formatDate(match.date)}                    </div>                  </Link>                ))}              </div>            )}          </SectionCard>        </div>        <div className="mt-6 grid gap-6 lg:grid-cols-2">          <SectionCard title="Latest Results">            {data.results.length === 0 ? (              <p className="text-slate-300">                No results returned for this league.              </p>            ) : (              <div className="space-y-3">                {data.results.map((match) => (                  <Link                    key={match.fixtureId}                    href={`/match/${match.fixtureId}`}                    className="block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-red-400/30"                  >                    <div className="text-sm text-slate-400">                      {match.leagueName}                    </div>                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">                      <div className="flex min-w-0 items-center gap-2">                        <TeamLogo                          src={match.homeLogo}                          alt={match.homeTeam || "Home"}                        />                        <span className="truncate font-medium">                          {match.homeTeam || "Home"}                        </span>                      </div>                      <span className="min-w-[64px] rounded-xl bg-slate-950 px-3 py-2 text-center text-sm font-black leading-none whitespace-nowrap">                        {match.goals.home ?? 0} - {match.goals.away ?? 0}                      </span>                      <div className="flex min-w-0 items-center justify-end gap-2">                        <span className="truncate text-right font-medium">                          {match.awayTeam || "Away"}                        </span>                        <TeamLogo                          src={match.awayLogo}                          alt={match.awayTeam || "Away"}                        />                      </div>                    </div>                  </Link>                ))}              </div>            )}          </SectionCard>          <SectionCard            title="Football News"            right={              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">                RSS Feed              </span>            }          >            {newsLoading ? (              <p className="text-slate-300">Loading football news...</p>            ) : newsError ? (              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-100">                {newsError}              </div>            ) : news.length === 0 ? (              <p className="text-slate-300">No football news available.</p>            ) : (              <div className="space-y-4">                {news.slice(0, 6).map((article, i) => {                  const isBreaking = article.title?.toLowerCase().includes("breaking");                  const isInjury = article.title?.toLowerCase().includes("injury");                  const isTransfer = article.title?.toLowerCase().includes("transfer");                  const isFeatured = i === 0;                  return (                    <a                      key={i}                      href={article.link}                      target="_blank"                      rel="noreferrer"                      className={`group block rounded-2xl border border-white/10 transition hover:bg-white/10 ${                        isFeatured ? "bg-white/10 p-6" : "bg-white/5 p-4"                      }`}                    >                      <div className={`flex flex-col ${isFeatured ? "gap-3" : "gap-2"}`}>                        <div className="flex flex-wrap gap-2">                          {isBreaking && (                            <span className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">                              BREAKING                            </span>                          )}                          {isInjury && (                            <span className="rounded bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-black">                              INJURY                            </span>                          )}                          {isTransfer && (                            <span className="rounded bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">                              TRANSFER                            </span>                          )}                          {article.source && (                            <span className="text-[10px] uppercase tracking-wide text-slate-400">                              {article.source}                            </span>                          )}                        </div>                        <div                          className={                            isFeatured                              ? "text-lg font-semibold text-white"                              : "text-sm font-semibold text-white"                          }                        >                          {article.title}                        </div>                        <div                          className={                            isFeatured                              ? "text-sm text-slate-300 line-clamp-3"                              : "text-xs text-slate-300 line-clamp-2"                          }                        >                          {article.summary}                        </div>                        <div className="text-[10px] text-slate-500">                          {formatDate(article.date)}                        </div>                      </div>                    </a>                  );                })}              </div>            )}          </SectionCard>        </div>      </>    ) : null}  </div></main>
);
}