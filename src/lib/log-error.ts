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

  // When Sentry is added, hook here:
  // Sentry.withScope((scope) => {
  //   scope.setUser({ id: userId });
  //   scope.setTag("job_id", jobId);
  //   scope.setTag("context", context);
  //   scope.setExtra("request", request);
  //   Sentry.captureException(error);
  // });
}
