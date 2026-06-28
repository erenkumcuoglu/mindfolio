"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { ThemeToggle } from "@/components/app/ThemeToggle";

interface Stats { total: number; recent: number; paying: number; }
interface UserRow {
  id: string; email: string; name: string | null; created_at: string; last_sign_in: string | null;
  confirmed: boolean; pro: boolean; expires_at: string | null; persona: boolean;
  contentCount: number; ideasCount: number; draftsCount: number; redemptions: number;
}
interface CodeRow { id: string; code: string; kind: "one_time" | "multi"; max_uses: number | null; uses: number; duration_days: number; active: boolean; created_at: string; }
interface ErrEvent { id: string; created_at: string; message: string | null; context: string | null; user_id: string | null; seen: boolean; }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

const METRIC_CHIP = ["bg-blue-100 dark:bg-blue-950/60", "bg-emerald-100 dark:bg-emerald-950/60", "bg-violet-100 dark:bg-violet-950/60"];

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [errors, setErrors] = useState<ErrEvent[]>([]);
  const [unseenErrors, setUnseenErrors] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [kind, setKind] = useState<"one_time" | "multi">("multi");
  const [duration, setDuration] = useState(90);
  const [maxUses, setMaxUses] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users ?? [])).catch(() => {});
  }, []);
  const loadCodes = useCallback(() => {
    fetch("/api/admin/codes").then((r) => r.json()).then((d) => setCodes(d.codes ?? [])).catch(() => {});
  }, []);
  const loadStats = useCallback(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);
  const loadErrors = useCallback(() => {
    fetch("/api/admin/errors").then((r) => r.json()).then((d) => {
      setErrors(d.events ?? []);
      setUnseenErrors(d.unseen ?? 0);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadStats(); loadUsers(); loadCodes(); loadErrors(); }, [loadStats, loadUsers, loadCodes, loadErrors]);

  const markErrorsSeen = async () => {
    await fetch("/api/admin/errors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
    loadErrors();
  };

  const createCode = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: customCode.trim() || undefined, kind, duration_days: duration, max_uses: kind === "multi" && maxUses.trim() ? Number(maxUses) : null }),
      });
      if (res.ok) { setCustomCode(""); setMaxUses(""); loadCodes(); }
    } finally { setCreating(false); }
  };
  const toggleCode = async (id: string, active: boolean) => {
    await fetch("/api/admin/codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
    loadCodes();
  };
  const userAction = async (userId: string, action: "reset_password" | "grant_pro" | "freeze") => {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/user-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action }) });
      const d = await res.json();
      if (res.ok) { loadUsers(); loadStats(); }
      setToast(d.message || d.error || "Tamam");
      setTimeout(() => setToast(null), 3000);
    } finally { setActionBusy(false); }
  };

  const metrics = [
    { label: "Toplam Kullanıcı", value: stats?.total, icon: "👥" },
    { label: "Pro Üye", value: stats?.paying, icon: "💎" },
    { label: "Son 7 Gün Kayıt", value: stats?.recent, icon: "📈" },
  ];

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 shadow-2xl">
          {toast}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">mindfolio · admin</span>
            {unseenErrors > 0 && (
              <a href="#kritik-hatalar" className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
                ⚠ {unseenErrors} hata
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/studio" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Uygulama</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {metrics.map((m, i) => (
            <div key={m.label} className="flex items-start justify-between rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/60 p-4">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{m.value ?? "—"}</p>
              </div>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg ${METRIC_CHIP[i]}`}>{m.icon}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kullanıcı adı veya e-posta ile ara…"
          className="w-full rounded-2xl border border-zinc-200/70 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/60 px-5 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />

        {/* Users */}
        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <th className="py-3 px-4 font-medium">Kullanıcı</th>
                  <th className="py-3 px-4 font-medium">User ID</th>
                  <th className="py-3 px-4 font-medium">Plan</th>
                  <th className="py-3 px-4 font-medium">Kayıt</th>
                  <th className="py-3 px-4 font-medium">Son Giriş</th>
                  <th className="py-3 px-4 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UserRows key={u.id} u={u} expanded={expanded === u.id} onToggle={() => setExpanded(expanded === u.id ? null : u.id)} onAction={userAction} busy={actionBusy} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-zinc-400">Kullanıcı yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Critical errors */}
        <GlassCard className="p-5 space-y-3" hover={false}>
          <div id="kritik-hatalar" className="flex items-center justify-between scroll-mt-20">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Kritik Hatalar {unseenErrors > 0 && <span className="ml-1 text-red-600 dark:text-red-400">({unseenErrors} yeni)</span>}
            </h2>
            {unseenErrors > 0 && (
              <GlassButton variant="ghost" onClick={markErrorsSeen}>Tümünü okundu işaretle</GlassButton>
            )}
          </div>
          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {errors.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${e.seen ? "bg-zinc-300 dark:bg-zinc-700" : "bg-red-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-800 dark:text-zinc-200 truncate" title={e.message ?? ""}>{e.message ?? "—"}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {e.context ?? "—"} · {new Date(e.created_at).toLocaleString("tr-TR")}{e.user_id ? ` · ${e.user_id.slice(0, 8)}…` : ""}
                  </p>
                </div>
              </div>
            ))}
            {errors.length === 0 && <p className="py-3 text-sm text-zinc-400">Kayıtlı hata yok. 🎉</p>}
          </div>
        </GlassCard>

        {/* Create code */}
        <GlassCard className="p-5 space-y-4" hover={false}>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Yeni Kod Üret</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Tip</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as "one_time" | "multi")} className="rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                <option value="multi">Çok kullanım</option>
                <option value="one_time">Tek kullanım</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Süre (gün)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-24 rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100" />
            </div>
            {kind === "multi" && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Maks. kullanım</label>
                <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="sınırsız" className="w-28 rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400" />
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Özel kod (ops.)</label>
              <input value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} placeholder="OTOMATİK" className="w-36 rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm tracking-wider text-zinc-900 dark:text-zinc-100 placeholder-zinc-400" />
            </div>
            <GlassButton variant="primary" onClick={createCode} disabled={creating}>{creating ? "..." : "Üret"}</GlassButton>
          </div>
          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {codes.map((cd) => (
              <div key={cd.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="font-mono font-semibold tracking-wider text-zinc-900 dark:text-zinc-50 w-28">{cd.code}</span>
                <span className="text-xs text-zinc-500 w-24">{cd.kind === "one_time" ? "Tek kullanım" : "Çok kullanım"}</span>
                <span className="text-xs text-zinc-500 w-20">{cd.duration_days} gün</span>
                <span className="text-xs text-zinc-500 flex-1">{cd.uses}{cd.max_uses != null ? `/${cd.max_uses}` : ""} kullanım</span>
                <button onClick={() => toggleCode(cd.id, !cd.active)} className={`text-xs px-2.5 py-1 rounded-full ${cd.active ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"}`}>{cd.active ? "Aktif" : "Pasif"}</button>
              </div>
            ))}
            {codes.length === 0 && <p className="py-3 text-sm text-zinc-400">Henüz kod yok.</p>}
          </div>
        </GlassCard>
      </main>
    </div>
  );
}

