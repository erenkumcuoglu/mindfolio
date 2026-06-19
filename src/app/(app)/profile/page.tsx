"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setDisplayName(data.user.user_metadata?.display_name ?? data.user.email?.split("@")[0] ?? "");
      }
    });
  }, [supabase]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (updateError) throw updateError;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Your personal preferences and information
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200/60 dark:border-red-800/40 bg-red-50/90 dark:bg-red-950/90 backdrop-blur-xl p-4 animate-slide-up">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <GlassCard className="p-6 space-y-5" hover>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Email
          </label>
          <input
            value={email}
            disabled
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Email cannot be changed. Contact support for assistance.
          </p>
        </div>

        <GlassButton variant="primary" onClick={handleSave} disabled={loading || !displayName.trim()}>
          {loading ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </GlassButton>
      </GlassCard>
    </div>
  );
}
