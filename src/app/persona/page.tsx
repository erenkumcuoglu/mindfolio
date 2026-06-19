"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

interface PersonaProfile {
  purpose: string;
  topics: string[];
  professional_background: string;
  linkedin_url: string;
  demographics: { industry: string; role: string; experience: string };
  tone: { style: string; formality: string; humor: string; voice: string };
  writing_samples: string[];
  values: string[];
  audience: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  voice: string;
  profile: PersonaProfile;
}

export default function PersonaPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [name, setName] = useState("");
  const [profile, setProfile] = useState<PersonaProfile>({
    purpose: "",
    topics: [],
    professional_background: "",
    linkedin_url: "",
    demographics: { industry: "", role: "", experience: "" },
    tone: { style: "", formality: "semi-formal", humor: "light", voice: "" },
    writing_samples: [],
    values: [],
    audience: "",
  });

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setPersona(data);
          setName(data.name ?? "");
          if (data.profile) {
            setProfile((prev) => ({
              ...prev,
              ...data.profile,
              demographics: { ...prev.demographics, ...(data.profile.demographics ?? {}) },
              tone: { ...prev.tone, ...(data.profile.tone ?? {}) },
              topics: data.profile.topics ?? prev.topics,
              writing_samples: data.profile.writing_samples ?? prev.writing_samples,
              values: data.profile.values ?? prev.values,
            }));
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateProfile = useCallback(
    (path: string[], value: unknown) => {
      setDirty(true);
      setProfile((prev) => {
        const next = { ...prev };
        let obj: Record<string, unknown> = next;
        for (let i = 0; i < path.length - 1; i++) {
          obj = obj[path[i]] as Record<string, unknown>;
        }
        obj[path[path.length - 1]] = value;
        return next;
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, profile }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [name, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your Persona
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            This defines how Mindfolio writes for you. All content is generated
            in this voice.
          </p>
        </div>
        <div className="flex gap-2">
          <GlassButton variant="ghost" onClick={() => router.push("/studio")}>
            Back
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? "Saving..." : "Save"}
          </GlassButton>
        </div>
      </div>

      <GlassCard className="p-6 space-y-6" hover>
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => (setName(e.target.value), setDirty(true))}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Purpose
          </label>
          <textarea
            value={profile.purpose}
            onChange={(e) => updateProfile(["purpose"], e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
          />
        </div>

        {/* Topics */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Topics
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.topics.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-3 py-1 text-sm"
              >
                {t}
                <button
                  onClick={() =>
                    updateProfile(
                      ["topics"],
                      profile.topics.filter((_, idx) => idx !== i)
                    )
                  }
                  className="text-emerald-600 dark:text-emerald-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            placeholder="Add a topic..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                updateProfile(["topics"], [...profile.topics, e.currentTarget.value.trim()]);
                e.currentTarget.value = "";
              }
            }}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Professional Background */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Professional Background
          </label>
          <textarea
            value={profile.professional_background}
            onChange={(e) => updateProfile(["professional_background"], e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
          />
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            LinkedIn URL
          </label>
          <input
            value={profile.linkedin_url}
            onChange={(e) => updateProfile(["linkedin_url"], e.target.value)}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Demographics */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Demographics
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Industry</label>
              <input
                value={profile.demographics.industry}
                onChange={(e) =>
                  updateProfile(["demographics", "industry"], e.target.value)
                }
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Role</label>
              <input
                value={profile.demographics.role}
                onChange={(e) =>
                  updateProfile(["demographics", "role"], e.target.value)
                }
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Experience</label>
              <input
                value={profile.demographics.experience}
                onChange={(e) =>
                  updateProfile(["demographics", "experience"], e.target.value)
                }
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Tone & Voice
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Style</label>
              <input
                value={profile.tone.style}
                onChange={(e) => updateProfile(["tone", "style"], e.target.value)}
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Formality</label>
              <select
                value={profile.tone.formality}
                onChange={(e) => updateProfile(["tone", "formality"], e.target.value)}
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="casual">Casual</option>
                <option value="semi-formal">Semi-formal</option>
                <option value="formal">Formal</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Humor</label>
              <select
                value={profile.tone.humor}
                onChange={(e) => updateProfile(["tone", "humor"], e.target.value)}
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="none">None</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Voice</label>
              <input
                value={profile.tone.voice}
                onChange={(e) => updateProfile(["tone", "voice"], e.target.value)}
                placeholder="e.g., First-person, authoritative"
                className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* Values */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Values
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.values.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-3 py-1 text-sm"
              >
                {v}
                <button
                  onClick={() =>
                    updateProfile(
                      ["values"],
                      profile.values.filter((_, idx) => idx !== i)
                    )
                  }
                  className="text-emerald-600 dark:text-emerald-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            placeholder="Add a value..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                updateProfile(["values"], [...profile.values, e.currentTarget.value.trim()]);
                e.currentTarget.value = "";
              }
            }}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Audience */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Target Audience
          </label>
          <textarea
            value={profile.audience}
            onChange={(e) => updateProfile(["audience"], e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
          />
        </div>

        {/* Writing Samples */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Writing Samples
          </label>
          {profile.writing_samples.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2 mb-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-3"
            >
              <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{s}</p>
              <button
                onClick={() =>
                  updateProfile(
                    ["writing_samples"],
                    profile.writing_samples.filter((_, idx) => idx !== i)
                  )
                }
                className="text-zinc-400 hover:text-red-500 transition-colors shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          <textarea
            placeholder="Paste a writing sample..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey && e.currentTarget.value.trim()) {
                updateProfile(
                  ["writing_samples"],
                  [...profile.writing_samples, e.currentTarget.value.trim()]
                );
                e.currentTarget.value = "";
              }
            }}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical"
          />
          <p className="text-xs text-zinc-400 mt-1">Cmd+Enter to add</p>
        </div>
      </GlassCard>
    </div>
  );
}