function PlanBadge({ pro }: { pro: boolean }) {
  return pro ? (
    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">Pro</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">Ücretsiz</span>
  );
}

function UserRows({ u, expanded, onToggle, onAction, busy }: {
  u: UserRow; expanded: boolean; onToggle: () => void;
  onAction: (id: string, a: "reset_password" | "grant_pro" | "freeze") => void; busy: boolean;
}) {
  const initials = (u.name || u.email || "?").slice(0, 2).toUpperCase();
  return (
    <>
      <tr onClick={onToggle} className={`cursor-pointer border-b border-zinc-100/60 dark:border-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 ${expanded ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}`}>
        <td className="py-3 px-4">
          <p className="font-medium text-emerald-700 dark:text-emerald-300">{u.name}</p>
          <p className="text-xs text-zinc-400">{u.email}</p>
        </td>
        <td className="py-3 px-4 font-mono text-xs text-zinc-400">{u.id.slice(0, 8)}…</td>
        <td className="py-3 px-4"><PlanBadge pro={u.pro} /></td>
        <td className="py-3 px-4 text-zinc-500">{fmt(u.created_at)}</td>
        <td className="py-3 px-4 text-zinc-500">{fmt(u.last_sign_in)}</td>
        <td className="py-3 px-4">
          {u.confirmed ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Aktif</span>
            : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">Doğrulanmadı</span>}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-emerald-50/30 dark:bg-emerald-950/10">
          <td colSpan={6} className="px-4 pb-5 pt-1">
            <div className="flex items-center gap-3 py-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">{initials}</div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">{u.name}</p>
                <p className="text-xs text-zinc-500">{u.email}</p>
              </div>
              <div className="ml-auto"><PlanBadge pro={u.pro} /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 p-4">
                <p className="text-xs font-semibold text-zinc-500 mb-2">● Plan Bilgileri</p>
                <Row k="Plan Türü" v={<PlanBadge pro={u.pro} />} />
                <Row k="Kayıt Tarihi" v={fmt(u.created_at)} />
                <Row k="Son Giriş" v={fmt(u.last_sign_in)} />
                {u.pro && <Row k="Bitiş" v={fmt(u.expires_at)} />}
              </div>
              <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 p-4">
                <p className="text-xs font-semibold text-zinc-500 mb-2">● Aktivite Özeti</p>
                <Row k="Persona üretildi" v={u.persona ? "Evet" : "Hayır"} />
                <Row k="Üretilen içerik" v={String(u.contentCount)} />
                <Row k="Taslak içerik" v={String(u.draftsCount)} />
                <Row k="Kaydedilen fikir" v={String(u.ideasCount)} />
                <Row k="Kod kullanımı" v={String(u.redemptions)} />
              </div>
            </div>

            <p className="text-xs font-semibold text-zinc-500 mt-4 mb-2">● Admin Ayarları</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => onAction(u.id, "reset_password")} className="px-3 py-2 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">🔑 Şifre Sıfırlama</button>
              <button disabled={busy} onClick={() => onAction(u.id, "grant_pro")} className="px-3 py-2 rounded-xl text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">💎 Pro Yap</button>
              <button disabled={busy} onClick={() => onAction(u.id, "freeze")} className="px-3 py-2 rounded-xl text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">⏸ Üyeliği Dondur</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">{k}</span>
      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{v}</span>
    </div>
  );
}
