"use client";

import { usePathname } from "next/navigation";

interface NavTab {
  href: string;
  label: string;
  match: RegExp;
}

const tabs: NavTab[] = [
  { href: "/studio", label: "Studio", match: /^\/studio/ },
  { href: "/content", label: "Content", match: /^\/content/ },
  { href: "/ideas", label: "Ideas", match: /^\/ideas/ },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((tab) => (
        <a
          key={tab.href}
          href={tab.href}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            tab.match.test(pathname)
              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
