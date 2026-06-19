import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { NpsPrompt } from "@/components/ui/NpsPrompt";
import { AppHeader } from "@/components/AppHeader";

const skipEmails = (process.env.SKIP_ONBOARDING_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email_confirmed_at) {
    redirect("/verify-email");
  }

  const userEmail = user.email?.toLowerCase() ?? "";
  const skipOnboarding = skipEmails.includes(userEmail);

  if (!skipOnboarding) {
    const persona = await supabase
      .from("personas")
      .select("onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!persona.data?.onboarding_complete) {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <NpsPrompt />
    </div>
  );
}
