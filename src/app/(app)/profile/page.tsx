"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useLocaleControl } from "@/lib/use-locale";

interface PersonaProfile {
  positioning_statement?: string; purpose?: string;
  pillars?: { title: string; description?: string }[];
  voice_profile?: string[]; tone?: { style?: string; voice?: string };
  differentiation?: { do?: string[]; dont?: string[] };
  audience?: string; values?: string[]; sample_post?: string;
  suggested_platforms?: string[]; cadence?: string; linkedin_url?: string;
  demographics?: { industry?: string; role?: string };
  persona_changed_at?: string;
  subscription?: { active?: boolean; plan?: string };
}
const DAY = 86400000;
interface UsageStats { daily: { current: number; limit: number }; monthly: { current: number; limit: number; remaining: number }; }

export default function ProfilePage() {
  const tt = useLocale();
  const { lang, setLang } = useLocaleControl();
  const supabase = createClient();
  const [profile, setProfile] = useState<PersonaProfile | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [ref, setRef] = useState<{ code: string; referrals: number; earnedMonths: number; appliedCode: boolean } | null>(null);
  const [refInput, setRefInput] = useState("");

  // Persona edit / regenerate / monthly-lock
  const [editingPersona, setEditingPersona] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);
  const [pd, setPd] = useState({ positioning: "", voice: "", audience: "", field: "", goal: "", linkedin: "", helper: "" });

  const lastChanged = profile?.persona_changed_at ? new Date(profile.persona_changed_at).getTime() : 0;
  const daysSince = lastChanged ? Math.floor((Date.now() - lastChanged) / DAY) : Infinity;
  const canEditPersona = daysSince >= 30;
  const nextEditDate = lastChanged ? new Date(lastChanged + 30 * DAY).toLocaleDateString("tr-TR", { day: "2-digit", month: "long" }) : null;

  const startEditPersona = () => {
    if (!canEditPersona) { setLockOpen(true); return; }
    setPd({
      positioning: profile?.positioning_statement ?? "",
      voice: (profile?.voice_profile ?? []).join(", "),
      audience: profile?.audience ?? "",
      field: profile?.demographics?.industry || profile?.demographics?.role || "",
      goal: profile?.purpose ?? "",
      linkedin: profile?.linkedin_url ?? "",
      helper: "",
    });
    setEditingPersona(true);
  };

  const flashPersonaSaved = () => { setPersonaSaved(true); setTimeout(() => setPersonaSaved(false), 2500); };

  const savePersona = async () => {
    setSavingPersona(true);
    try {
      const now = new Date().toISOString();
      const merged: PersonaProfile = {
        ...(profile ?? {}),
        positioning_statement: pd.positioning.trim(),
        voice_profile: pd.voice.split(",").map((s) => s.trim()).filter(Boolean),
        audience: pd.audience.trim(),
        purpose: pd.goal.trim(),
        linkedin_url: pd.linkedin.trim(),
        demographics: { ...(profile?.demographics ?? {}), industry: pd.field.trim() },
        persona_changed_at: now,
      };
      const res = await fetch("/api/personas", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: merged, overwriteProfile: true }),
      });
      if (!res.ok) throw new Error();
      setProfile(merged);
      setEditingPersona(false);
      flashPersonaSaved();
    } catch { setError("Persona kaydedilemedi."); } finally { setSavingPersona(false); }
  };

  const regeneratePersona = async () => {
    setRegenLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-persona", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: pd.goal.trim() || "Kitle ve otorite inşa etmek",
          field: pd.field.trim() || "Genel",
          hasContent: "yes",
          voiceTraits: pd.voice.trim() || (profile?.voice_profile ?? []).join(", ") || "net, samimi, özgün",
          audience: pd.audience.trim() || "Alanındaki profesyoneller",
          positioning: pd.positioning.trim() || profile?.positioning_statement || "Kendi alanında özgün bir ses",
          importedContent: pd.helper.trim() || pd.linkedin.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.profile) throw new Error(d.error);
      const now = new Date().toISOString();
      const merged = { ...d.profile, linkedin_url: pd.linkedin.trim() || d.profile.linkedin_url || "", persona_changed_at: now } as PersonaProfile;
      await fetch("/api/personas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: merged, overwriteProfile: true }) });
      setProfile(merged);
      setPillars((merged.pillars ?? []).map((x) => x.title).filter(Boolean));
      setEditingPersona(false);
      flashPersonaSaved();
    } catch { setError("Persona üretilemedi."); } finally { setRegenLoading(false); }
  };
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadReferral = () => {
    fetch("/api/referral").then((r) => r.json()).then((d) => { if (d.code) setRef(d); }).catch(() => {});
  };
  useEffect(() => { loadReferral(); }, []);

  const applyRef = async () => {
    if (!refInput.trim()) return;
    setRefMsg(null);
    try {
      const res = await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: refInput.trim() }) });
      const d = await res.json();
      if (!res.ok) setRefMsg({ ok: false, text: d.error || "Kod uygulanamadı." });
      else { setRefMsg({ ok: true, text: "Davet kodu uygulandı 🎉" }); setRefInput(""); loadReferral(); }
    } catch { setRefMsg({ ok: false, text: "Bağlantı hatası." }); }
  };
  const copyRef = () => { if (ref?.code) { navigator.clipboard?.writeText(ref.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } };

  const redeemPromo = async () => {
    if (!promo.trim()) return;
    setPromoLoading(true);
    setPromoMsg(null);
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoMsg({ ok: false, text: data.error || "Kod kullanılamadı." });
      } else {
        setPromoMsg({ ok: true, text: `🎉 ${data.duration_days} günlük Pro üyelik tanımlandı!` });
        setPromo("");
      }
    } catch {
      setPromoMsg({ ok: false, text: "Bağlantı hatası." });
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setDisplayName(data.user.user_metadata?.display_name ?? data.user.email?.split("@")[0] ?? "");
      }
    });
  }, [supabase]);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => {
        const p = (d?.profile ?? null) as PersonaProfile | null;
        setProfile(p);
        setPillars(((p?.pillars ?? []) as { title?: string }[]).map((x) => x.title).filter(Boolean) as string[]);
      })
      .catch(() => {});
    fetch("/api/usage").then((r) => r.json()).then((d) => { if (d?.monthly) setUsage(d); }).catch(() => {});
  }, []);

  const persistPillars = async (next: string[]) => {
    setPillars(next);
    try {
      await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillars: next.map((title) => ({ title })) }),
      });
    } catch {
      /* best-effort */
    }
  };
  const addOrUpdatePillar = () => {
    const v = newPillar.trim();
    if (!v) { setEditingIdx(null); setNewPillar(""); return; }
    const next = editingIdx != null ? pillars.map((p, i) => (i === editingIdx ? v : p)) : pillars.includes(v) ? pillars : [...pillars, v];
    persistPillars(next);
    setNewPillar("");
    setEditingIdx(null);
  };
  const removePillar = (i: number) => persistPillars(pillars.filter((_, idx) => idx !== i));

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
          {tt.profileTitle}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {tt.profileDesc}
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
            {tt.displayName}
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={tt.yourNamePh}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {tt.emailLabel}
          </label>
          <input
            value={email}
            disabled
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-400 mt-1">
            {tt.emailLocked}
          </p>
        </div>

        <GlassButton variant="primary" onClick={handleSave} disabled={loading || !displayName.trim()}>
          {loading ? tt.saving : saved ? tt.savedExcl : tt.saveChangesBtn}
        </GlassButton>
      </GlassCard>

      {/* Dil */}
      <GlassCard className="p-6 flex items-center justify-between" hover>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{tt.language}</h2>
        <div className="flex rounded-full border border-zinc-200/60 dark:border-zinc-700/40 p-1">
          {(["tr", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${lang === l ? "bg-emerald-600 text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
            >
              {l === "tr" ? tt.langTurkish : tt.langEnglish}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Strateji (persona derinliği) */}
      {profile && (
        <GlassCard className="p-6 space-y-5" hover>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Strateji</h2>
            {!editingPersona && (
              <button onClick={startEditPersona} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Düzenle</button>
            )}
          </div>

          {editingPersona && (
            <div className="space-y-3">
              {[
                { k: "positioning", lb: "Konumlandırma", ph: "Tek cümlede seni en iyi anlatan konumlandırma…", area: true },
                { k: "voice", lb: "Ses profili (virgülle ayır)", ph: "net, samimi, iddialı…" },
                { k: "audience", lb: "Hedef kitle", ph: "Kimin için yazıyorsun?" },
                { k: "field", lb: "Alan / sektör", ph: "örn. B2B SaaS" },
                { k: "goal", lb: "Hedef", ph: "İçerikle ne başarmak istiyorsun?" },
                { k: "linkedin", lb: "LinkedIn profil linki", ph: "https://linkedin.com/in/…" },
                { k: "helper", lb: "Yardımcı linkler / makaleler / notlar", ph: "Seni daha iyi tanımamız için… (AI yeniden üretiminde kullanılır)", area: true },
              ].map((f) => (
                <div key={f.k}>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{f.lb}</label>
                  {f.area ? (
                    <textarea value={pd[f.k as keyof typeof pd]} onChange={(e) => setPd((s) => ({ ...s, [f.k]: e.target.value }))} placeholder={f.ph} rows={3}
                      className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-vertical" />
                  ) : (
                    <input value={pd[f.k as keyof typeof pd]} onChange={(e) => setPd((s) => ({ ...s, [f.k]: e.target.value }))} placeholder={f.ph}
                      className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  )}
                </div>
              ))}
              {/* Kaydet butonu kaldırıldı — mobile ile parite. Manuel kayıt ile
                  AI üretimi ayrımı kullanıcıyı karıştırıyor, boş alanla kilit
                  tetikleniyordu. Tek yol: AI ile yeniden üret. */}
              <GlassButton variant="primary" onClick={regeneratePersona} disabled={regenLoading}>
                {regenLoading ? "Üretiliyor…" : "✨ AI ile Yeniden Üret"}
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setEditingPersona(false)} disabled={regenLoading}>İptal</GlassButton>
              <p className="text-xs text-zinc-400">
                ⓘ Değişiklikten sonra strateji 1 ay boyunca kilitlenir. Marka dilinin tutarlı kalması ve
                modelin senin sesini doğru öğrenebilmesi için sık değişiklik önermiyoruz — bir sonraki
                güncelleme 1 ay sonra yapılabilir.
              </p>
            </div>
          )}

          {!editingPersona && (profile.positioning_statement || profile.sample_post || profile.voice_profile?.length || profile.audience || profile.values?.length || profile.suggested_platforms?.length || (profile.differentiation && (profile.differentiation.do?.length || profile.differentiation.dont?.length))) ? (
          <>
          {profile.positioning_statement && (
            <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 p-4">
              <p className="text-[15px] italic text-zinc-800 dark:text-zinc-100 leading-relaxed">“{profile.positioning_statement}”</p>
              {profile.purpose && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{profile.purpose}</p>}
            </div>
          )}

          {profile.pillars && profile.pillars.length > 0 && profile.pillars.some((p) => p.description) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">İçerik Sütunları</p>
              {profile.pillars.map((p, i) => (
                <div key={i} className="rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 p-3">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{i + 1}. {p.title}</p>
                  {p.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{p.description}</p>}
                </div>
              ))}
            </div>
          )}

          {(profile.voice_profile?.length || profile.tone?.style || profile.tone?.voice) && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Ses Profili{profile.tone?.style ? ` · ${profile.tone.style}` : ""}</p>
              <div className="flex flex-wrap gap-2">
                {(profile.voice_profile ?? []).map((v, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">{v}</span>
                ))}
              </div>
              {profile.tone?.voice && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{profile.tone.voice}</p>}
            </div>
          )}

          {profile.differentiation && (profile.differentiation.do?.length || profile.differentiation.dont?.length) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 p-3">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">✓ Yap</p>
                {(profile.differentiation.do ?? []).map((d, i) => <p key={i} className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">• {d}</p>)}
              </div>
              <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 p-3">
                <p className="text-xs font-bold text-red-500 mb-1.5">✕ Kaçın</p>
                {(profile.differentiation.dont ?? []).map((d, i) => <p key={i} className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">• {d}</p>)}
              </div>
            </div>
          )}

          {profile.audience && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Hedef Kitle</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{profile.audience}</p>
            </div>
          )}

          {profile.values && profile.values.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Değerler</p>
              <div className="flex flex-wrap gap-2">
                {profile.values.map((v, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">{v}</span>)}
              </div>
            </div>
          )}

          {profile.sample_post && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Örnek Post</p>
              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 p-4">
                <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed">{profile.sample_post}</p>
              </div>
            </div>
          )}

          {(profile.suggested_platforms?.length || profile.cadence) && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Yayın Planı</p>
              <div className="flex flex-wrap items-center gap-2">
                {(profile.suggested_platforms ?? []).map((p, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">{p}</span>)}
                {profile.cadence && <span className="text-xs text-zinc-500 dark:text-zinc-400">📅 {profile.cadence}</span>}
              </div>
            </div>
          )}
          </>
          ) : !editingPersona ? (
            <p className="text-sm text-zinc-400">Henüz strateji yok — Düzenle ile ekle ya da AI ile üret.</p>
          ) : null}

          {!canEditPersona && !editingPersona && (
            <p className="text-xs text-zinc-400">ⓘ Persona ayda bir değiştirilir{nextEditDate ? ` · sıradaki: ${nextEditDate}` : ""}</p>
          )}
        </GlassCard>
      )}

      {/* Kullanım & Abonelik */}
      <GlassCard className="p-6 space-y-3" hover>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Kullanım &amp; Abonelik</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${profile?.subscription?.active ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
            {profile?.subscription?.active ? (profile.subscription.plan ?? "Pro") : "Ücretsiz"}
          </span>
        </div>
        {usage ? (
          <>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((usage.monthly.current / Math.max(1, usage.monthly.limit)) * 100))}%` }} />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Bu ay {usage.monthly.current}/{usage.monthly.limit} üretim · {usage.monthly.remaining} hak kaldı · Günlük {usage.daily.current}/{usage.daily.limit}</p>
          </>
        ) : (
          <p className="text-xs text-zinc-400">Kullanım bilgisi yükleniyor…</p>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-3" hover>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          İçerik Pillar&apos;ları
        </h2>
        <div className="space-y-2">
          {pillars.map((p, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-3 py-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-700 dark:text-emerald-300">{i + 1}</span>
              <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{p}</span>
              <button onClick={() => { setEditingIdx(i); setNewPillar(p); }} className="text-xs text-zinc-400 hover:text-emerald-500">Düzenle</button>
              <button onClick={() => removePillar(i)} className="text-xs text-zinc-400 hover:text-red-500">Sil</button>
            </div>
          ))}
          {pillars.length === 0 && <p className="text-sm text-zinc-400">Henüz pillar yok — aşağıdan ekle.</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={newPillar}
            onChange={(e) => setNewPillar(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addOrUpdatePillar(); }}
            placeholder={editingIdx != null ? "Pillar'ı düzenle…" : "Yeni pillar ekle…"}
            className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <GlassButton variant="primary" onClick={addOrUpdatePillar}>
            {editingIdx != null ? "Kaydet" : "Ekle"}
          </GlassButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-3" hover>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Promo Kodu
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Davet kodun varsa buraya gir, hediye üyelik tanımlansın.
        </p>
        <div className="flex gap-2">
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") redeemPromo(); }}
            placeholder="KOD"
            className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm tracking-wider text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <GlassButton variant="primary" onClick={redeemPromo} disabled={promoLoading || !promo.trim()}>
            {promoLoading ? "..." : "Kullan"}
          </GlassButton>
        </div>
        {promoMsg && (
          <p className={`text-sm ${promoMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {promoMsg.text}
          </p>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-3" hover>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Davet Et &amp; Kazan
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Davet ettiğin kişi <strong>aylık</strong> üye olursa <strong>+1 ay</strong>, <strong>yıllık</strong> olursa <strong>+3 ay</strong> Pro hediye kazanırsın.
        </p>
        {ref && (
          <>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm font-mono tracking-widest text-zinc-900 dark:text-zinc-100">{ref.code}</code>
              <GlassButton variant="secondary" onClick={copyRef}>{copied ? "Kopyalandı" : "Kopyala"}</GlassButton>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {ref.referrals} davet · <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{ref.earnedMonths} ay</span> kazandın
            </p>
            {!ref.appliedCode && (
              <div className="flex gap-2 pt-1">
                <input
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") applyRef(); }}
                  placeholder="Davet eden kodu"
                  className="flex-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm tracking-wider text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <GlassButton variant="primary" onClick={applyRef} disabled={!refInput.trim()}>Uygula</GlassButton>
              </div>
            )}
            {refMsg && (
              <p className={`text-sm ${refMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{refMsg.text}</p>
            )}
          </>
        )}
      </GlassCard>

      {/* Persona kaydedildi toast */}
      {personaSaved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl">
          ✓ Persona kaydedildi
        </div>
      )}

      {/* Ayda-bir kuralı popup */}
      {lockOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setLockOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 p-6 shadow-2xl text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-xl">🗓️</div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Persona ayda bir kez değişir</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Persona&apos;nı {daysSince === Infinity ? "yakın zamanda" : `${daysSince} gün önce`} güncelledin. Kişisel stratejinin tutarlı kalması ve modelin senin sesini doğru öğrenebilmesi için sık değişiklik önermiyoruz — çünkü her değişiklik içerik üretim kalitesini ciddi biçimde düşürür.
            </p>
            {nextEditDate && <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Tekrar düzenleme: {nextEditDate}</p>}
            <GlassButton variant="primary" onClick={() => setLockOpen(false)}>Anladım</GlassButton>
          </div>
        </div>
      )}
    </div>
  );
}
