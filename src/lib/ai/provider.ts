import {
  GoogleGenerativeAI,
  GenerativeModel,
} from "@google/generative-ai";
import type { PersonaProfile } from "@/lib/db/personas";
import { buildOutlinePrompt, buildFinalPrompt } from "./prompts";
import { retryWithBackoff } from "./retry";

export interface GenerateInput {
  prompt: string;
  persona?: string;
  personaProfile?: PersonaProfile;
  format?: "linkedin" | "substack" | "medium" | "blog" | "x" | "raw";
}

export interface GenerateResult {
  text: string;
  model: string;
}

export interface AIProvider {
  transcribe(input: { audio: Blob; mimeType: string }): Promise<string>;
  generate(input: GenerateInput): Promise<GenerateResult>;
}

const MODEL = "gemini-2.5-flash";
// Generation runs a two-pass editorial pipeline. The generate model is
// configurable so it can be upgraded (e.g. "gemini-2.5-pro") for higher
// composition quality without touching transcribe. Defaults to flash.
const GENERATE_MODEL = process.env.MINDFOLIO_GENERATE_MODEL || MODEL;

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private generateModel: GenerativeModel;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: MODEL });
    this.generateModel =
      GENERATE_MODEL === MODEL
        ? this.model
        : this.client.getGenerativeModel({ model: GENERATE_MODEL });
  }

  async transcribe(input: { audio: Blob; mimeType: string }): Promise<string> {
    return retryWithBackoff(async () => {
      const parts = [
        {
          inlineData: {
            mimeType: input.mimeType,
            data: await blobToBase64(input.audio),
          },
        },
        { text: "Transcribe the audio exactly as heard. Do not summarize or clean up." },
      ];

      const result = await this.model.generateContent({ contents: [{ role: "user", parts }] });
      const text = result.response.text();
      if (!text) throw new Error("AI returned empty transcription");
      return text;
    });
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    // Two-pass editorial pipeline.
    // Pass 1: raw transcript -> de-duplicated, re-sequenced semantic outline.
    // Pass 2: outline (+ persona + format) -> final prose. Pass 2 never sees the
    // transcript's original sentence order, so it cannot imitate it structurally.
    const outline = await retryWithBackoff(async () => {
      const result = await this.generateModel.generateContent(
        buildOutlinePrompt({ prompt: input.prompt }),
      );
      const text = result.response.text();
      if (!text) throw new Error("AI returned empty outline");
      return text;
    });

    return retryWithBackoff(async () => {
      const finalPrompt = buildFinalPrompt({
        outline,
        persona: input.persona,
        personaProfile: input.personaProfile,
        format: input.format,
      });
      const result = await this.generateModel.generateContent(finalPrompt);
      const text = result.response.text();
      if (!text) throw new Error("AI returned empty generation");
      return { text, model: GENERATE_MODEL };
    });
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
