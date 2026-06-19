"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const handleResend = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 shadow-xl text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-2xl mb-4">
            ✉
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            Verify your email
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {email
              ? `We sent a confirmation link to ${email}. Click the link to activate your account.`
              : "Check your inbox for the confirmation link."}
          </p>

          {sent ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
              Confirmation email resent!
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors mb-3"
            >
              {loading ? "Sending..." : "Resend confirmation email"}
            </button>
          )}

          <button
            onClick={() => router.push("/login")}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
