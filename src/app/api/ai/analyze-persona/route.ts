import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";
import type { PersonaProfile } from "@/lib/db/personas";

const bodySchema = z.object({
  goal: z.string().min(1).max(500),
  field: z.string().min(1).max(500),
  hasContent: z.string().min(1).max(10),
  voiceTraits: z.string().min(1).max(1000),
  audience: z.string().min(1).max(1000),
  positioning: z.string().min(1).max(2000),
  hotTakes: z.string().max(2000).optional().default(""),
  hotTakesDetail: z.string().max(2000).optional().default(""),
  format: z.string().max(500).optional().default(""),
  cadence: z.string().max(500).optional().default(""),
  antiposition: z.string().max(2000).optional().default(""),
  inspiration: z.string().max(2000).optional().default(""),
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

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "AI service not configured", demo: true },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

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
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a writing coach AI creating a detailed content strategy persona.

Based on the user's answers and any imported content, generate a structured persona profile.

Return ONLY valid JSON with this exact structure:
{
  "purpose": "string — user's primary content goal summarized in 1 sentence",
  "topics": ["string — 3-8 content areas synthesized from their field, hot takes, and positioning"],
  "professional_background": "string — 1-2 sentences about their background",
  "linkedin_url": "",
  "demographics": { "industry": "string", "role": "string", "experience": "string" },
  "tone": { "style": "string (2-3 word style description)", "formality": "string (casual/semi-formal/formal)", "humor": "string (none/light/moderate)", "voice": "string — 1 sentence voice description" },
  "writing_samples": [],
  "values": ["string — 2-4 core values that drive their content"],
  "audience": "string — who they write for, 1-2 sentences",
  "positioning_statement": "1 unique sentence that captures what makes them different",
  "pillars": [{ "title": "string (short pillar name)", "description": "string (1 sentence)" }],
  "voice_profile": ["string — 3-6 adjectives describing their voice"],
  "differentiation": { "do": ["string — what they should do more of"], "dont": ["string — what to avoid"] },
  "sample_post": "a 2-4 sentence sample post in the user's voice, on one of their topics",
  "suggested_platforms": ["string — 2-4 platform names where they'd thrive"],
  "cadence": "string — suggested posting frequency"
}

IMPORTANT RULES:
- The positioning_statement and pillars MUST be unique to this user — never generic.
- pillars must have 3-5 items, each with a descriptive title and a 1-sentence explanation.
- voice_profile should be specific adjectives, not vague labels.
- differentiation.do and differentiation.dont should each have 2-4 items.
- sample_post must sound like a real human wrote it in the user's described voice.
- suggested_platforms should match their preferred format from the answers.

User answers:
---
Goal: ${parsed.data.goal}
Field: ${parsed.data.field}
Has existing content: ${parsed.data.hasContent}
Voice traits: ${parsed.data.voiceTraits}
Target audience: ${parsed.data.audience}
Positioning statement: ${parsed.data.positioning}
Hot takes / strong opinions: ${parsed.data.hotTakes || "None provided"}
Hot takes detail: ${parsed.data.hotTakesDetail || ""}
Preferred format: ${parsed.data.format}
Cadence: ${parsed.data.cadence}
Anti-position (what they avoid): ${parsed.data.antiposition || "None provided"}
Inspiration sources: ${parsed.data.inspiration || "None provided"}
---
${importedText ? `Imported content (${importSource}):\n${importedText.slice(0, 4000)}\n---\n` : ""}

Respond with ONLY the JSON object. No markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      logError({ error: new Error("Empty response from AI"), userId, context: "POST /api/ai/analyze-persona" });
      return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
    }

    const jsonStr = text.replace(/```json?/gi, "").replace(/```/g, "").trim();
    const profile: PersonaProfile = JSON.parse(jsonStr);

    return Response.json({ profile, importSource, importSuccess: !!importedText });
  } catch (error) {
    logError({ error, userId, context: "POST /api/ai/analyze-persona" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
