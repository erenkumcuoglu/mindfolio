"use client";

import { useState, useEffect, useCallback } from "react";

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const LABELS = ["0 — Not at all likely", "", "", "", "", "5 — Neutral", "", "", "", "", "10 — Extremely likely"];

const SNOOZE_KEY = "nps_snooze_until";
const SNOOZE_MS = 48 * 60 * 60 * 1000; // 48 hours

export function NpsPrompt() {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Respect a local "Not now" snooze before asking the server.
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (until && Date.now() < until) return;
    } catch {
      // ignore storage errors
    }
    fetch("/api/nps")
      .then((r) => r.json())
      .then((data) => {
        if (data.show) setShow(true);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selected === null) return;
    setLoading(true);
    try {
      await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: selected, comment: comment.trim() || undefined }),
      });
      setSubmitted(true);
      setTimeout(() => setShow(false), 2000);
    } catch {
      // silently fail — don't block the user
    } finally {
      setLoading(false);
    }
  }, [selected, comment]);

  const handleDismiss = useCallback(() => {
    // Snooze for 48h so it doesn't reappear on every page load.
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // ignore storage errors
    }
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl animate-slide-up">
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Thank you for your feedback!
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              How likely are you to recommend Mindfolio to a friend?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              Your honest feedback helps us improve.
            </p>

            <div className="flex justify-between gap-1 mb-1">
              {SCORES.map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setSelected(score)}
                  className={`h-9 w-9 rounded-lg text-xs font-semibold transition-all ${
                    selected === score
                      ? "bg-emerald-600 text-white scale-110"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 mb-5">
              <span>Not likely</span>
              <span>Extremely likely</span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything you'd like to share? (optional)"
              rows={2}
              maxLength={5000}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-4 resize-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selected === null || loading}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
