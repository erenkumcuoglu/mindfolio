import type { PersonaProfile } from "@/lib/db/personas";

export type ContentFormat =
  | "linkedin"
  | "substack"
  | "medium"
  | "blog"
  | "x"
  | "raw";

export function renderPersonaProfile(p: PersonaProfile): string {
  // Defensive: persona profiles can be partial/empty (e.g. user skipped or
  // hasn't finished onboarding). Only render fields that actually exist.
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
    p.pillars?.length ? `**Pillars:** ${p.pillars.map((pl) => `${pl.title}: ${pl.description ?? ""}`).join(" | ")}` : "",
    p.voice_profile?.length ? `**Voice Profile:** ${p.voice_profile.join(", ")}` : "",
    p.sample_post ? `**Sample Post:**\n> ${p.sample_post}` : "",
    p.writing_samples?.length
      ? `**Writing Samples:**\n${p.writing_samples.map((s) => `  > ${s}`).join("\n")}`
      : "",
  ];

  if (p.differentiation) {
    if (p.differentiation.do?.length) {
      parts.push(`**Do:** ${p.differentiation.do.join(", ")}`);
    }
    if (p.differentiation.dont?.length) {
      parts.push(`**Don't:** ${p.differentiation.dont.join(", ")}`);
    }
  }
  if (p.suggested_platforms?.length) {
    parts.push(`**Suggested Platforms:** ${p.suggested_platforms.join(", ")}`);
  }
  if (p.cadence) {
    parts.push(`**Cadence:** ${p.cadence}`);
  }

  return parts.filter(Boolean).join("\n");
}

/**
 * Universal editorial rules. Applied to EVERY author, independent of persona.
 * This layer defines editor behavior (structure, de-duplication, prose quality,
 * density) and must NOT encode any single user's voice or strategy — those live
 * in the persona layer. Managed centrally as the "editorial playbook".
 */
export const EDITORIAL_BASE_LAYER = [
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

/**
 * Interpretation guard for persona constraints. The persona profile is rendered
 * verbatim (tone, differentiation.do/dont, voice), so the author's own shorthand
 * feedback — e.g. "fazla uzatma", "keep it short", "less fluff" — can leak in as a
 * literal instruction and get over-applied as a hard length cut, killing depth.
 * This reframes brevity-type constraints as a signal-to-noise target, not a word
 * count ceiling. Only injected when a persona is present.
 */
const PERSONA_CONSTRAINT_GUARD = [
  `## Interpreting Persona Constraints`,
  `The persona above may contain the author's own shorthand feedback (e.g. "fazla uzatma", "kısa yaz", "don't overwrite", "less fluff"). Interpret any brevity/conciseness constraint as a VERBOSITY signal, never as a hard length cut:`,
  `- "too long" / "fazla uzatma" / "keep it short" → strip filler and redundancy so every sentence carries information; do NOT drop conceptual connections, examples, nuance, or depth, and do NOT cut below the length the material actually needs.`,
  `- Optimize for signal-to-noise, not word count. Density, not shortness, is the goal.`,
].join("\n");

export const FORMAT_INSTRUCTIONS: Record<ContentFormat, string> = {
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
  x: "Write an X (Twitter) post. Keep it under 260 chars (leave room for a link). Punchy and engaging. " +
    "Do NOT add any hashtags. At the end, add ' [buraya link]' (or ' [link here]' if writing in English) as a placeholder for the author's article/reference URL — leave that token literally so the author can replace it before posting.",
  raw: "Write in plain text. No special formatting required.",
};

function personaBlock(input: {
  persona?: string;
  personaProfile?: PersonaProfile;
}): string {
  if (input.personaProfile) {
    return `\n${renderPersonaProfile(input.personaProfile)}\n`;
  }
  if (input.persona) {
    return `\nYou are writing as this persona:\n${input.persona}\n`;
  }
  return "";
}

/**
 * Pass 1 of the two-pass pipeline.
 * Turns the raw transcript into a de-duplicated, re-sequenced semantic outline.
 * Output is STRUCTURE, not prose — the model that writes the final piece never
 * sees the transcript's original sentence order, so it cannot imitate it.
 */
export function buildOutlinePrompt(input: { prompt: string }): string {
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
    `\nSource transcript from the author:\n${input.prompt}`,
  ].join("\n");
}

/**
 * Pass 2 of the two-pass pipeline.
 * Writes the final content from the Pass 1 outline + persona + format.
 * Deliberately does NOT receive the raw transcript.
 */
export function buildFinalPrompt(input: {
  outline: string;
  persona?: string;
  personaProfile?: PersonaProfile;
  format?: ContentFormat;
}): string {
  const { outline, format = "raw" } = input;
  const formatInstruction = FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.raw;

  const pBlock = personaBlock(input);
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
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Single-pass builder. Kept for backwards compatibility and as a fallback path;
 * now also carries the universal editorial layer and the revised blog guidance.
 */
export function buildSystemPrompt(input: {
  prompt: string;
  persona?: string;
  personaProfile?: PersonaProfile;
  format?: ContentFormat;
}): string {
  const { prompt, format = "raw" } = input;
  const formatInstruction = FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.raw;

  const pBlock = personaBlock(input);
  return [
    `You are Mindfolio AI. You write finished content in the author's own natural voice and language.`,
    STRICT_OUTPUT_RULES,
    pBlock,
    pBlock ? PERSONA_CONSTRAINT_GUARD : "",
    `## Editorial Principles`,
    EDITORIAL_BASE_LAYER,
    `## Writing Task`,
    formatInstruction,
    `\nSource material from the author:\n${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");
}
