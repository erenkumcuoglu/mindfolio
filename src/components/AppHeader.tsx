import { ProfileMenu } from "@/components/ProfileMenu";
import { ThemeToggle } from "@/components/app/ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="/studio" className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect width="26" height="26" rx="6.5" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.22)" strokeWidth="1" />
            <rect x="1.5" y="10.5" width="2" height="5" rx="1" fill="#10b981" opacity=".55" />
            <rect x="4.5" y="6.5" width="2" height="13" rx="1" fill="#10b981" opacity=".85" />
            <rect x="7.5" y="5" width="2" height="16" rx="1" fill="#10b981" />
            <rect x="10.5" y="7" width="2" height="12" rx="1" fill="#10b981" opacity=".7" />
            <rect x="15" y="9.5" width="7" height="1.7" rx=".85" fill="currentColor" opacity=".5" />
            <rect x="15" y="12.5" width="8.5" height="1.7" rx=".85" fill="currentColor" opacity=".42" />
            <rect x="15" y="15.5" width="5.5" height="1.7" rx=".85" fill="currentColor" opacity=".34" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">mindfolio</span>
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
