export type Platform = "youtube" | "twitter" | "facebook" | "instagram" | "linkedin" | "github" | "web";

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  favicon: string;
  site_name: string;
  author: string;
  url: string;
  platform: Platform;
}

export function detectPlatform(hostname: string): Platform {
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
  if (hostname === "x.com" || hostname.includes("twitter.com")) return "twitter";
  if (hostname.includes("facebook.com") || hostname.includes("fb.com")) return "facebook";
  if (hostname.includes("instagram.com")) return "instagram";
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("github.com")) return "github";
  return "web";
}

export function detectPlatformFromUrl(url: string | null): Platform {
  if (!url) return "web";
  try {
    return detectPlatform(new URL(url).hostname.toLowerCase());
  } catch {
    return "web";
  }
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  github: "GitHub",
  web: "Web",
};

export const PLATFORM_STYLES: Record<Platform, string> = {
  youtube: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
  twitter: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
  facebook: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
  instagram: "bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400",
  linkedin: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
  github: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  web: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
};
