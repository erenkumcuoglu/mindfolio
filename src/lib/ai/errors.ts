import { GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

export class RateLimitError extends Error {
  code: string;
  retryAfterMs?: number;

  constructor(message: string, code: string, retryAfterMs?: number) {
    super(message);
    this.name = "RateLimitError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export class UsageLimitError extends Error {
  code: string;
  period: string;
  current: number;
  limit: number;

  constructor(message: string, period: string, current: number, limit: number) {
    super(message);
    this.name = "UsageLimitError";
    this.code = "USAGE_LIMIT_EXCEEDED";
    this.period = period;
    this.current = current;
    this.limit = limit;
  }
}

export class GlobalLimitError extends Error {
  code: string;

  constructor(message: string) {
    super(message);
    this.name = "GlobalLimitError";
    this.code = "GLOBAL_LIMIT_EXCEEDED";
  }
}

export class ProviderError extends Error {
  code: string;
  provider: string;

  constructor(message: string, provider: string) {
    super(message);
    this.name = "ProviderError";
    this.code = "PROVIDER_ERROR";
    this.provider = provider;
  }
}

export function userFacingMessage(error: unknown): string {
  if (error instanceof UsageLimitError) {
    return `You've reached your ${error.period} limit (${error.current}/${error.limit}). Please wait until the next period or upgrade your plan.`;
  }
  if (error instanceof GlobalLimitError) {
    return "System is at capacity right now. Please try again later.";
  }
  if (error instanceof RateLimitError) {
    return "Too many requests. Please slow down and try again in a moment.";
  }
  return GENERIC_ERROR_MESSAGE;
}

export function getErrorCode(error: unknown): string {
  if (error instanceof UsageLimitError) return error.code;
  if (error instanceof GlobalLimitError) return error.code;
  if (error instanceof RateLimitError) return error.code;
  if (error instanceof ProviderError) return error.code;
  return "INTERNAL_ERROR";
}
