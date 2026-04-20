"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MatchDetailPayload = {
match: {
fixtureId: number;
date: string;
referee: string;
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
sizes={boxSize + "px"}
className="object-contain p-1"
/>
</div>
);
}

function getFixtureIdFromPath() {
if (typeof window === "undefined") return "";

const parts = window.location.pathname.split("/").filter(Boolean);
return parts[parts.length - 1] || "";
}

export default function MatchDetailPage() {
const [fixtureId, setFixtureId] = useState("");
const [data, setData] = useState<MatchDetailPayload | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
const id = getFixtureIdFromPath();
setFixtureId(id);

if (!id) {
  setError("Missing fixture id");
  setLoading(false);
  return;
}

let cancelled = false;

async function loadMatch() {
  try {
    setLoading(true);
    setError("");

    const res = await fetch("/api/match/" + id, {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || "Failed to load match");
    }

    if (!cancelled) {
      setData(json);
      setLoading(false);
    }
  } catch (err: any) {
    if (!cancelled) {
      setError(err?.message || "Failed to load match");
      setLoading(false);
    }
  }
}

loadMatch();

return () => {
  cancelled = true;
};

}, []);

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
<div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#111827] p-6">
Loading match details...
</div>
</main>
);
}

if (error || !data) {
return (
<main className="min-h-screen bg-[#0b1220] p-6 text-white">
<div className="mx-auto max-w-5xl space-y-4">
<Link href="/" className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200" >
← Back to homepage
</Link>

      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        {error || "Could not load match details."}
      </div>
    </div>
  </main>
);

}

return (
<main className="min-h-screen bg-[#0b1220] p-6 text-white">
<div className="mx-auto max-w-5xl space-y-6">
<div className="flex flex-wrap items-center gap-3">
<Link href="/" className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200" >
← Back to homepage
</Link>

      <Link
        href="/predictions"
        className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
      >
        Predictions
      </Link>
    </div>

    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e293b] shadow-2xl">
      <div className="px-6 py-8 md:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <div className="inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
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
            <TeamLogo
              src={data.match.homeLogo}
              alt={data.match.homeTeam}
              size={44}
            />
            <div className="text-2xl font-black md:text-4xl">
              {data.match.homeTeam}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              {data.match.statusLong}
              {data.match.elapsed ? " • " + data.match.elapsed + "'" : ""}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white px-6 py-4 text-3xl font-black text-slate-950 md:text-5xl">
              {data.match.homeGoals ?? 0} - {data.match.awayGoals ?? 0}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <div className="text-right text-2xl font-black md:text-4xl">
              {data.match.awayTeam}
            </div>
            <TeamLogo
              src={data.match.awayLogo}
              alt={data.match.awayTeam}
              size={44}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Kickoff
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {formattedDate}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Venue
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {data.match.venue}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              City
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {data.match.city}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Referee
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {data.match.referee}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Fixture ID
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {fixtureId}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</main>

);
}