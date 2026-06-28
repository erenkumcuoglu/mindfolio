"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useLocale } from "@/lib/use-locale";

type Step = "idle" | "confirm" | "deleting" | "done";
type ResetStep = "idle" | "resetting" | "done";

export default function SettingsPage() {
  const tt = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  // Delete account
  const handleDelete = async () => {
    setStep("deleting");
    setError(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setStep("confirm");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setChangingPassword(true);
    setPasswordMsg(null);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPasswordMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Account Deleted
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          Your account and all associated data have been permanently deleted.
        </p>
      </div>
    );
  }

  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const isDeleting = step === "deleting";

  const handleResetPersona = async () => {
    setResetStep("resetting");
    try {
      const res = await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {},
          onboarding_complete: false,
          name: "",
          description: "",
          voice: "",
        }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setResetStep("done");
    } catch {
      setResetStep("idle");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your account and security
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200/60 dark:border-red-800/40 bg-red-50/90 dark:bg-red-950/90 backdrop-blur-xl p-4 animate-slide-up">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Change password */}
      <GlassCard className="p-6 space-y-4" hover>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-lg shrink-0">
            🔑
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Change Password
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Update your account password
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={tt.currentPwPh}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={tt.newPwPh}
            className="w-full rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/50 dark:bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />

          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.includes("successfully") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {passwordMsg}
            </p>
          )}

          <GlassButton
            variant="primary"
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword}
          >
            {changingPassword ? "Changing..." : "Change password"}
          </GlassButton>
        </div>
      </GlassCard>

      {/* Reset persona — dev action */}
      <GlassCard className="p-6 space-y-4" hover>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-lg shrink-0">
            ✦
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Writing Persona
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {resetStep === "done"
                ? "Persona reset. Go through onboarding again to create a new one."
                : "Rerun the onboarding wizard to rebuild your persona."}
            </p>
          </div>
        </div>

        {resetStep !== "done" && (
          <GlassButton
            variant="secondary"
            onClick={handleResetPersona}
            disabled={resetStep === "resetting"}
          >
            {resetStep === "resetting" ? "Resetting..." : "Reset persona"}
          </GlassButton>
        )}

        {resetStep === "done" && (
          <GlassButton
            variant="primary"
            onClick={() => router.push("/onboarding")}
          >
            Start onboarding
          </GlassButton>
        )}
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="p-6 space-y-4 border-red-200/60 dark:border-red-800/40" hover>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-lg shrink-0">
            ⚠
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Danger Zone
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Permanently delete your account and all data
            </p>
          </div>
        </div>

        {step === "confirm" ? (
          <div className="space-y-4 rounded-xl border border-red-200/60 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/50 p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              This action is <strong>permanent and cannot be undone</strong>.
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
              <li>{tt.delLi1}</li>
              <li>{tt.delLi2}</li>
              <li>{tt.delLi3}</li>
              <li>{tt.delLi4}</li>
              <li>{tt.delLi5}</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <GlassButton variant="ghost" onClick={() => setStep("idle")}>
                Cancel
              </GlassButton>
              <GlassButton
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="!text-red-600 dark:!text-red-400 !border-red-200/60 dark:!border-red-800/40 hover:!bg-red-100 dark:hover:!bg-red-900"
              >
                {isDeleting ? "Deleting..." : "Yes, permanently delete my account"}
              </GlassButton>
            </div>
          </div>
        ) : (
          <GlassButton
            variant="ghost"
            onClick={() => setStep("confirm")}
            className="!text-red-600 dark:!text-red-400 !border-red-200/60 dark:!border-red-800/40 hover:!bg-red-50 dark:hover:!bg-red-950"
          >
            Delete my account
          </GlassButton>
        )}
      </GlassCard>
    </div>
  );
}
