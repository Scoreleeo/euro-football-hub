"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PredictionsSuccessPage() {
const router = useRouter();

return (
<main className="min-h-screen bg-[#0b1220] p-6 text-white">
<div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111827] p-8">
<div className="text-xs font-semibold uppercase tracking-wider text-green-300">
Payment received
</div>
<h1 className="mt-2 text-4xl font-black">Thanks for your purchase</h1>
<p className="mt-3 text-slate-300">
Your payment completed successfully. Your unlock should now be available.
</p>

    <div className="mt-6 flex gap-3">
      <button
        onClick={() => router.push("/predictions")}
        className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white"
      >
        Back to predictions
      </button>

      <Link
        href="/"
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-200"
      >
        Home
      </Link>
    </div>
  </div>
</main>

);
}