"use client";

import { useCallback } from "react";

export interface ToastEntry {
  key: string;
  message: string;
  type: "error" | "success";
  retry?: () => void;
}

interface ToastStackProps {
  toasts: ToastEntry[];
  onDismiss: (key: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.key} entry={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  entry,
  onDismiss,
}: {
  entry: ToastEntry;
  onDismiss: (key: string) => void;
}) {
  const handleRetry = useCallback(() => {
    onDismiss(entry.key);
    entry.retry?.();
  }, [entry, onDismiss]);

  const isError = entry.type === "error";

  return (
    <div
      className={`rounded-xl border backdrop-blur-xl p-4 shadow-xl animate-slide-up ${
        isError
          ? "border-red-200/60 dark:border-red-800/40 bg-red-50/95 dark:bg-red-950/95"
          : "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/95 dark:bg-emerald-950/95"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0 mt-0.5">
          {isError ? "⚠" : "✓"}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              isError
                ? "text-red-800 dark:text-red-200"
                : "text-emerald-800 dark:text-emerald-200"
            }`}
          >
            {entry.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(entry.key)}
          className={`transition-colors shrink-0 ${
            isError
              ? "text-red-400 hover:text-red-600"
              : "text-emerald-400 hover:text-emerald-600"
          }`}
        >
          ×
        </button>
      </div>
      {isError && entry.retry && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleRetry}
            className="text-xs font-semibold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => onDismiss(entry.key)}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
