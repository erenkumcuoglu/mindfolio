"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type View = "login" | "verify" | "sent" | "reset-sent";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("login");
  const [pendingEmail, setPendingEmail] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "email_not_confirmed") {
          setPendingEmail(data.email || email);
          setView("verify");
          return;
        }
        if (data.error === "beta_only") {
          setError(
            "Mindfolio şu an kapalı betada. Davet almak için kaydolun: https://mindfolio.app/waitlist"
          );
          return;
        }
        setError(data.error);
        return;
      }

      router.push("/studio");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      setView("sent");
    } catch {
      setError("Failed to resend. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email address first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setView("reset-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (view === "verify" || view === "sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-xl text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-2xl mb-4">
              ✉
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
              {view === "sent" ? "Email Sent" : "Verify your email"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {view === "sent"
                ? "A new confirmation email has been sent."
                : `We sent a confirmation link to ${pendingEmail}. Click the link to activate your account, then sign in.`}
            </p>
            {view === "verify" && (
              <button
                onClick={handleResend}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors mb-3"
              >
                {loading ? "Sending..." : "Resend confirmation email"}
              </button>
            )}
            <button
              onClick={() => setView("login")}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "reset-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-xl text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-2xl mb-4">
              ✓
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
              Check your email
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              If an account exists for {email}, we sent a password reset link.
            </p>
            <button
              onClick={() => { setView("login"); setError(""); }}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Back to sign in
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
            Mindfolio
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500/50"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                or continue with
              </span>
            </div>
          </div>

            <button
            type="button"
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                },
              })
            }
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google ile devam et
          </button>

          <button
            type="button"
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: "apple",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                },
              })
            }
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple ile devam et
          </button>
        </div>
      </div>
    </div>
  );
}
