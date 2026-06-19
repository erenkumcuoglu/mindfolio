import { RateLimitError, ProviderError } from "./errors";

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries && isRetryable(err)) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Wrap the final error in user-friendly types
  if (lastError instanceof Error) {
    const msg = lastError.message.toLowerCase();
    if (isRateLimitError(lastError)) {
      throw new RateLimitError(lastError.message, "RATE_LIMITED", 5000);
    }
    throw new ProviderError(lastError.message, "ai-provider");
  }

  throw new ProviderError("Unknown provider error", "ai-provider");
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("429") || msg.includes("too many requests")) return true;
    if (msg.includes("500") || msg.includes("internal server error")) return true;
    if (msg.includes("502") || msg.includes("bad gateway")) return true;
    if (msg.includes("503") || msg.includes("service unavailable")) return true;
    if (msg.includes("rate limit") || msg.includes("rate_limit")) return true;
  }
  return false;
}

function isRateLimitError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit")
  );
}
