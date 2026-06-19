import OpenAI from "openai";
import type { AIProvider, GenerateInput, GenerateResult } from "./provider";
import { buildSystemPrompt } from "./prompts";
import { retryWithBackoff } from "./retry";

const MODEL = "gpt-4o";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(input: { audio: Blob; mimeType: string }): Promise<string> {
    return retryWithBackoff(async () => {
      const formData = new FormData();
      formData.append("file", input.audio, "audio.webm");
      formData.append("model", "whisper-1");

      const result = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
        body: formData,
      });

      if (!result.ok) {
        const err = await result.text();
        throw new Error(`AI transcription failed: ${err}`);
      }

      const data = await result.json();
      if (!data.text) throw new Error("AI returned empty transcription");
      return data.text;
    });
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    return retryWithBackoff(async () => {
      const system = buildSystemPrompt(input);

      const result = await this.client.chat.completions.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input.prompt },
        ],
      });

      const text = result.choices[0]?.message?.content;
      if (!text) throw new Error("AI returned empty generation");
      return { text, model: MODEL };
    });
  }
}
