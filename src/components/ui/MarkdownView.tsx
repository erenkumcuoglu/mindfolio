import { Fragment, type ReactNode } from "react";

/** Inline: **bold**, __bold__, *italic*, _italic_. */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g)
    .filter(Boolean)
    .map((tok, i) => {
      if ((tok.startsWith("**") && tok.endsWith("**")) || (tok.startsWith("__") && tok.endsWith("__"))) {
        return <strong key={i} className="font-bold text-zinc-900 dark:text-zinc-50">{tok.slice(2, -2)}</strong>;
      }
      if ((tok.startsWith("*") && tok.endsWith("*")) || (tok.startsWith("_") && tok.endsWith("_"))) {
        return <em key={i}>{tok.slice(1, -1)}</em>;
      }
      return <Fragment key={i}>{tok}</Fragment>;
    });
}

/** Minimal Markdown renderer mirroring the mobile draft view. */
export function MarkdownView({ text }: { text: string }) {
  const lines = (text ?? "").replace(/\r/g, "").split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-2" />;
        const h = line.match(/^(#{1,6})\s+(.*)$/);
        if (h) {
          const lvl = h[1].length;
          const cls = lvl <= 1 ? "text-xl font-bold" : lvl === 2 ? "text-lg font-bold" : "text-base font-semibold";
          return <p key={i} className={`${cls} text-zinc-900 dark:text-zinc-50 mt-1`}>{inline(h[2])}</p>;
        }
        if (/^>\s?/.test(line)) {
          return <blockquote key={i} className="border-l-2 border-emerald-500 pl-3 italic text-zinc-600 dark:text-zinc-300">{inline(line.replace(/^>\s?/, ""))}</blockquote>;
        }
        if (/^Başlık\s*\d+\s*:/i.test(line)) {
          return <p key={i} className="font-bold text-emerald-700 dark:text-emerald-400">{line}</p>;
        }
        if (/^[-*•]\s+/.test(line)) {
          return <p key={i} className="pl-3">• {inline(line.replace(/^[-*•]\s+/, ""))}</p>;
        }
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
