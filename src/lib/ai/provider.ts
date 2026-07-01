import {
  GoogleGenerativeAI,
  GenerativeModel,
} from "@google/generative-ai";
import type { PersonaProfile } from "@/lib/db/personas";
import { buildSystemPrompt } from "./prompts";
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

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: MODEL });
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
    return retryWithBackoff(async () => {
      const systemPrompt = buildSystemPrompt(input);
      const result = await this.model.generateContent(systemPrompt);
      const text = result.response.text();
      if (!text) throw new Error("AI returned empty generation");
      return { text, model: MODEL };
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
