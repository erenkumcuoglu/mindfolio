import type { PersonaProfile } from "@/lib/db/personas";

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

export function buildSystemPrompt(input: {
  prompt: string;
  persona?: string;
  personaProfile?: PersonaProfile;
  format?: "linkedin" | "substack" | "medium" | "blog" | "x" | "raw";
}): string {
  const { prompt, persona, personaProfile, format = "raw" } = input;

  const personaBlock = (() => {
    if (personaProfile) {
      return `\n${renderPersonaProfile(personaProfile)}\n`;
    }
    if (persona) {
      return `\nYou are writing as this persona:\n${persona}\n`;
    }
    return "";
  })();

  const formatInstructions: Record<string, string> = {
    linkedin:
      "Write a LinkedIn post. Keep it under 1500 chars. Open with a strong hook. Use line breaks for readability. End with 3-5 relevant hashtags.",
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
      "- Keep the author's wording and rhythm; do not corporate-ize or over-polish.",
    x: "Write an X (Twitter) post. Keep it under 280 chars. Punchy and engaging. 1-2 relevant hashtags.",
    raw: "Write in plain text. No special formatting required.",
  };

  const formatInstruction = formatInstructions[format] ?? formatInstructions.raw;

  return [
    `You are Mindfolio AI. You write finished content in the author's own natural voice and language.`,
    `STRICT OUTPUT RULES:`,
    `- Output ONLY the requested content. No preamble, no meta-commentary, no "Sure"/"Harika"/"Let's"/"İşte" lead-ins, no explanation of what you are doing or about to do.`,
    `- Do not mention the persona, the brand, or the writing process. Just produce the content.`,
    `- Write in the same language as the user's material.`,
    personaBlock,
    `## Writing Task`,
    formatInstruction,
    `\nSource material from the author:\n${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");
}
