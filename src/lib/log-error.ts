import { createAdminClient } from "@/lib/supabase/admin";

export const GENERIC_ERROR_MESSAGE =
  "Oops, bir şeyler ters gitti! Ekibimize iletildi ve şu anda ilgileniliyor.";

interface LogErrorParams {
  error: unknown;
  userId?: string;
  jobId?: string;
  context?: string;
  request?: {
    method?: string;
    path?: string;
  };
}

/**
 * Best-effort persist of a server error so it surfaces in the admin dashboard.
 * Fire-and-forget: never throws, never blocks the caller, and silently no-ops
 * if the error_events table or service-role key isn't available.
 */
function persistCriticalError(row: {
  message: string;
  stack?: string;
  context: string | null;
  user_id: string | null;
  request: unknown;
}): void {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const admin = createAdminClient();
    void admin
      .from("error_events")
      .insert({
        message: row.message?.slice(0, 4000) ?? null,
        stack: row.stack?.slice(0, 8000) ?? null,
        context: row.context,
        user_id: row.user_id,
        request: row.request ?? null,
      })
      .then(() => {})
      .then(undefined, () => {});
  } catch {
    // ignore — logging must never crash the request
  }
}

/**
 * Push a short alert to the admin so they're notified without opening the
 * dashboard. Supports Telegram (preferred) and a generic Slack/Discord webhook.
 * Enable by setting either:
 *   - TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  (Telegram bot)
 *   - MINDFOLIO_ALERT_WEBHOOK                (Slack/Discord/generic)
 */
export function sendAlert(message: string, context: string | null = null): void {
  const text = `🚨 Mindfolio hata${context ? ` · ${context}` : ""}\n${message?.slice(0, 500) ?? ""}`;

  // Telegram bot
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      void fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      }).then(() => {}, () => {});
    }
  } catch {
    // ignore
  }

  // Generic webhook (Slack uses { text }, Discord uses { content }) — send both keys.
  try {
    const url = process.env.MINDFOLIO_ALERT_WEBHOOK;
    if (url) {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, content: text }),
      }).then(() => {}, () => {});
    }
  } catch {
    // ignore
  }
}

export function logError({ error, userId, jobId, context, request }: LogErrorParams): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = {
    timestamp,
    message,
    stack,
    userId: userId ?? null,
    jobId: jobId ?? null,
    context: context ?? null,
    request: request ?? null,
  };

  console.error(JSON.stringify(payload));

  persistCriticalError({
    message,
    stack,
    context: context ?? null,
    user_id: userId ?? null,
    request: request ?? null,
  });

  sendAlert(message, context ?? null);

  // When Sentry is added, hook here:
  // Sentry.withScope((scope) => {
  //   scope.setUser({ id: userId });
  //   scope.setTag("job_id", jobId);
  //   scope.setTag("context", context);
  //   scope.setExtra("request", request);
  //   Sentry.captureException(error);
  // });
}
