import type { AIProvider } from "./provider";

export type ProviderName = "gemini" | "claude" | "openai";

export interface ProviderConfig {
  activeProvider: ProviderName;
  geminiApiKey?: string;
  claudeApiKey?: string;
  openaiApiKey?: string;
}

function getConfig(): ProviderConfig {
  return {
    activeProvider: (process.env.ACTIVE_AI_PROVIDER as ProviderName) || "gemini",
    geminiApiKey: process.env.GEMINI_API_KEY,
    claudeApiKey: process.env.CLAUDE_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}

export async function createProvider(): Promise<AIProvider> {
  const config = getConfig();

  switch (config.activeProvider) {
    case "claude": {
      const { ClaudeProvider } = await import("./claude-provider");
      if (!config.claudeApiKey) throw new Error("AI provider key not configured");
      return new ClaudeProvider(config.claudeApiKey);
    }
    case "openai": {
      const { OpenAIProvider } = await import("./openai-provider");
      if (!config.openaiApiKey) throw new Error("AI provider key not configured");
      return new OpenAIProvider(config.openaiApiKey);
    }
    case "gemini":
    default: {
      const { GeminiProvider } = await import("./provider");
      if (!config.geminiApiKey) throw new Error("AI provider key not configured");
      return new GeminiProvider(config.geminiApiKey);
    }
  }
}
