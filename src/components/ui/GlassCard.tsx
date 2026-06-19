import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", hover = true, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border border-zinc-200/60 dark:border-zinc-700/40
        bg-white/70 dark:bg-zinc-900/70
        backdrop-blur-xl
        shadow-lg shadow-zinc-900/5
        animate-fade-in
        ${onClick ? "cursor-pointer" : ""}
        ${hover ? "transition-all duration-200 hover:shadow-xl hover:bg-white/80 dark:hover:bg-zinc-900/80 hover:border-zinc-300/60 dark:hover:border-zinc-600/40 hover:-translate-y-0.5" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
