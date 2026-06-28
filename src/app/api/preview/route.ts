import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";
import { detectPlatform } from "@/lib/platform";
import type { Platform, LinkPreview } from "@/lib/platform";
import { corsHeaders, corsPreflight } from "@/lib/cors";

const bodySchema = z.object({
  url: z.string().url().max(2000),
});

export type { Platform, LinkPreview };

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return reply({ error: "Invalid URL", details: parsed.error.flatten() }, 400);
    }

    const url = parsed.data.url;
    const hostname = new URL(url).hostname.toLowerCase();
    const platform = detectPlatform(hostname);

    if (platform === "youtube") {
      const preview = await fetchYouTubePreview(url);
      if (preview) return reply({ preview });
    }

    if (platform === "twitter") {
      const preview = await fetchOGPreview(url, "twitter");
      if (preview) return reply({ preview });
    }

    const preview = await fetchOGPreview(url, platform);
    if (!preview) {
      return reply({ error: "Could not extract preview" }, 422);
    }

    return reply({ preview });
  } catch (error) {
    logError({ error, context: "POST /api/preview" });
    return reply({ error: GENERIC_ERROR_MESSAGE }, 500);
  }
}

async function fetchYouTubePreview(url: string): Promise<LinkPreview | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      title: data.title || "",
      description: data.author_name
        ? `By ${data.author_name} on YouTube`
        : "",
      image: data.thumbnail_url || "",
      favicon: "https://www.youtube.com/favicon.ico",
      site_name: "YouTube",
      author: data.author_name || "",
      url,
      platform: "youtube",
    };
  } catch {
    return null;
  }
}

async function fetchOGPreview(url: string, platform: Platform): Promise<LinkPreview | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MindfolioBot/1.0; +https://mindfolio.app)",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const getMeta = (property: string): string => {
      const patterns = [
        new RegExp(
          `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
          "i"
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
          "i"
        ),
        new RegExp(
          `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`,
          "i"
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`,
          "i"
        ),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1]!;
      }
      return "";
    };

    const title =
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
      "";

    const description =
      getMeta("og:description") ||
      getMeta("twitter:description") ||
      getMeta("description") ||
      "";

    const image =
      getMeta("og:image") ||
      getMeta("twitter:image") ||
      getMeta("twitter:image:src") ||
      "";

    const favicon =
      html.match(
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i
      )?.[1] ||
      html.match(
        /<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:shortcut )?icon["']/i
      )?.[1] ||
      `${new URL(url).origin}/favicon.ico`;

    const site_name =
      getMeta("og:site_name") || new URL(url).hostname.replace("www.", "");
    const author =
      getMeta("og:author") ||
      getMeta("twitter:creator") ||
      getMeta("article:author") ||
      "";

    if (!title) return null;

    return {
      title: decodeHTMLEntities(title),
      description: decodeHTMLEntities(description),
      image,
      favicon: resolveUrl(favicon, url),
      site_name,
      author,
      url,
      platform,
    };
  } catch {
    return null;
  }
}

function resolveUrl(src: string, base: string): string {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  return new URL(src, base).href;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}
