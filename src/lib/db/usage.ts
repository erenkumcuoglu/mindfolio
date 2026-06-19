import type { SupabaseClient } from "@supabase/supabase-js";

export interface UsageRow {
  id: string;
  user_id: string;
  period_type: "daily" | "monthly";
  period_start: string;
  call_count: number;
  updated_at: string;
}

export interface UsageStats {
  daily: { current: number; limit: number; remaining: number };
  monthly: { current: number; limit: number; remaining: number };
  globalToday: { current: number; limit: number };
}

// Soft limits — adjust via env or config
const DAILY_LIMIT = parseInt(process.env.USER_DAILY_LIMIT ?? "50", 10);
const MONTHLY_LIMIT = parseInt(process.env.USER_MONTHLY_LIMIT ?? "500", 10);
const GLOBAL_DAILY_LIMIT = parseInt(process.env.GLOBAL_DAILY_LIMIT ?? "10000", 10);

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Check whether the user has exceeded any usage limit.
 * Throws an appropriate error if over limit; otherwise returns the stats.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageStats> {
  const stats = await getUsageStats(supabase, userId);

  if (stats.daily.remaining <= 0) {
    const { UsageLimitError } = await import("@/lib/ai/errors");
    throw new UsageLimitError(
      `Daily limit reached (${stats.daily.current}/${stats.daily.limit})`,
      "daily",
      stats.daily.current,
      stats.daily.limit,
    );
  }

  if (stats.monthly.remaining <= 0) {
    const { UsageLimitError } = await import("@/lib/ai/errors");
    throw new UsageLimitError(
      `Monthly limit reached (${stats.monthly.current}/${stats.monthly.limit})`,
      "monthly",
      stats.monthly.current,
      stats.monthly.limit,
    );
  }

  if (stats.globalToday.current >= stats.globalToday.limit) {
    const { GlobalLimitError } = await import("@/lib/ai/errors");
    throw new GlobalLimitError("Global daily capacity reached");
  }

  return stats;
}

/**
 * Increment usage counters for the user (daily + monthly).
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const todayStr = today();
  const monthStr = monthStart();

  await upsertCounter(supabase, userId, "daily", todayStr);
  await upsertCounter(supabase, userId, "monthly", monthStr);
}

async function upsertCounter(
  supabase: SupabaseClient,
  userId: string,
  periodType: "daily" | "monthly",
  periodStart: string,
): Promise<void> {
  // Try insert; if conflict (unique constraint), increment
  const { error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_period_type: periodType,
    p_period_start: periodStart,
  });

  // If RPC doesn't exist yet, fall back to manual upsert
  if (error && error.message.includes("function")) {
    const { data: existing } = await supabase
      .from("usage")
      .select("id, call_count")
      .eq("user_id", userId)
      .eq("period_type", periodType)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("usage")
        .update({ call_count: (existing.call_count as number) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("usage").insert({
        user_id: userId,
        period_type: periodType,
        period_start: periodStart,
        call_count: 1,
      });
    }
  }
}

/**
 * Fetch current usage stats for a user.
 */
export async function getUsageStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageStats> {
  const todayStr = today();
  const monthStr = monthStart();

  const { data: dailyRow } = await supabase
    .from("usage")
    .select("call_count")
    .eq("user_id", userId)
    .eq("period_type", "daily")
    .eq("period_start", todayStr)
    .maybeSingle();

  const { data: monthlyRow } = await supabase
    .from("usage")
    .select("call_count")
    .eq("user_id", userId)
    .eq("period_type", "monthly")
    .eq("period_start", monthStr)
    .maybeSingle();

  // Global: sum all daily usage for today
  const { data: globalRows } = await supabase
    .from("usage")
    .select("call_count")
    .eq("period_type", "daily")
    .eq("period_start", todayStr);

  const dailyCount = (dailyRow?.call_count as number) ?? 0;
  const monthlyCount = (monthlyRow?.call_count as number) ?? 0;
  const globalCount = (globalRows as { call_count: number }[] | null)
    ?.reduce((sum, r) => sum + r.call_count, 0) ?? 0;

  return {
    daily: { current: dailyCount, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - dailyCount) },
    monthly: { current: monthlyCount, limit: MONTHLY_LIMIT, remaining: Math.max(0, MONTHLY_LIMIT - monthlyCount) },
    globalToday: { current: globalCount, limit: GLOBAL_DAILY_LIMIT },
  };
}
