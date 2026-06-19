"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserInfo {
  email: string;
  displayName: string;
}

export function ProfileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? "",
          displayName: data.user.user_metadata?.display_name ?? data.user.email?.split("@")[0] ?? "",
        });
      }
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = user?.displayName?.charAt(0)?.toUpperCase() ?? "?";

  const links = [
    { href: "/profile", label: "Profile", match: /^\/profile/ },
    { href: "/persona", label: "Persona", match: /^\/persona/ },
    { href: "/settings", label: "Settings", match: /^\/settings/ },
    { href: "/billing", label: "Usage & Billing", match: /^\/billing/ },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          {initial}
        </span>
        <span className="hidden sm:inline truncate max-w-[100px]">
          {user?.displayName ?? "Profile"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-1 shadow-xl animate-fade-in z-50">
          {user && (
            <div className="px-3 py-2 border-b border-zinc-200/60 dark:border-zinc-700/40 mb-1">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50 truncate">
                {user.displayName}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
          )}

          {links.map((link) => {
            const isActive = link.match.test(pathname);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {link.label}
              </a>
            );
          })}

          <div className="border-t border-zinc-200/60 dark:border-zinc-700/40 mt-1 pt-1">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors text-left"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
