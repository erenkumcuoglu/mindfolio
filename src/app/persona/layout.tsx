import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AppHeader } from "@/components/AppHeader";

export default async function PersonaLayout({
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
