import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { NpsPrompt } from "@/components/ui/NpsPrompt";
import { AppHeader } from "@/components/AppHeader";
import { IslandTabBar } from "@/components/app/IslandTabBar";

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
    // Mobile-first: full-bleed on phones. On wider screens the app is shown as a
    // centered, side-framed mobile column so desktop browsers aren't stretched.
    <div className="min-h-screen bg-zinc-200/50 dark:bg-black/60">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-zinc-50 dark:bg-zinc-950 md:border-x md:border-zinc-200/70 md:dark:border-zinc-800/60 md:shadow-2xl">
        <AppHeader />
        <main className="px-4 pt-6 pb-28">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <NpsPrompt />
      </div>
      <IslandTabBar />
    </div>
  );
}
