"use client";

import { useState, useRef, useEffect } from "react";

const DEFAULT_TEXT =
  "Your audio is used only for transcription and deleted immediately after processing (max 1 hour). It is never shared, stored long-term, or used for any other purpose.";

interface PrivacyDisclaimerProps {
  label?: string;
  text?: string;
}

/**
 * Compact privacy hint: a small icon + label.
 * - Desktop: reveals the explanation on hover.
 * - Mobile / touch: toggles the explanation on tap.
 */
export function PrivacyDisclaimer({
  label = "What happens to my recordings?",
  text = DEFAULT_TEXT,
}: PrivacyDisclaimerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-600 text-[10px] leading-none">
          🔒
        </span>
        {label}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-3 shadow-xl animate-fade-in">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}
