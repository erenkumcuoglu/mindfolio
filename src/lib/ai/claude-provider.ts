import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateInput, GenerateResult } from "./provider";
import { buildSystemPrompt } from "./prompts";
import { retryWithBackoff } from "./retry";

const MODEL = "claude-sonnet-4-20250514";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async transcribe(input: { audio: Blob; mimeType: string }): Promise<string> {
    return retryWithBackoff(async () => {
      const buffer = await input.audio.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const result = await this.client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe the audio exactly as heard. Do not summarize or clean up.",
              },
              {
                type: "media",
                data: base64,
                media_type: input.mimeType,
              } as unknown as Anthropic.Messages.ContentBlock,
            ],
          },
        ],
      });

      const text = result.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.Messages.TextBlock).text)
        .join("\n");

      if (!text) throw new Error("AI returned empty transcription");
      return text;
    });
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    return retryWithBackoff(async () => {
      const system = buildSystemPrompt(input);

      const result = await this.client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: input.prompt }],
      });

      const text = result.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.Messages.TextBlock).text)
        .join("\n");

      if (!text) throw new Error("AI returned empty generation");
      return { text, model: MODEL };
    });
  }
}
