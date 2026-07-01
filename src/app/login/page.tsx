"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/app/ThemeToggle";

type View = "login" | "verify" | "sent" | "reset-sent";
type AuthStep = "welcome" | "email";

const BTN_BASE =
  "flex w-full items-center justify-center gap-2.5 rounded-[14px] py-[14px] text-[15px] font-semibold transition-colors";

function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect width="26" height="26" rx="6.5" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.22)" strokeWidth="1" />
      <rect x="1.5" y="10.5" width="2" height="5" rx="1" fill="#10b981" opacity=".55" />
      <rect x="4.5" y="6.5" width="2" height="13" rx="1" fill="#10b981" opacity=".85" />
      <rect x="7.5" y="5" width="2" height="16" rx="1" fill="#10b981" />
      <rect x="10.5" y="7" width="2" height="12" rx="1" fill="#10b981" opacity=".7" />
      <rect x="15" y="9.5" width="7" height="1.7" rx=".85" fill="currentColor" opacity=".5" />
      <rect x="15" y="12.5" width="8.5" height="1.7" rx=".85" fill="currentColor" opacity=".42" />
      <rect x="15" y="15.5" width="5.5" height="1.7" rx=".85" fill="currentColor" opacity=".34" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("login");
  const [authStep, setAuthStep] = useState<AuthStep>("welcome");
  const [pendingEmail, setPendingEmail] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "email_not_confirmed") {
          setPendingEmail(data.email || email);
          setView("verify");
          return;
        }
        if (data.error === "beta_only") {
          setError(
            "Mindfolio şu an kapalı betada. Davet almak için kaydolun: https://mindfolio.app/waitlist"
          );
          return;
        }
        setError(data.error);
        return;
      }

      router.push("/studio");
      router.refresh();
    } catch {
      setError("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      setView("sent");
    } catch {
      setError("Tekrar gönderilemedi. Lütfen yeniden dene.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Önce e-posta adresini gir");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setView("reset-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sıfırlama e-postası gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  function signInWith(provider: "google" | "apple") {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const AppleButton = (
    <button
      type="button"
      onClick={() => signInWith("apple")}
      className={`${BTN_BASE} bg-zinc-900 text-white dark:bg-white dark:text-zinc-900`}
    >
      <svg width="15" height="18" viewBox="0 0 15 18" fill="currentColor" aria-hidden="true">
        <path d="M12.6 9.5c0-1.9 1.6-2.9 1.7-2.9a3.7 3.7 0 00-2.9-1.5c-1.2-.1-2.4.7-3 .7s-1.5-.7-2.5-.6C4.3 5.2 2.9 6.1 2.1 7.5 .5 10.4 1.7 14.7 3.2 17.1c.8 1.2 1.7 2.5 2.9 2.4 1.2-.1 1.6-.8 3-.8s1.8.8 3 .8c1.3 0 2.1-1.2 2.8-2.4.9-1.4 1.3-2.7 1.3-2.8s-2.7-1-2.6-3.8zM10.3 3.4c.6-.8 1-1.8 1-2.9-.9.1-2 .7-2.6 1.5-.6.7-1.1 1.8-.9 2.8.9 0 1.9-.6 2.5-1.4z" />
      </svg>
      Apple ile devam et
    </button>
  );

  const GoogleButton = (
    <button
      type="button"
      onClick={() => signInWith("google")}
      className={`${BTN_BASE} border border-zinc-200/70 dark:border-zinc-700/50 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-xl text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800`}
    >
      <svg viewBox="0 0 48 48" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M47 24.5c0-1.6-.2-3.1-.4-4.5H24v9h13c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7.1-10.4 7.1-17.7z" />
        <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
      </svg>
      Google ile devam et
    </button>
  );

  const screenWrap =
    "relative flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10";

  if (view === "verify" || view === "sent") {
    return (
      <div className={screenWrap}>
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200/70 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl p-8 shadow-xl text-center animate-fade-in">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-2xl mb-4">✉</div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            {view === "sent" ? "E-posta gönderildi" : "E-postanı doğrula"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {view === "sent"
              ? "Yeni bir doğrulama e-postası gönderildi."
              : `${pendingEmail} adresine doğrulama bağlantısı gönderdik. Bağlantıya tıklayıp hesabını aktive et, sonra giriş yap.`}
          </p>
          {view === "verify" && (
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors mb-3"
            >
              {loading ? "Gönderiliyor..." : "Doğrulama e-postasını tekrar gönder"}
            </button>
          )}
          <button
            onClick={() => setView("login")}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Girişe dön
          </button>
        </div>
      </div>
    );
  }

  if (view === "reset-sent") {
    return (
      <div className={screenWrap}>
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200/70 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl p-8 shadow-xl text-center animate-fade-in">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-2xl mb-4">✓</div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">E-postanı kontrol et</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {email} için bir hesap varsa, şifre sıfırlama bağlantısı gönderdik.
          </p>
          <button
            onClick={() => { setView("login"); setError(""); }}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Girişe dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={screenWrap}>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-sm">
        {authStep === "welcome" ? (
          <div className="animate-fade-in text-zinc-900 dark:text-zinc-50">
            {/* Top zone — floating social cards (AI yazıyor ÜSTTE) */}
            <div className="relative h-[160px] mb-2">
              <style>{`
                @keyframes lg-bar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
                @keyframes lg-floatA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes lg-floatC { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
              `}</style>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 shadow-md backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">AI yazıyor</span>
                <span className="flex items-end gap-0.5 h-3.5">
                  {[0, 0.12, 0.24].map((d, i) => (
                    <span
                      key={i}
                      className="inline-block w-0.5 bg-emerald-500 origin-bottom"
                      style={{ height: "100%", animation: `lg-bar 0.72s ease-in-out ${d}s infinite alternate` }}
                    />
                  ))}
                </span>
              </div>
              <div
                className="absolute bottom-1 left-2 w-[132px] rounded-2xl border border-black/[0.06] dark:border-white/[0.09] bg-white/85 dark:bg-white/[0.054] px-3 py-2.5 flex items-center gap-2.5 backdrop-blur"
                style={{ animation: "lg-floatA 2.6s ease-in-out infinite" }}
              >
                <span className="text-[15px] font-bold text-[#0a66c2]">in</span>
                <div className="space-y-1.5">
                  <span className="block h-1 w-12 rounded-full bg-zinc-300 dark:bg-white/15" />
                  <span className="block h-1 w-8 rounded-full bg-zinc-300 dark:bg-white/15" />
                </div>
              </div>
              <div
                className="absolute bottom-1 right-2 w-[132px] rounded-2xl border border-black/[0.06] dark:border-white/[0.09] bg-white/85 dark:bg-white/[0.054] px-3 py-2.5 flex items-center gap-2.5 backdrop-blur"
                style={{ animation: "lg-floatC 3s ease-in-out 0.4s infinite" }}
              >
                <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">X</span>
                <div className="space-y-1.5">
                  <span className="block h-1 w-10 rounded-full bg-zinc-300 dark:bg-white/15" />
                  <span className="block h-1 w-6 rounded-full bg-zinc-300 dark:bg-white/15" />
                </div>
              </div>
            </div>

            {/* Middle — büyük logo (aşağı alındı, büyütüldü) + revize başlık + alt yazı */}
            <div className="flex flex-col items-center text-center mb-7">
              <BrandLogo size={72} />
              <p className="mt-3 text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">mindfolio</p>
              <h1 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-[-1px]">
                Fikirlerini dünyayla paylaş.
              </h1>
              <p className="mt-3 text-[14px] leading-[1.55] text-zinc-500 dark:text-zinc-400 max-w-[320px]">
                Stratejini oluştur, konuşarak anlat, Mindfolio senin elinden çıkmış bir içerik haline getirsin.
              </p>
            </div>

            <div className="space-y-2.5">
              {AppleButton}
              {GoogleButton}
            </div>

            <div className="my-3 flex items-center gap-2.5">
              <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-700/60" />
              <span className="text-xs text-zinc-400">veya</span>
              <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-700/60" />
            </div>

            <button
              type="button"
              onClick={() => setAuthStep("email")}
              className={`${BTN_BASE} border border-zinc-200/70 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50`}
            >
              <svg width="16" height="13" viewBox="0 0 20 16" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1 4l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              E-posta ile devam et
            </button>

            <p className="mt-4 text-center text-[13px] text-zinc-400">
              Zaten hesabın var mı?{" "}
              <button
                type="button"
                onClick={() => setAuthStep("email")}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Giriş yap
              </button>
            </p>
          </div>
        ) : (
          <div className="animate-fade-in rounded-2xl border border-zinc-200/70 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl p-7 shadow-xl">
            <button
              type="button"
              onClick={() => { setAuthStep("welcome"); setError(""); }}
              className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              ← Geri
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
              Giriş yap
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              E-posta ve şifrenle devam et
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  E-posta
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500/50"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Beni hatırla</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Şifremi unuttum
                </button>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş yap"}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200/80 dark:border-zinc-700/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">veya</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {GoogleButton}
              {AppleButton}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
