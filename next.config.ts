import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@google/generative-ai", "@anthropic-ai/sdk", "openai"],
};

export default nextConfig;
