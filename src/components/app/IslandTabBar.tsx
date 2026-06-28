"use client";

import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  match: RegExp;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    href: "/studio",
    label: "Studio",
    match: /^\/studio/,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2a3.5 3.5 0 013.5 3.5v5A3.5 3.5 0 017.5 10.5v-5A3.5 3.5 0 0111 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 10v1a6 6 0 0012 0v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="17" x2="11" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/content",
    label: "Content",
    match: /^\/content/,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h8M7 11h5M7 14h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/ideas",
    label: "Ideas",
    match: /^\/ideas/,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3a5 5 0 015 5c0 2.2-1.3 4.1-3.2 5V16H9.2V13A5 5 0 0111 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.2 16h3.6M9.8 18.5h2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    match: /^\/(profile|persona|settings|billing)/,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 19c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function IslandTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 rounded-[28px] p-[7px]
                 border border-black/[0.06] dark:border-white/[0.06]
                 bg-white/80 dark:bg-black/75 backdrop-blur-2xl
                 shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
    >
      {tabs.map((tab) => {
        const active = tab.match.test(pathname);
        return (
          <a
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 w-[54px] items-center justify-center rounded-[22px] transition-all ${
              active
                ? "bg-white/85 dark:bg-white/[0.12] text-emerald-600 dark:text-emerald-400 shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                : "text-black/35 dark:text-white/45 hover:text-black/60 dark:hover:text-white/70"
            }`}
          >
            {tab.icon}
          </a>
        );
      })}
    </nav>
  );
}
