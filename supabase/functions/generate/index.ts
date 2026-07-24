// Supabase Edge Function: async content generation (two-pass editorial).
//
// The client inserts a generation_jobs row (prompt + format), then invokes this
// function with { jobId }. We respond 202 and finish in the background
// (EdgeRuntime.waitUntil); the client polls the row for the result. Runs off
// Netlify so the two-pass Gemini calls aren't bound by the ~26s function timeout.
//
// NOTE: the prompt builders below are ported from src/lib/ai/prompts.ts. Keep
// them in sync if that file changes.
//
// Deploy:  supabase functions deploy generate
// Secret:  supabase secrets set GEMINI_API_KEY=...  (shared with transcribe)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("MINDFOLIO_GENERATE_MODEL") || "gemini-2.5-flash";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ─── Prompt builders (ported from src/lib/ai/prompts.ts) ──────────────────────

// deno-lint-ignore no-explicit-any
function renderPersonaProfile(p: any): string {
  const d = p.demographics;
  const t = p.tone;
  const parts = [
    `## Writing Persona`,
    ``,
    p.purpose ? `**Purpose:** ${p.purpose}` : "",
    p.topics?.length ? `**Topics:** ${p.topics.join(", ")}` : "",
    p.professional_background ? `**Background:** ${p.professional_background}` : "",
    d && (d.industry || d.role || d.experience)
      ? `**Industry:** ${d.industry ?? "—"} · **Role:** ${d.role ?? "—"} · **Experience:** ${d.experience ?? "—"}`
      : "",
    t && (t.style || t.formality || t.humor)
      ? `**Tone:** ${t.style ?? ""} · ${t.formality ?? ""} · ${t.humor ?? ""}`
      : "",
    t?.voice ? `**Voice:** ${t.voice}` : "",
    p.audience ? `**Audience:** ${p.audience}` : "",
    p.values?.length ? `**Values:** ${p.values.join(", ")}` : "",
    p.positioning_statement ? `**Positioning:** ${p.positioning_statement}` : "",
    p.pillars?.length ? `**Pillars:** ${p.pillars.map((pl: any) => `${pl.title}: ${pl.description ?? ""}`).join(" | ")}` : "",
    p.voice_profile?.length ? `**Voice Profile:** ${p.voice_profile.join(", ")}` : "",
    p.sample_post ? `**Sample Post:**\n> ${p.sample_post}` : "",
    p.writing_samples?.length
      ? `**Writing Samples:**\n${p.writing_samples.map((s: string) => `  > ${s}`).join("\n")}`
      : "",
  ];
  if (p.differentiation) {
    if (p.differentiation.do?.length) parts.push(`**Do:** ${p.differentiation.do.join(", ")}`);
    if (p.differentiation.dont?.length) parts.push(`**Don't:** ${p.differentiation.dont.join(", ")}`);
  }
  if (p.suggested_platforms?.length) parts.push(`**Suggested Platforms:** ${p.suggested_platforms.join(", ")}`);
  if (p.cadence) parts.push(`**Cadence:** ${p.cadence}`);
  return parts.filter(Boolean).join("\n");
}

const EDITORIAL_BASE_LAYER = [
  `## Editorial Principles (universal — apply to every author)`,
  `The transcript is raw material, not the finished text. Behave like an editor, not a transcriber.`,
  `- Segment the material by topic. If an anecdote or point is told out of order, move it into the topic it belongs to instead of following the spoken order.`,
  `- Merge duplicate statements. Say each thing once, in its strongest place (e.g. if a phrase is repeated three times for emphasis, keep it once).`,
  `- Rewrite spoken, inverted, or run-on sentences as clean written prose while keeping their meaning.`,
  `- Arrange the narrative into a logical sequence with clear connective tissue between sections.`,
  `- Density over brevity: shortness is NOT the goal — a high signal-to-noise ratio is. Do not pad with filler, but do preserve conceptual connections, examples, and depth. Length should be set by how much material there is, not trimmed below it.`,
  `- Preserve the author's voice and intent; do not corporate-ize, do not over-polish into blandness, and never invent facts, names, numbers, or events that are not in the source.`,
].join("\n");

const STRICT_OUTPUT_RULES = [
  `STRICT OUTPUT RULES:`,
  `- Output ONLY the requested content. No preamble, no meta-commentary, no "Sure"/"Harika"/"Let's"/"İşte" lead-ins, no explanation of what you are doing or about to do.`,
  `- Do not mention the persona, the brand, or the writing process. Just produce the content.`,
  `- Write in the same language as the author's material.`,
].join("\n");

