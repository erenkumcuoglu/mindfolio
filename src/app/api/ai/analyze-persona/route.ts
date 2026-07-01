import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import type { PersonaProfile } from "@/lib/db/personas";

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Opsiyonel bırakıldı — kullanıcı bir çok alanı boş bırakabilir (skip'li adımlar dahil)
const bodySchema = z.object({
  goal: z.string().max(500).optional().default(""),
  field: z.string().max(500).optional().default(""),
  hasContent: z.string().max(10).optional().default(""),
  voiceTraits: z.string().max(1000).optional().default(""),
  audience: z.string().max(1000).optional().default(""),
  positioning: z.string().max(2000).optional().default(""),
  hotTakes: z.string().max(2000).optional().default(""),
  hotTakesDetail: z.string().max(2000).optional().default(""),
  format: z.string().max(500).optional().default(""),
  cadence: z.string().max(500).optional().default(""),
  antiposition: z.string().max(2000).optional().default(""),
  inspiration: z.string().max(2000).optional().default(""),
  linkedinUrl: z.string().max(500).optional(),
  importedContent: z.string().max(50000).optional(),
});

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mindfolio/1.0 (persona analyzer)",
        Accept: "text/html,application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Extract text content from HTML
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
    const desc = html.match(/<meta[^>]+(?:name|property)="(?:description|og:description)"[^>]+content="([^"]+)"[^>]*\/?>/i)?.[1]
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:name|property)="(?:description|og:description)"[^>]*\/?>/i)?.[1]
      ?? "";
    const body = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    return [title, desc, body].filter(Boolean).join("\n\n");
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.warn("[analyze-persona] GEMINI_API_KEY yok — 503 döndürüyorum");
      return reply({ error: "AI service not configured", demo: true }, 503);
    }

    // createClientFromRequest hem cookie hem Authorization: Bearer okur — mobile'dan gelen Bearer için gerekli
    const supabase = await createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return reply({ error: "Unauthorized" }, 401);
    }
    userId = user.id;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.warn("[analyze-persona] Zod validasyonu fail:", parsed.error.flatten());
      return reply({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    }

    // eslint-disable-next-line no-console
    console.info("[analyze-persona] POST başladı — user:", userId, "field:", parsed.data.field, "positioning:", parsed.data.positioning?.slice(0, 60));

    // Fetch imported content if it's a URL
    let importedText = parsed.data.importedContent ?? "";
    let importSource = "user";

    if (importedText.startsWith("http://") || importedText.startsWith("https://")) {
      const fetched = await fetchUrlContent(importedText);
      if (fetched) {
        importedText = fetched;
        importSource = "url";
      }
    }

    const client = new GoogleGenerativeAI(apiKey);
    // Model tercih sırası — 2.5-flash pique zamanı 503 dönüyor;
    // 1.5-flash daha stabil, sıra otomatik ilerler.
    const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"] as const;

    async function tryGenerate(promptText: string): Promise<string> {
      let lastErr: unknown = null;
      for (const modelName of MODEL_FALLBACKS) {
        const model = client.getGenerativeModel({ model: modelName });
        // 2 kez dene, ikinci denemede kısa exponential backoff
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const r = await model.generateContent(promptText);
            const t = r.response.text();
            if (t) {
              // eslint-disable-next-line no-console
              if (modelName !== MODEL_FALLBACKS[0] || attempt > 0) {
                console.info("[analyze-persona] Fallback ile başardı:", modelName, "attempt:", attempt);
              }
              return t;
            }
            throw new Error("empty response");
          } catch (e: any) {
            lastErr = e;
            const status = e?.status ?? e?.errorDetails?.[0]?.reason;
            // 503/429 dışı hatalarda modeli değiştirmeye gerek yok — dur.
            if (status && status !== 503 && status !== 429 && status !== "RESOURCE_EXHAUSTED") {
              // eslint-disable-next-line no-console
              console.warn("[analyze-persona] Model dur (non-retryable):", modelName, status);
              throw e;
            }
            // Aynı modelde ikinci deneme öncesi kısa bekleme
            if (attempt === 0) {
              await new Promise((res) => setTimeout(res, 800));
              // eslint-disable-next-line no-console
              console.warn("[analyze-persona] Retry", modelName, status);
            } else {
              // eslint-disable-next-line no-console
              console.warn("[analyze-persona] Sıradaki modele geç:", modelName, "→", MODEL_FALLBACKS[MODEL_FALLBACKS.indexOf(modelName as any) + 1] || "yok");
            }
          }
        }
      }
      throw lastErr ?? new Error("All models failed");
    }

    const prompt = `You are an elite Turkish content strategist and copywriter — like a mix of Seth Godin, Paul Graham, and a warm Turkish editor. Your job: turn a user's rough answers into a persona that IMPRESSES them, using the same language they used (Turkish if they wrote Turkish, English if English).

CRITICAL — DO NOT PARROT THE USER:
- Never echo the user's raw positioning sentence back verbatim. REWRITE it into a sharper, more memorable version.
- Never label pillars generically ("Alandaki Uzmanlığın", "Süreç ve Öğrenmeler"). Give them BRANDED, evocative names like "Builder's Journal", "Executive Reality Check", "Marketing Unplugged", "Founder Gerçekleri".
- The sample_post must feel like a REAL POST that reader would want to publish — with a hook, a paragraph, a callback. NOT a placeholder or restatement of their positioning.
- If the user gave short/generic answers, extrapolate INTELLIGENTLY — infer background from field + audience + hot takes.

Return ONLY valid JSON with this exact structure:
{
  "purpose": "string — user's primary content goal summarized in 1 crisp sentence",
  "topics": ["string — 3-8 content areas synthesized from field, hot takes, positioning"],
  "professional_background": "string — 1-2 sentences INFERRED from field + audience + positioning; sound plausible",
  "linkedin_url": "",
  "demographics": { "industry": "string", "role": "string (best guess)", "experience": "string (best guess, e.g. '8+ yıl')" },
  "tone": { "style": "string (2-3 word evocative style)", "formality": "string (casual/semi-formal/formal)", "humor": "string (none/light/moderate)", "voice": "string — 1 sentence voice description WITH personality" },
  "writing_samples": [],
  "values": ["string — 2-4 core values that drive their content"],
  "audience": "string — who they write for, 1-2 sentences with specificity",
  "positioning_statement": "1 REWRITTEN sentence — sharper than user's input. Never verbatim. Under 20 words. Memorable, quotable.",
  "pillars": [{ "title": "string — BRANDED name (2-4 words, memorable, evocative)", "description": "string (1-2 sentences describing what content lives here)" }],
  "voice_profile": ["string — 3-6 specific adjectives"],
  "differentiation": { "do": ["string — 2-4 concrete actions"], "dont": ["string — 2-4 things to avoid"] },
  "sample_post": "A real, publishable 3-5 sentence LinkedIn-style post in the user's voice, on ONE of their pillar topics. Must have: (1) a hook line, (2) a concrete observation or story, (3) a takeaway. Sound like a HUMAN wrote it — friction, specificity, one insight. NO clichés like 'inspiring journey' or 'game-changer'.",
  "suggested_platforms": ["string — 2-4 platforms where they'd thrive"],
  "cadence": "string — realistic posting frequency based on user's stated cadence"
}

RULES:
- positioning_statement and pillars MUST be unique. If user's positioning is empty or weak, INVENT a compelling one from their field + audience.
- pillars must have 3-5 items with BRANDED titles. Reject any generic titles.
- sample_post must be publishable copy, not a description of what the post would be.
- Language: match the user's language. If mixed, default to Turkish.
- Respect user's anti-positions — never violate their avoidances.

User answers (some may be empty — extrapolate intelligently):
---
Goal: ${parsed.data.goal || "(not specified)"}
Field: ${parsed.data.field || "(not specified)"}
Has existing content: ${parsed.data.hasContent || "unknown"}
Voice traits: ${parsed.data.voiceTraits || "(not specified — infer neutral samimi ton)"}
Target audience: ${parsed.data.audience || "(not specified — infer from field)"}
Positioning statement (user's raw input — REWRITE this): ${parsed.data.positioning || "(not provided — invent one from field + audience)"}
Hot takes / strong opinions: ${parsed.data.hotTakes || "None provided"}
Hot takes detail: ${parsed.data.hotTakesDetail || ""}
Preferred format: ${parsed.data.format || "written posts"}
Cadence: ${parsed.data.cadence || "weekly"}
Anti-position (what they avoid — respect these): ${parsed.data.antiposition || "None provided"}
Inspiration sources: ${parsed.data.inspiration || "None provided"}
LinkedIn URL: ${parsed.data.linkedinUrl || "(none)"}
---
${importedText ? `Imported writing samples (${importSource}) — use to calibrate real voice:\n${importedText.slice(0, 4000)}\n---\n` : ""}

Respond with ONLY the JSON object. No markdown fence, no explanation.`;

    let text: string;
    try {
      text = await tryGenerate(prompt);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[analyze-persona] Tüm modeller fail:", err);
      logError({ error: err, userId, context: "POST /api/ai/analyze-persona (all models)" });
      // Client'a `unavailable` net kodu döndür — Mobile fallback'i "AI meşgul" ile ayırt edebilsin
      return reply({ error: "AI şu an meşgul, lütfen tekrar dene", code: "unavailable" }, 503);
    }

    if (!text) {
      logError({ error: new Error("Empty response from AI"), userId, context: "POST /api/ai/analyze-persona" });
      return reply({ error: GENERIC_ERROR_MESSAGE }, 500);
    }

    const jsonStr = text.replace(/```json?/gi, "").replace(/```/g, "").trim();
    let profile: PersonaProfile;
    try {
      profile = JSON.parse(jsonStr);
    } catch (parseErr) {
      // eslint-disable-next-line no-console
      console.warn("[analyze-persona] JSON parse fail — Gemini geçersiz JSON döndü:", jsonStr.slice(0, 200));
      logError({ error: parseErr, userId, context: "POST /api/ai/analyze-persona JSON parse" });
      return reply({ error: "AI çıktısı beklenmedik formatta. Lütfen tekrar dene." }, 500);
    }

    // eslint-disable-next-line no-console
    console.info("[analyze-persona] OK — pillar sayısı:", profile.pillars?.length ?? 0, "positioning:", profile.positioning_statement?.slice(0, 60));
    return reply({ profile, importSource, importSuccess: !!importedText });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[analyze-persona] Hata:", error);
    logError({ error, userId, context: "POST /api/ai/analyze-persona" });
    return reply({ error: GENERIC_ERROR_MESSAGE }, 500);
  }
}
