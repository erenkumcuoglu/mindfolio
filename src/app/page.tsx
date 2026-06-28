"use client";

import Link from "next/link";

const BARS = [0.5, 0.85, 1, 0.7, 0.5, 0.9, 0.6];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <style>{`
        @keyframes mf-wave { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
      `}</style>

      <div className="flex flex-col items-center text-center max-w-md animate-fade-in">
        {/* Brand mark */}
        <svg width="64" height="64" viewBox="0 0 26 26" fill="none" aria-hidden>
          <rect width="26" height="26" rx="6.5" className="fill-emerald-500/10 stroke-emerald-500/30" strokeWidth="1" />
          <rect x="3" y="10.5" width="2.4" height="5" rx="1.2" className="fill-emerald-500" opacity={0.55} />
          <rect x="7" y="6.5" width="2.4" height="13" rx="1.2" className="fill-emerald-500" opacity={0.85} />
          <rect x="11" y="5" width="2.4" height="16" rx="1.2" className="fill-emerald-500" />
          <rect x="15" y="8" width="2.4" height="10" rx="1.2" className="fill-emerald-500" opacity={0.7} />
          <rect x="19" y="10.5" width="2.4" height="5" rx="1.2" className="fill-emerald-500" opacity={0.5} />
        </svg>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">mindfolio</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Sesini içeriğe dönüştür</p>

        {/* Continuous wave */}
        <div className="mt-7 flex h-8 items-center gap-1.5" aria-hidden>
          {BARS.map((_, i) => (
            <span
              key={i}
              className="inline-block w-1.5 rounded-full bg-emerald-500/80"
              style={{ height: "100%", transformOrigin: "center", animation: `mf-wave ${1.1 + (i % 3) * 0.25}s ease-in-out ${i * 0.12}s infinite` }}
            />
          ))}
        </div>

        <div className="mt-10 flex w-full flex-col gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Başla
          </Link>
        </div>
      </div>
    </div>
  );
}
