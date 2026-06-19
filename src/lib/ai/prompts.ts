import type { PersonaProfile } from "@/lib/db/personas";

export function renderPersonaProfile(p: PersonaProfile): string {
  const parts = [
    `## Writing Persona`,
    ``,
    `**Purpose:** ${p.purpose}`,
    `**Topics:** ${p.topics.join(", ")}`,
    `**Background:** ${p.professional_background}`,
    `**Industry:** ${p.demographics.industry} · **Role:** ${p.demographics.role} · **Experience:** ${p.demographics.experience}`,
    `**Tone:** ${p.tone.style} · ${p.tone.formality} · ${p.tone.humor}`,
    `**Voice:** ${p.tone.voice}`,
    `**Audience:** ${p.audience}`,
    `**Values:** ${p.values.join(", ")}`,
    p.positioning_statement ? `**Positioning:** ${p.positioning_statement}` : "",
    p.pillars?.length ? `**Pillars:** ${p.pillars.map((pl) => `${pl.title}: ${pl.description}`).join(" | ")}` : "",
    p.voice_profile?.length ? `**Voice Profile:** ${p.voice_profile.join(", ")}` : "",
    p.sample_post ? `**Sample Post:**\n> ${p.sample_post}` : "",
    p.writing_samples.length > 0
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
  format?: "linkedin" | "substack" | "blog" | "x" | "raw";
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
      "Write a LinkedIn post. Keep it under 1500 chars. Use line breaks for readability. End with 3-5 relevant hashtags.",
    substack:
      "Write a Substack newsletter draft. Use a conversational yet authoritative tone. Include a subject line at the top, then body text with short paragraphs.",
    blog: "Write a blog post draft with a headline, introduction, 3-5 sections with subheadings, and a conclusion.",
    x: "Write an X (Twitter) post. Keep it under 280 chars. Use punchy, engaging language. Include 1-2 relevant hashtags.",
    raw: "Write in plain text. No special formatting required.",
  };

  const formatInstruction = formatInstructions[format] ?? formatInstructions.raw;

  return [
    `You are Mindfolio AI, a creative writing assistant.`,
    personaBlock,
    `## Writing Task`,
    formatInstruction,
    `\nUser request:\n${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");
}
