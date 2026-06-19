"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

export default function BillingPage() {
  const [usage, setUsage] = useState<{
    daily: { current: number; limit: number };
    monthly: { current: number; limit: number };
  } | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/usage").then((r) => r.json()).catch(() => null),
      fetch("/api/personas").then((r) => r.json()).catch(() => null),
    ]).then(([usageData, personaData]) => {
      if (usageData) setUsage(usageData);
      if (personaData?.profile?.subscription?.active) {
        setSubscribed(true);
      }
      setLoading(false);
    });
  }, []);

  const handleMockUpgrade = async () => {
    setSubscribing(true);
    try {
      await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            active: true,
            plan: "monthly",
            mock: true,
            subscribed_at: new Date().toISOString(),
          },
        }),
      });
      setSubscribed(true);
    } catch {
      // still succeed in mock mode
      setSubscribed(true);
    }
    setSubscribing(false);
  };

  const handleMockCancel = async () => {
    await fetch("/api/personas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          active: false,
          plan: "monthly",
          mock: true,
          canceled_at: new Date().toISOString(),
        },
      }),
    });
    setSubscribed(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Kullanım & Abonelik
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Planın ve aylık kullanımın
        </p>
      </div>

      {/* Plan card */}
      <GlassCard className="p-6 space-y-4" hover>
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg shrink-0 ${
            subscribed
              ? "bg-emerald-100 dark:bg-emerald-950"
              : "bg-zinc-100 dark:bg-zinc-800"
          }`}>
            {subscribed ? "💎" : "◇"}
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {loading ? "..." : subscribed ? "Premium Plan" : "Ücretsiz Plan"}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {loading
                ? ""
                : subscribed
                ? "$19/ay · Aktif"
                : "Şu anda ücretsiz plandasın."}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 p-4 space-y-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Günlük limit: <strong className="text-zinc-700 dark:text-zinc-300">{usage?.daily.current ?? "—"} / {usage?.daily.limit ?? "—"}</strong>
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aylık limit: <strong className="text-zinc-700 dark:text-zinc-300">{usage?.monthly.current ?? "—"} / {usage?.monthly.limit ?? "—"}</strong>
          </p>
        </div>

        {loading ? (
          <div className="h-10 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
        ) : subscribed ? (
          <div className="flex gap-2">
            <GlassButton variant="primary" className="flex-1" disabled>
              ✅ Premium Aktif
            </GlassButton>
            <GlassButton variant="ghost" onClick={handleMockCancel}>
              İptal Et
            </GlassButton>
          </div>
        ) : (
          <GlassButton
            variant="primary"
            className="w-full"
            onClick={handleMockUpgrade}
            disabled={subscribing}
          >
            {subscribing ? "Hazırlanıyor..." : "Premium'a Yükselt — $19/ay"}
          </GlassButton>
        )}

        <p className="text-xs text-zinc-400">
          {subscribed
            ? "Bu bir mock aboneliğidir. Gerçek ödeme entegrasyonu çok yakında."
            : "Premium ile tam strateji, sınırsız düzenleme ve sesli üretimin kilidini aç."}
        </p>
      </GlassCard>

      {/* Feature comparison */}
      <GlassCard className="p-6 space-y-4" hover>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-lg shrink-0">
            📊
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Plan Karşılaştırması
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ücretsiz ve Premium arasındaki farklar
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            ["Teaser Persona (6 soru)", "✅", "✅"],
            ["Konumlandırma Stratejisi", "—", "✅"],
            ["İçerik Pillar'ları (3-5)", "—", "✅"],
            ["Ses Profili + Farklılaşma", "—", "✅"],
            ["Örnek Post", "—", "✅"],
            ["Yayın Takvimi Önerisi", "—", "✅"],
            ["Sesli + Yazılı Üretim", "✅", "✅"],
            ["Sınırsız Düzenleme", "✅", "✅"],
            ["Fiyat", "Ücretsiz", "$19/ay"],
          ].map(([feature, free, premium]) => (
            <div
              key={feature}
              className="grid grid-cols-[1fr_60px_60px] gap-2 text-xs py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              <span className="text-zinc-700 dark:text-zinc-300">{feature}</span>
              <span className={`text-center ${free === "✅" ? "text-emerald-500" : "text-zinc-400"}`}>{free}</span>
              <span className={`text-center ${premium === "✅" ? "text-emerald-500" : "text-zinc-400"}`}>{premium}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Invoices skeleton */}
      <GlassCard className="p-6 space-y-4" hover>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-lg shrink-0">
            📄
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Faturalar
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Faturalarını görüntüle ve indir
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/40 p-8 text-center">
          <p className="text-sm text-zinc-400">
            Henüz fatura yok. Premium&apos;a yükselttiğinde faturaların burada görünecek.
          </p>
        </div>
      </GlassCard>

      {/* Stripe footer */}
      <p className="text-[10px] text-zinc-300 dark:text-zinc-600 text-center">
        Bu bir mock abonelik akışıdır. Gerçek Stripe entegrasyonu ileride gelecek.
        Hiçbir kart bilgisi işlenmez veya saklanmaz.
      </p>
    </div>
  );
}
