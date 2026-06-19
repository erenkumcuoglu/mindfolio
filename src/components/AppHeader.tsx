import { NavTabs } from "@/app/(app)/nav-tabs";
import { ProfileMenu } from "@/components/ProfileMenu";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <NavTabs />
        <ProfileMenu />
      </div>
    </header>
  );
}
