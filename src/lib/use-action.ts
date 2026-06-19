"use client";

import { useState, useCallback, useRef } from "react";

export interface ActionState {
  loading: boolean;
  error: string | null;
}

type ActionKey = string;

interface ToastEntry {
  key: string;
  message: string;
  type: "error" | "success";
  retry?: () => void;
}

export function useAction() {
  const [states, setStates] = useState<Record<ActionKey, ActionState>>({});
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [flash, setFlash] = useState<Record<string, string | null>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const showFlash = useCallback((key: string, text: string, duration = 2000) => {
    setFlash((prev) => ({ ...prev, [key]: text }));
    setTimeout(() => setFlash((prev) => ({ ...prev, [key]: null })), duration);
  }, []);

  const clearToast = useCallback((key: string) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
  }, []);

  const showSuccessToast = useCallback(
    (message: string) => {
      const toastKey = `success-${Date.now()}`;
      const entry: ToastEntry = { key: toastKey, message, type: "success" };
      setToasts((prev) => [...prev, entry]);
      timers.current[toastKey] = setTimeout(() => clearToast(toastKey), 3000);
    },
    [clearToast]
  );

  const GENERIC_ERROR =
    "Oops, bir şeyler ters gitti! Ekibimize iletildi ve şu anda ilgileniliyor.";

  const run = useCallback(
    async (key: ActionKey, fn: () => Promise<void>) => {
      setStates((prev) => ({ ...prev, [key]: { loading: true, error: null } }));

      try {
        await fn();
        setStates((prev) => ({ ...prev, [key]: { loading: false, error: null } }));
      } catch (err) {
        console.error(`[${key}]`, err);
        setStates((prev) => ({ ...prev, [key]: { loading: false, error: GENERIC_ERROR } }));

        const toastKey = `${key}-${Date.now()}`;
        const entry: ToastEntry = {
          key: toastKey,
          message: GENERIC_ERROR,
          type: "error",
          retry: () => run(key, fn),
        };
        setToasts((prev) => [...prev, entry]);

        timers.current[toastKey] = setTimeout(() => {
          clearToast(toastKey);
        }, 10000);
      }
    },
    [clearToast]
  );

  const isLoading = useCallback(
    (key: ActionKey) => states[key]?.loading ?? false,
    [states]
  );

  const actionError = useCallback(
    (key: ActionKey) => states[key]?.error ?? null,
    [states]
  );

  const loadingLabel = (key: ActionKey): string => {
    const labels: Record<string, string> = {
      transcribe: "Ses çözümleniyor…",
      generateDraft: "Yapay zekâ içeriğini hazırlıyor, birkaç saniye…",
      generateLinkedin: "LinkedIn gönderisi hazırlanıyor…",
      generateSubstack: "Substack taslağı hazırlanıyor…",
      generateXPost: "X gönderisi hazırlanıyor…",
      saveDraft: "Taslak kaydediliyor…",
      saveIdea: "Fikir olarak kaydediliyor…",
      saveContent: "Content'e kaydediliyor…",
      generateTitles: "Başlık önerileri hazırlanıyor…",
      goContent: "Content açılıyor…",
      "regenerate-linkedin": "LinkedIn gönderisi yeniden hazırlanıyor…",
      "regenerate-substack": "Substack taslağı yeniden hazırlanıyor…",
      "regenerate-x": "X gönderisi yeniden hazırlanıyor…",
    };
    return labels[key] ?? "Working…";
  };

  return { run, isLoading, loadingLabel, toasts, clearToast, actionError, showFlash, flash, showSuccessToast };
}
