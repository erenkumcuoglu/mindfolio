"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { detectPlatformFromUrl, PLATFORM_LABELS, PLATFORM_STYLES } from "@/lib/platform";
import type { LinkPreview } from "@/lib/platform";

interface Idea {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  source_type: string | null;
  tags: string[];
  pillar: string | null;
  preview: LinkPreview | null;
  created_at: string;
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // New idea form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newLoading, setNewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchedPreview, setFetchedPreview] = useState<LinkPreview | null>(null);
  const urlTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Edit state
  const [editIdea, setEditIdea] = useState<Idea | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadIdeas = useCallback(async (q?: string, tag?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/ideas?${params}`);
      const data = await res.json();
      // Ideas = bookmarked links only. Blog drafts (saved from Studio) live in Content.
      const bookmarks = (Array.isArray(data) ? data : []).filter(
        (i: Idea) => i.source_type !== "audio" && i.source_type !== "generated"
      );
      setIdeas(bookmarks);
    } catch (err) {
      console.error("Failed to load ideas:", err);
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdeas(search || undefined, activeTag);
  }, [loadIdeas, search, activeTag]);

  // Auto-fetch preview on URL change
  const handleUrlChange = useCallback((url: string) => {
    setNewUrl(url);
    if (urlTimeout.current) clearTimeout(urlTimeout.current);

    const trimmed = url.trim();
    if (!trimmed.startsWith("http")) return;

    setNewLoading(true);
    urlTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          const preview = data.preview as LinkPreview;
          if (preview) {
            setFetchedPreview(preview);
            setNewTitle((prev) => prev || preview.title);
            if (preview.site_name) {
              setNewTags((prev) =>
                prev.includes(preview.site_name) ? prev : [...prev, preview.site_name]
              );
            }
            if (preview.description) {
              setNewContent((prev) => prev || preview.description);
            }
          }
        }
      } catch {
        // preview is best-effort
      } finally {
        setNewLoading(false);
      }
    }, 600);
  }, []);

  const handleAddTag = useCallback(() => {
    const t = newTagInput.trim();
    if (t && !newTags.includes(t)) {
      setNewTags((prev) => [...prev, t]);
      setNewTagInput("");
    }
  }, [newTagInput, newTags]);

  const handleSaveIdea = useCallback(async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: newTitle,
        content: newContent || undefined,
        tags: newTags,
        preview: fetchedPreview ?? undefined,
      };
      if (newUrl.trim()) {
        payload.url = newUrl.trim();
      }

      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");
      resetForm();
      loadIdeas(search || undefined, activeTag);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [newTitle, newUrl, newContent, newTags, fetchedPreview, loadIdeas, search, activeTag]);

  const resetForm = useCallback(() => {
    setNewTitle("");
    setNewUrl("");
    setNewContent("");
    setNewTags([]);
    setNewTagInput("");
    setFetchedPreview(null);
    setShowForm(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/ideas`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setIdeas((prev) => prev.filter((i) => i.id !== id));
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  // Edit handlers
  const openEdit = useCallback((idea: Idea) => {
    setEditIdea(idea);
    setEditTitle(idea.title);
    setEditUrl(idea.url ?? "");
    setEditContent(idea.content ?? "");
    setEditTags([...idea.tags]);
    setEditTagInput("");
  }, []);

  const handleAddEditTag = useCallback(() => {
    const t = editTagInput.trim();
    if (t && !editTags.includes(t)) {
      setEditTags((prev) => [...prev, t]);
      setEditTagInput("");
    }
  }, [editTagInput, editTags]);

  const handleSaveEdit = useCallback(async () => {
    if (!editIdea || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editIdea.id,
          title: editTitle,
          url: editUrl.trim() || null,
          content: editContent || null,
          tags: editTags,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditIdea(null);
      loadIdeas(search || undefined, activeTag);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  }, [editIdea, editTitle, editUrl, editContent, editTags, loadIdeas, search, activeTag]);

  // Collect all unique tags
  const allTags = [...new Set((Array.isArray(ideas) ? ideas : []).flatMap((i) => i.tags))].sort();

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ideas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Bookmarked links, notes, and content inspiration
          </p>
        </div>
        <GlassButton variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "New Idea"}
        </GlassButton>
      </div>

      {/* New idea form */}
      {showForm && (
        <GlassCard className="p-6 space-y-4" hover>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            New Idea
          </h2>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <div className="relative">
            <input
              value={newUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste a URL — preview will auto-fetch"
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {newLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 animate-pulse">
                Fetching...
              </span>
            )}
          </div>

          {/* Show auto-fetched preview metadata */}
          {fetchedPreview && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 p-3 space-y-1.5">
              {fetchedPreview.image && (
                <img
                  src={fetchedPreview.image}
                  alt=""
                  className="w-full rounded-lg object-cover max-h-32"
                />
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PLATFORM_STYLES[fetchedPreview.platform]}`}>
                  {PLATFORM_LABELS[fetchedPreview.platform]}
                </span>
                {fetchedPreview.site_name && (
                  <span className="text-xs text-zinc-400">{fetchedPreview.site_name}</span>
                )}
              </div>
              {fetchedPreview.title && (
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 line-clamp-2">{fetchedPreview.title}</p>
              )}
              {fetchedPreview.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{fetchedPreview.description}</p>
              )}
            </div>
          )}

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={fetchedPreview ? "Additional notes..." : "Notes or summary..."}
            rows={3}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
          />
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {newTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 text-sm max-w-[140px] truncate"
                  title={t}
                >
                  <span className="truncate">{t}</span>
                  <button
                    onClick={() => setNewTags((prev) => prev.filter((x) => x !== t))}
                    className="shrink-0 text-zinc-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddTag())
                }
                placeholder="Add tag..."
                className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <GlassButton size="sm" onClick={handleAddTag}>
                Add
              </GlassButton>
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allTags.filter((t) => !newTags.includes(t)).slice(0, 20).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setNewTags((prev) => [...prev, t]);
                      setNewTagInput("");
                    }}
                    className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <GlassButton
              variant="primary"
              onClick={handleSaveIdea}
              disabled={!newTitle.trim() || saving}
            >
              {saving ? "Saving..." : "Save Idea"}
            </GlassButton>
            <GlassButton variant="ghost" onClick={resetForm}>
              Cancel
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Search + tag filter */}
      <div className="space-y-3 animate-slide-up">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ideas..."
          className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTag === null
                  ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeTag === t
                    ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-zinc-400 text-center py-12">Loading...</p>
      ) : ideas.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No ideas yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onDelete={handleDelete} onEdit={openEdit} formatDate={formatDate} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setEditIdea(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Edit Idea</h3>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="URL (optional)"
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Notes or summary..."
              rows={6}
              className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
            />
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {editTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 text-sm max-w-[140px] truncate" title={t}>
                    <span className="truncate">{t}</span>
                    <button onClick={() => setEditTags((prev) => prev.filter((x) => x !== t))} className="shrink-0 text-zinc-400 hover:text-red-500">×</button>
                  </span>
                ))}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 w-full">
                    {allTags.filter((t) => !editTags.includes(t)).slice(0, 20).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setEditTags((prev) => [...prev, t]);
                          setEditTagInput("");
                        }}
                        className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEditTag())}
                  placeholder="Add tag..."
                  className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <GlassButton size="sm" onClick={handleAddEditTag}>Add</GlassButton>
              </div>
            </div>
            <div className="flex gap-2">
              <GlassButton variant="primary" onClick={handleSaveEdit} disabled={!editTitle.trim() || savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setEditIdea(null)}>Cancel</GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  onDelete,
  onEdit,
  formatDate,
}: {
  idea: Idea;
  onDelete: (id: string) => void;
  onEdit: (idea: Idea) => void;
  formatDate: (d: string) => string;
}) {
  const preview = idea.preview;
  const platform = preview?.platform ?? detectPlatformFromUrl(idea.url);

  return (
    <GlassCard className="overflow-hidden group">
      {/* Preview image */}
      {preview?.image ? (
        idea.url ? (
          <a
            href={idea.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
          >
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </a>
        ) : (
          <button
            onClick={() => onEdit(idea)}
            className="block w-full aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
          >
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        )
      ) : null}

      <div className="p-4 space-y-2">
        {/* Platform badge */}
        <div className="flex items-center gap-1.5">
          {preview?.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PLATFORM_STYLES[platform]}`}>
            {PLATFORM_LABELS[platform]}
          </span>
          {preview?.site_name && (
            <span className="text-xs text-zinc-400 truncate">
              {preview.site_name}
            </span>
          )}
        </div>

        {/* Title — external links open the URL; saved notes/drafts open the editable popup */}
        {idea.url ? (
          <a
            href={idea.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-semibold text-zinc-900 dark:text-zinc-50 leading-snug hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {idea.title}
          </a>
        ) : (
          <button
            onClick={() => onEdit(idea)}
            className="block w-full text-left font-semibold text-zinc-900 dark:text-zinc-50 leading-snug hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {idea.title}
          </button>
        )}

        {/* Description */}
        {preview?.description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {preview.description}
          </p>
        )}

        {/* Content */}
        {idea.content && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {idea.content}
          </p>
        )}

        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {idea.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 max-w-[110px] truncate"
                title={t}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-400">{formatDate(idea.created_at)}</span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(idea)}
              className="text-xs text-zinc-400 hover:text-emerald-500"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(idea.id)}
              className="text-xs text-zinc-400 hover:text-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
