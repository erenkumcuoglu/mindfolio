"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

interface ContentEntry {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  notes: string | null;
  body: string | null;
  scheduled_at: string | null;
  created_at: string;
}

// Content pillars. These default to the user's pillars and will be set per-user
// during onboarding (add / remove / edit). Kept as a constant for now.
const PILLARS = [
  "Yönetici Perspektifi",
  "Kurucunun Günlüğü",
  "Filtresiz Pazarlama",
  "Kavram ve Düşünceler",
  "Kariyer ve Kültür",
];

function ContentPageInner() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formScheduled, setFormScheduled] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editEntry, setEditEntry] = useState<ContentEntry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editScheduled, setEditScheduled] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadEntries = useCallback(async (cat?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.set("category", cat);
      const res = await fetch(`/api/content?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load content:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries(activeCategory);
  }, [loadEntries, activeCategory]);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormCategory("");
    setFormBody("");
    setFormScheduled("");
    setShowForm(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formTitle,
        category: formCategory || undefined,
        body: formBody || undefined,
      };
      if (formScheduled) payload.scheduled_at = new Date(formScheduled).toISOString();

      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      resetForm();
      loadEntries(activeCategory);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [formTitle, formCategory, formBody, formScheduled, resetForm, loadEntries, activeCategory]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch("/api/content", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Edit
  const openEdit = useCallback((entry: ContentEntry) => {
    setEditEntry(entry);
    setConfirmDelete(false);
    setEditTitle(entry.title);
    setEditCategory(entry.category ?? "");
    setEditBody(entry.body ?? "");
    setEditScheduled(entry.scheduled_at ? entry.scheduled_at.slice(0, 16) : "");
  }, []);

  // Open a specific entry when arriving via ?id= (e.g. the Studio title link)
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || loading) return;
    const match = entries.find((e) => e.id === id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) openEdit(match);
  }, [searchParams, loading, entries, openEdit]);

  const handleSaveEdit = useCallback(async () => {
    if (!editEntry || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        id: editEntry.id,
        title: editTitle,
        category: editCategory || null,
        body: editBody || null,
      };
      if (editScheduled) payload.scheduled_at = new Date(editScheduled).toISOString();
      else payload.scheduled_at = null;

      const res = await fetch("/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditEntry(null);
      loadEntries(activeCategory);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  }, [editEntry, editTitle, editCategory, editBody, editScheduled, loadEntries, activeCategory]);

  const allCategories = [...new Set(entries.map((e) => e.category).filter(Boolean))] as string[];

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Content
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Plan, organize, and schedule your content
          </p>
        </div>
        <GlassButton variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "New Content"}
        </GlassButton>
      </div>

      {/* New content form */}
      {showForm && (
        <GlassCard className="p-6 space-y-4" hover>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            New Content
          </h2>

          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Content title"
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />

          <select
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Select pillar</option>
            {PILLARS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Draft
            </label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder="Full draft text..."
              rows={6}
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Scheduled publish date
            </label>
            <input
              type="datetime-local"
              value={formScheduled}
              onChange={(e) => setFormScheduled(e.target.value)}
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex gap-2">
            <GlassButton variant="primary" onClick={handleSave} disabled={!formTitle.trim() || saving}>
              {saving ? "Saving..." : "Save Content"}
            </GlassButton>
            <GlassButton variant="ghost" onClick={resetForm}>Cancel</GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5 animate-slide-up">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            activeCategory === null
              ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          All
        </button>
        {allCategories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(activeCategory === c ? null : c)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activeCategory === c
                ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Content grid */}
      {loading ? (
        <p className="text-sm text-zinc-400 text-center py-12">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No content yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <GlassCard key={entry.id} className="p-5 space-y-3 overflow-hidden group" onClick={() => openEdit(entry)}>
              {/* Category badge + dates */}
              <div className="flex items-center justify-between gap-2">
                {entry.category ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                    {entry.category}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-[10px] text-zinc-400">{formatDate(entry.created_at)}</span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
                {entry.title}
              </h3>

              {/* Draft indicator */}
              {entry.body && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-medium">
                  Draft attached
                </span>
              )}

              {/* Scheduled date */}
              {entry.scheduled_at && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <span>📅</span>
                  <span>Scheduled: {formatDate(entry.scheduled_at)}</span>
                </div>
              )}

            </GlassCard>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setEditEntry(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Edit Content</h3>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title"
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">Select pillar</option>
              {PILLARS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Draft</label>
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Full draft text..." rows={10}
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical leading-relaxed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Scheduled publish date</label>
              <input type="datetime-local" value={editScheduled} onChange={(e) => setEditScheduled(e.target.value)}
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/40">
              <GlassButton variant="primary" onClick={handleSaveEdit} disabled={!editTitle.trim() || savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setEditEntry(null)}>Cancel</GlassButton>

              <div className="ml-auto">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Are you sure?</span>
                    <button
                      onClick={() => { const id = editEntry.id; setConfirmDelete(false); setEditEntry(null); handleDelete(id); }}
                      className="rounded-xl px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-xl px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400 text-center py-12">Loading...</p>}>
      <ContentPageInner />
    </Suspense>
  );
}
