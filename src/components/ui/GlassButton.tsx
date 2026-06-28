import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600/20 shadow-emerald-600/30",
  secondary:
    "bg-white/70 dark:bg-zinc-800/70 hover:bg-white/90 dark:hover:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border-zinc-200/60 dark:border-zinc-700/40",
  ghost:
    "bg-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-transparent",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs rounded-xl",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function GlassButton({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        border backdrop-blur-xl font-medium
        transition-all duration-200
        shadow-sm hover:shadow-md
        active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