const PERSONA_CONSTRAINT_GUARD = [
  `## Interpreting Persona Constraints`,
  `The persona above may contain the author's own shorthand feedback (e.g. "fazla uzatma", "kısa yaz", "don't overwrite", "less fluff"). Interpret any brevity/conciseness constraint as a VERBOSITY signal, never as a hard length cut:`,
  `- "too long" / "fazla uzatma" / "keep it short" → strip filler and redundancy so every sentence carries information; do NOT drop conceptual connections, examples, nuance, or depth, and do NOT cut below the length the material actually needs.`,
  `- Optimize for signal-to-noise, not word count. Density, not shortness, is the goal.`,
].join("\n");

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  linkedin:
    "Write a LinkedIn post. Keep it under 1500 chars. Open with a strong hook. Use line breaks for readability. " +
    "Do NOT add any hashtags. At the end, add exactly one line 'Kaynak: [buraya link]' (or 'Source: [link here]' if writing in English) as a placeholder for the author's article/reference URL — leave the [buraya link]/[link here] token literally so the author can replace it before publishing.",
  substack:
    "Write a Substack/newsletter draft. Start with a subject line, then body text with short paragraphs and **bold** for emphasis.",
  medium:
    "Write a Medium-style long-form article. Start with a strong hook line, then a one-line subtitle, then body. Use `##` for section breaks, **bold** for key ideas, and `>` for quotes. Keep paragraphs short and skimmable.",
  blog:
    "Write a blog post in the author's own voice.\n" +
    "FIRST, output exactly 3 alternative headlines, each on its own line, in the output language, formatted exactly as:\n" +
    "Başlık 1: ...\nBaşlık 2: ...\nBaşlık 3: ...\n" +
    "Then a blank line, then the article body. In the body:\n" +
    "- Use Markdown section headings with `##` (not bare text).\n" +
    "- Use **bold** to mark words the author vocally emphasizes; use *italics* for softer emphasis.\n" +
    "- Put any spoken dialogue or direct quotes inside a Markdown blockquote line starting with `> `.\n" +
    "- Keep the author's voice and intent; restructure and polish the prose into clean written form (do not merely transcribe the spoken wording or its order).",
  x: "Write an X (Twitter) post. Keep the entire post at or under 140 characters (this is a hard limit — count characters and do not exceed it). Punchy and engaging, one idea only. " +
    "Do NOT add any hashtags. Do not add a link or placeholder token.",
  raw: "Write in plain text. No special formatting required.",
};

function personaBlock(profile: unknown): string {
  if (profile) return `\n${renderPersonaProfile(profile)}\n`;
  return "";
}

function buildOutlinePrompt(prompt: string): string {
  return [
    `You are Mindfolio AI's editorial pass. Turn the author's raw transcript into a structured semantic outline that a writer will later use to compose the final piece.`,
    EDITORIAL_BASE_LAYER,
    `## Your Output`,
    `Produce an OUTLINE, not prose. Structure it as:`,
    `- A one-line note on the intended narrative arc (opening hook → main sections → close).`,
    `- Then, for each topic in logical order: a short heading, followed by bullet points capturing the key claims, facts, and anecdotes that belong under it — with duplicates already merged and out-of-order anecdotes moved to where they belong.`,
    `Keep every substantive detail from the source (names, numbers, dates, examples, and words the author emphasizes). You are reorganizing and de-duplicating, NOT summarizing content away.`,
    `Write the outline in the same language as the source material.`,
    `Do NOT write the final article and do NOT reuse the transcript's sentence order. Output only the outline.`,
    `\nSource transcript from the author:\n${prompt}`,
  ].join("\n");
}

function buildFinalPrompt(outline: string, profile: unknown, format: string): string {
  const formatInstruction = FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.raw;
  const pBlock = personaBlock(profile);
  return [
    `You are Mindfolio AI. You write finished content in the author's own natural voice and language.`,
    STRICT_OUTPUT_RULES,
    pBlock,
    pBlock ? PERSONA_CONSTRAINT_GUARD : "",
    `## Editorial Principles`,
    EDITORIAL_BASE_LAYER,
    `## Writing Task`,
    formatInstruction,
    `\nYou are given a structured editorial outline that has already been de-duplicated and re-sequenced. Write the final piece from THIS outline, following its structure and narrative order. Do not reproduce any raw transcript phrasing or ordering — the outline is your only source of structure.`,
    `\nEditorial outline:\n${outline}`,
  ].filter(Boolean).join("\n");
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function callGemini(apiKey: string, promptText: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini error ${res.status}: ${t.slice(0, 300)}`);
  }
  const jr = await res.json();
  return (jr?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("")
    .trim();
}

// deno-lint-ignore no-explicit-any
async function processJob(admin: any, jobId: string): Promise<void> {
  const { data: job } = await admin.from("generation_jobs").select("*").eq("id", jobId).single();
  if (!job) return;
  try {
    await admin.from("generation_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const { data: persona } = await admin
      .from("personas")
      .select("profile")
      .eq("user_id", job.user_id)
      .maybeSingle();
    const profile = persona?.profile ?? null;

    // Pass 1: transcript -> outline
    const outline = await callGemini(apiKey, buildOutlinePrompt(job.prompt));
    if (!outline) throw new Error("Empty outline");

    // Pass 2: outline (+persona+format) -> final
    const text = await callGemini(apiKey, buildFinalPrompt(outline, profile, job.format || "raw"));
    if (!text) throw new Error("Empty generation");

    await admin.from("generation_jobs")
      .update({ status: "done", result: text, updated_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (e) {
    await admin.from("generation_jobs")
      .update({ status: "error", error: String((e as Error)?.message ?? e), updated_at: new Date().toISOString() })
      .eq("id", jobId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { jobId } = await req.json().catch(() => ({}));
    if (!jobId || typeof jobId !== "string") return json({ error: "jobId required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const work = processJob(admin, jobId);
    // deno-lint-ignore no-explicit-any
    const edge = (globalThis as any).EdgeRuntime;
    if (edge?.waitUntil) edge.waitUntil(work);
    else await work;

    return json({ ok: true, jobId }, 202);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
