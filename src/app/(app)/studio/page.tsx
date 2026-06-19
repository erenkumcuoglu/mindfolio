"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { ToastStack } from "@/components/ui/Toast";
import { Waveform } from "@/components/ui/Waveform";
import { PrivacyDisclaimer } from "@/components/ui/PrivacyDisclaimer";
import { useAction } from "@/lib/use-action";
import { loadSession, saveSession, clearAll } from "@/lib/db/studio-storage";

interface PersonaInfo {
  name?: string;
  profile?: {
    purpose?: string;
    topics?: string[];
    tone?: { style?: string; voice?: string };
  };
}

interface Idea {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  preview: { site_name?: string } | null;
}

const LANGUAGES = [
  { value: "Turkish", label: "Türkçe" },
  { value: "English", label: "English" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
  { value: "Italian", label: "Italiano" },
  { value: "Portuguese", label: "Português" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
  { value: "Chinese", label: "中文" },
  { value: "Arabic", label: "العربية" },
];

type ExcerptFormat = "linkedin" | "substack" | "x";

const FORMAT_LABELS: Record<ExcerptFormat, string> = {
  linkedin: "LinkedIn Post",
  substack: "Substack Draft",
  x: "X Post",
};

function detectSystemLanguage(): string {
  if (typeof navigator === "undefined") return "English";
  const code = (navigator.language || "en").slice(0, 2).toLowerCase();
  const map: Record<string, string> = {
    tr: "Turkish", en: "English", es: "Spanish", fr: "French", de: "German",
    it: "Italian", pt: "Portuguese", ja: "Japanese", ko: "Korean", zh: "Chinese", ar: "Arabic",
  };
  return map[code] ?? "English";
}

export default function DashboardPage() {
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [contentId, setContentId] = useState<string | null>(null);
  const [excerpts, setExcerpts] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState(detectSystemLanguage);
  const [persona, setPersona] = useState<PersonaInfo | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [linkedIdea, setLinkedIdea] = useState<Idea | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [ideaSearch, setIdeaSearch] = useState("");
  const [ideaResults, setIdeaResults] = useState<Idea[]>([]);
  const [searchingIdeas, setSearchingIdeas] = useState(false);

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { run, isLoading, loadingLabel, toasts, clearToast, showFlash, flash, showSuccessToast } = useAction();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersona(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSession().then((s) => {
      if (s.transcript) setTranscript(s.transcript);
      if (s.draft) setDraft(s.draft);
      if (s.notes) setNotes(s.notes);
      if (s.language) setLanguage(s.language);
      if (s.excerpts && Object.keys(s.excerpts).length) setExcerpts(s.excerpts);
      if (s.draftId) setDraftId(s.draftId);
      if (s.titleOptions?.length) setTitleOptions(s.titleOptions);
      if (s.selectedTitle) setSelectedTitle(s.selectedTitle);
      if (s.contentId) setContentId(s.contentId);
      if (s.linkedIdea) setLinkedIdea(s.linkedIdea as Idea);
      if (s.recordedBlob) {
        setRecordedBlob(s.recordedBlob);
        setElapsed(s.elapsed);
      }
    });
  }, []);

  useEffect(() => {
    if (notes || language) saveSession({ notes, language });
  }, [notes, language]);

  useEffect(() => {
    if (Object.keys(excerpts).length) saveSession({ excerpts });
  }, [excerpts]);

  const persistRef = useRef<ReturnType<typeof setInterval>>(null);
  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      persistRef.current = setInterval(() => {
        const chunks = audioChunks.current;
        if (chunks.length > 0) saveSession({ audioChunks: chunks, elapsed });
      }, 5000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (persistRef.current) clearInterval(persistRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (persistRef.current) clearInterval(persistRef.current);
    };
  }, [recording, paused, elapsed]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleTranscribe = useCallback(
    async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranscript(data.text);
      saveSession({ transcript: data.text, recordedBlob: null, audioChunks: [], elapsed: 0 });
      setTimeout(() => textRef.current?.focus(), 100);
    },
    []
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = recorder;
      audioChunks.current = [];
      setElapsed(0);
      saveSession({ audioChunks: [], recordedBlob: null, elapsed: 0 });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        saveSession({ recordedBlob: blob, audioChunks: [], elapsed });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      setRecording(true);
      setPaused(false);
    } catch (err) {
      console.error("Recording failed:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    setPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.pause();
      setPaused(true);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "paused") {
      mediaRecorder.current.resume();
      setPaused(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      run("transcribe", () => handleTranscribe(file));
    },
    [handleTranscribe, run]
  );

  const buildPrompt = useCallback(
    (base: string, format: string) => {
      const lang = language ? `Write the output in ${language}.\n\n` : "";
      const note = notes.trim() ? `Additional context from the author:\n${notes}\n\n` : "";
      return `${lang}${note}${base}`;
    },
    [language, notes]
  );

  const generateTitles = useCallback(
    async (draftText: string) => {
      if (!draftText.trim()) return;
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(
            `Suggest exactly 3 short, compelling title options for the following blog draft. ` +
              `Return ONLY the 3 titles, one per line, with no numbering, quotes, or extra text.\n\nDraft:\n${draftText}`,
            "raw"
          ),
          format: "raw",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const options = String(data.text ?? "")
        .split("\n")
        .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").replace(/^["'“”]|["'“”]$/g, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      setTitleOptions(options);
      saveSession({ titleOptions: options });
    },
    [buildPrompt]
  );

  const generateDraft = useCallback(async () => {
    if (!transcript.trim()) return;
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildPrompt(
          `Transform this transcript into a well-structured blog draft.\n\nTranscript:\n${transcript}`,
          "blog"
        ),
        format: "blog",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setDraft(data.text);
    setDraftId(null);
    setLinkedIdea(null);
    setSelectedTitle("");
    setTitleOptions([]);
    setContentId(null);
    saveSession({ draft: data.text, draftId: null, linkedIdea: null, selectedTitle: "", titleOptions: [], contentId: null });
    // Generate title suggestions off the fresh draft (best-effort).
    generateTitles(data.text).catch(() => {});
  }, [transcript, buildPrompt, generateTitles]);

  // Create the Content entry for this draft (or update it if already created).
  const ensureContentEntry = useCallback(async () => {
    if (!draft.trim()) return null;
    const title = selectedTitle || titleOptions[0] || transcript.slice(0, 80) || "Untitled draft";
    if (contentId) {
      await fetch("/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contentId, title, body: draft }),
      });
      return contentId;
    }
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body: draft }),
    });
    if (!res.ok) throw new Error("Failed to save to Content");
    const data = await res.json();
    setContentId(data.id);
    saveSession({ contentId: data.id });
    return data.id as string;
  }, [draft, selectedTitle, titleOptions, transcript, notes, contentId]);

  const selectTitle = useCallback((t: string) => {
    setSelectedTitle(t);
    saveSession({ selectedTitle: t });
  }, []);

  const goToContentEntry = useCallback(async () => {
    const id = await ensureContentEntry();
    if (id) router.push(`/content?id=${id}`);
  }, [ensureContentEntry, router]);

  const generateExcerpt = useCallback(
    async (format: ExcerptFormat) => {
      if (!draft.trim()) return;
      const label = format === "x" ? "an X (Twitter)" : format === "linkedin" ? "a LinkedIn" : "a Substack";
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(`Generate ${label} post from this draft:\n\n${draft}`, format),
          format,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExcerpts((prev) => ({ ...prev, [format]: data.text }));
      saveSession({ excerpts: { ...excerpts, [format]: data.text } });
    },
    [draft, buildPrompt, excerpts]
  );

  const saveDraftOnly = useCallback(
    async (ideaId?: string | null) => {
      if (!draft.trim()) return null;
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: transcript.slice(0, 80) || "Untitled draft",
          content: draft,
          source: "generated",
          transcript,
          idea_id: ideaId ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      const data = await res.json();
      setDraftId(data.id);
      if (data.idea) setLinkedIdea(data.idea);
      saveSession({ draftId: data.id, linkedIdea: data.idea ?? null });
      return data;
    },
    [draft, transcript]
  );

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  // Clear all current work and reset the page for a brand-new content.
  const resetAll = useCallback(() => {
    setTranscript("");
    setDraft("");
    setNotes("");
    setExcerpts({});
    setTitleOptions([]);
    setSelectedTitle("");
    setContentId(null);
    setDraftId(null);
    setLinkedIdea(null);
    setRecordedBlob(null);
    setElapsed(0);
    setShowDiscardConfirm(false);
    clearAll();
  }, []);

  // Open the relevant platform's composer (web profile / app) with the text.
  const shareExcerpt = useCallback(
    (fmt: ExcerptFormat, text: string) => {
      if (fmt === "x") {
        // X intent prefills the text; on mobile the OS routes to the app.
        window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      } else if (fmt === "linkedin") {
        // LinkedIn has no reliable text prefill — copy, then open the composer.
        navigator.clipboard.writeText(text).catch(() => {});
        window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener");
        showSuccessToast("Metin kopyalandı — LinkedIn'de yapıştırabilirsin.");
      } else {
        navigator.clipboard.writeText(text).catch(() => {});
        showSuccessToast("Kopyalandı!");
      }
    },
    [showSuccessToast]
  );

  const saveToContent = useCallback(async () => {
    await ensureContentEntry();
  }, [ensureContentEntry]);

  const fetchIdeas = useCallback(async (q?: string) => {
    setSearchingIdeas(true);
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("search", q);
      const res = await fetch(`/api/ideas?${params}`);
      const data = await res.json();
      setIdeaResults(data ?? []);
    } catch { setIdeaResults([]); } finally { setSearchingIdeas(false); }
  }, []);

  const linkToIdea = useCallback(
    async (idea: Idea) => {
      // Append draft content to idea's existing content
      if (draft.trim()) {
        const existing = idea.content ?? "";
        const separator = existing ? "\n\n---\n\n" : "";
        const updatedContent = `${existing}${separator}${draft}`;
        // Merge tags from the draft context
        const mergedTags = [...new Set([...idea.tags, ...(transcript ? ["audio"] : [])])];

        await fetch("/api/ideas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: idea.id,
            content: updatedContent,
            tags: mergedTags,
          }),
        });
      }

      // Link draft record to idea
      if (draftId) {
        await fetch("/api/drafts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: draftId, idea_id: idea.id }),
        });
      } else if (draft) {
        await saveDraftOnly(idea.id);
      }

      setLinkedIdea(idea);
      setShowLinkModal(false);
      saveSession({ linkedIdea: idea });
    },
    [draft, draftId, transcript, saveDraftOnly]
  );

  // Load newest ideas on modal open; search on query change
  useEffect(() => {
    if (showLinkModal) {
      fetchIdeas(ideaSearch || undefined);
    }
  }, [showLinkModal, ideaSearch, fetchIdeas]);

  const transcribing = isLoading("transcribe");
  const hasDraft = draft.trim().length > 0;
  const formatNames: ExcerptFormat[] = ["linkedin", "substack", "x"];

  const anyLoading =
    isLoading("transcribe") ||
    isLoading("generateDraft") ||
    isLoading("generateTitles") ||
    isLoading("generateLinkedin") ||
    isLoading("generateSubstack") ||
    isLoading("generateXPost") ||
    isLoading("regenerate-linkedin") ||
    isLoading("regenerate-substack") ||
    isLoading("regenerate-x");

  const activeLoadingKey = (
    ["transcribe", "generateDraft", "generateTitles", "generateLinkedin", "generateSubstack", "generateXPost",
     "regenerate-linkedin", "regenerate-substack", "regenerate-x"] as const
  ).find((k) => isLoading(k));

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastStack toasts={toasts} onDismiss={clearToast} />

      {/* Global loading overlay */}
      {anyLoading && activeLoadingKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 shadow-2xl flex items-center gap-4 animate-fade-in">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {loadingLabel(activeLoadingKey)}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Content Studio
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {persona?.profile?.tone?.style && persona.profile.topics?.length
              ? `Writing as "${persona.name}" — ${persona.profile.tone.style} · ${persona.profile.topics.slice(0, 3).join(", ")}`
              : "Record, transcribe, and generate content"}
          </p>
        </div>
      </div>

      {/* Input card */}
      <GlassCard className="p-6 space-y-8" hover>
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Audio
          </h2>

          {recording && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 p-4 space-y-3">
              <Waveform stream={streamRef.current} active={!paused} />
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                  {formatDuration(elapsed)}
                </span>
                <div className="flex gap-2">
                  {paused ? (
                    <GlassButton size="sm" variant="primary" onClick={resumeRecording}>Resume</GlassButton>
                  ) : (
                    <GlassButton size="sm" variant="secondary" onClick={pauseRecording}>Pause</GlassButton>
                  )}
                  <GlassButton size="sm" variant="ghost" onClick={stopRecording}>Stop</GlassButton>
                </div>
              </div>
            </div>
          )}

          {!recording && recordedBlob && !transcribing && (
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 p-3">
              <span className="text-sm text-zinc-500">Recording ({formatDuration(elapsed)})</span>
              <GlassButton size="sm" variant="primary" disabled={transcribing} onClick={() => run("transcribe", () => handleTranscribe(recordedBlob!))}>
                {transcribing ? loadingLabel("transcribe") : "Metne çevir"}
              </GlassButton>
              <GlassButton size="sm" variant="ghost" onClick={() => setShowDiscardConfirm(true)}>
                Discard
              </GlassButton>
            </div>
          )}

          {transcribing && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 animate-pulse">
              <span>{loadingLabel("transcribe")}</span>
            </div>
          )}

          {!recording && !transcribing && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <GlassButton variant={recordedBlob ? "secondary" : "primary"} onClick={startRecording}>
                {recordedBlob ? "Record another" : "Start Recording"}
              </GlassButton>
              <label className="cursor-pointer rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                Upload audio file
                <input type="file" accept=".m4a,.aac,.mp3,.wav,.ogg,.flac,.webm,audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <PrivacyDisclaimer />
            </div>
          )}
        </div>

        <div className="space-y-3 pt-6 border-t border-zinc-200/60 dark:border-zinc-700/40">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Transcript / Notes
          </h2>
          <textarea
            ref={textRef}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your transcript or write your notes here..."
            rows={5}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical min-h-[100px]"
          />
        </div>
      </GlassCard>

      {/* Generate settings */}
      <GlassCard className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Generate Settings
        </h2>

        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Output language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Additional notes (optional) — things you forgot to mention or want to emphasize
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., I want the tone to be more casual, mention the new product launch, and add a call to action at the end..."
            rows={2}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
          />
        </div>
      </GlassCard>

      {/* Action bar */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap gap-x-4 gap-y-3 items-center">
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => run("generateDraft", generateDraft)}
            disabled={!transcript.trim() || isLoading("generateDraft")}
          >
            {isLoading("generateDraft") ? loadingLabel("generateDraft") : "Generate Draft"}
          </GlassButton>

          <div className="w-px h-5 bg-zinc-200/60 dark:bg-zinc-700/40" />

          <GlassButton
            size="sm"
            variant="secondary"
            disabled={!hasDraft || isLoading("saveDraft")}
            onClick={() => run("saveDraft", async () => { await saveDraftOnly(linkedIdea?.id); showSuccessToast("Taslak kaydedildi."); })}
          >
            {isLoading("saveDraft") ? loadingLabel("saveDraft") : draftId ? "Update Saved Draft" : "Save Draft"}
          </GlassButton>

          <GlassButton
            size="sm"
            variant="secondary"
            disabled={!hasDraft || isLoading("saveContent")}
            onClick={() => run("saveContent", async () => { await saveToContent(); showSuccessToast("Content'e kaydedildi."); })}
          >
            {isLoading("saveContent") ? loadingLabel("saveContent") : contentId ? "Update in Content" : "Save to Content"}
          </GlassButton>

          <GlassButton
            size="sm"
            variant="secondary"
            disabled={!hasDraft}
            onClick={() => handleCopy(draft).then(() => showSuccessToast("Kopyalandı!"))}
          >
            Copy Draft
          </GlassButton>

          <GlassButton
            size="sm"
            variant="ghost"
            disabled={!hasDraft}
            onClick={() => setShowLinkModal(true)}
          >
            {linkedIdea ? "Change Link" : "Link to Idea"}
          </GlassButton>

          {hasDraft && linkedIdea && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full whitespace-nowrap truncate max-w-[160px]" title={linkedIdea.title}>
              {linkedIdea.title}
            </span>
          )}
        </div>
      </GlassCard>

      {/* Title alternatives */}
      {hasDraft && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Title</h2>
            {(titleOptions.length > 0 || selectedTitle) && (
              <GlassButton
                size="sm"
                variant="ghost"
                disabled={isLoading("generateTitles")}
                onClick={() => run("generateTitles", () => generateTitles(draft))}
              >
                {isLoading("generateTitles") ? loadingLabel("generateTitles") : "Regenerate titles"}
              </GlassButton>
            )}
          </div>

          {selectedTitle ? (
            <div className="space-y-2">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); run("goContent", goToContentEntry); }}
                className="block text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 hover:underline leading-snug"
                title="Open this entry under Content"
              >
                {selectedTitle}
              </a>
              <button
                onClick={() => { setSelectedTitle(""); saveSession({ selectedTitle: "" }); }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Change title
              </button>
            </div>
          ) : titleOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Pick a title:</p>
              <div className="flex flex-col gap-2">
                {titleOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => selectTitle(t)}
                    className="w-full text-left rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <GlassButton
              size="sm"
              variant="secondary"
              disabled={isLoading("generateTitles")}
              onClick={() => run("generateTitles", () => generateTitles(draft))}
            >
              {isLoading("generateTitles") ? loadingLabel("generateTitles") : "Generate title options"}
            </GlassButton>
          )}
        </GlassCard>
      )}

      {/* Draft output — editable textarea */}
      {hasDraft && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Draft</h2>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(draft).then(() => showSuccessToast("Kopyalandı!"))}
            >
              Copy
            </GlassButton>
          </div>
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); saveSession({ draft: e.target.value }); }}
            rows={8}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical leading-relaxed"
          />
        </GlassCard>
      )}

      {/* Excerpt sections — always visible when draft exists */}
      {hasDraft && (
        <GlassCard className="p-6 space-y-6">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Repurpose Draft
          </h2>

          {formatNames.map((fmt) => {
            const content = excerpts[fmt] ?? "";
            const exists = content.length > 0;

            return (
              <div key={fmt} className="space-y-4 pb-6 border-b border-zinc-200/60 dark:border-zinc-700/40 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {FORMAT_LABELS[fmt]}
                  </h3>
                  {exists && (
                    <div className="flex gap-2">
                      {(fmt === "linkedin" || fmt === "x") && (
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => shareExcerpt(fmt, content)}
                        >
                          {fmt === "x" ? "Share on X" : "Share on LinkedIn"}
                        </GlassButton>
                      )}
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(content).then(() => showSuccessToast("Kopyalandı!"))}
                      >
                        Copy
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => run(`regenerate-${fmt}`, async () => {
                          await generateExcerpt(fmt);
                          showSuccessToast(`${FORMAT_LABELS[fmt]} yeniden oluşturuldu.`);
                        })}
                        disabled={isLoading(`regenerate-${fmt}`)}
                      >
                        {isLoading(`regenerate-${fmt}`) ? loadingLabel(`generate${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`) : "Yeniden üret"}
                      </GlassButton>
                    </div>
                  )}
                </div>

                {exists ? (
                  <textarea
                    value={content}
                    onChange={(e) => setExcerpts((prev) => ({ ...prev, [fmt]: e.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical leading-relaxed"
                  />
                ) : (
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => run(`generate${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`, () => generateExcerpt(fmt))}
                    disabled={isLoading(`generate${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`)}
                  >
                    {isLoading(`generate${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`) ? loadingLabel(`generate${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`) : `Generate ${FORMAT_LABELS[fmt]}`}
                  </GlassButton>
                )}
              </div>
            );
          })}
        </GlassCard>
      )}

      {/* Discard / start-new confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowDiscardConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Start a new content?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This clears your current recording, transcript, draft, and generated posts. This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <GlassButton variant="ghost" onClick={() => setShowDiscardConfirm(false)}>Cancel</GlassButton>
              <GlassButton variant="primary" onClick={resetAll}>Start new content</GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Link to Idea Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowLinkModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">Link Draft to Idea</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Search for an existing idea to link this draft to.</p>
            <input value={ideaSearch} onChange={(e) => setIdeaSearch(e.target.value)} placeholder="Search ideas..." autoFocus
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-4" />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchingIdeas ? (
                <p className="text-sm text-zinc-400 text-center py-4">Searching...</p>
              ) : ideaResults.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">{ideaSearch ? "No results" : "No ideas yet"}</p>
              ) : (
                ideaResults.map((idea) => (
                  <button key={idea.id} onClick={() => linkToIdea(idea)}
                    className="w-full text-left rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{idea.title}</p>
                    {idea.preview?.site_name && <p className="text-xs text-zinc-400 mt-0.5">{idea.preview.site_name}</p>}
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end mt-4">
              <GlassButton variant="ghost" onClick={() => setShowLinkModal(false)}>Cancel</GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
