import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="rounded-3xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-12 shadow-xl text-center max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mindfolio
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-sm">
          Record, transcribe, and generate content.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
