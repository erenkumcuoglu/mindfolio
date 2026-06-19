"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDone(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-xl text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-2xl mb-4">
              ✓
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
              Password updated
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Your password has been changed successfully.
            </p>
            <button
              onClick={() => router.push("/studio")}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
            Set new password
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
