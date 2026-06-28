"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Show the "Light"/"Dark" text label next to the icon. */
  withLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ withLabel = false, className = "" }: Props) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mf-theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — toggle still applies for the session */
    }
    setDark(next);
  };

  // Render a neutral placeholder until mounted to avoid hydration mismatch.
  const showDark = mounted && dark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={showDark ? "Switch to light theme" : "Switch to dark theme"}
      title={showDark ? "Light tema" : "Dark tema"}
      className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-200/70 dark:border-zinc-700/50 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-xl px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ${className}`}
    >
      {showDark ? (
        // Sun (tap to go light)
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7 .8v1.6M7 11.6v1.6M.8 7h1.6M11.6 7h1.6M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M11.4 2.6l-1.1 1.1M3.7 10.3l-1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ) : (
        // Moon (tap to go dark)
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M11.5 8.5A5 5 0 015 2a5.2 5.2 0 00-.5.03A5 5 0 109.97 9 5 5 0 0111.5 8.5z" fill="currentColor" />
        </svg>
      )}
      {withLabel && <span>{showDark ? "Light" : "Dark"}</span>}
    </button>
  );
}
