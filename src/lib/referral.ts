import type { SupabaseClient } from "@supabase/supabase-js";

function genRefCode(len = 6): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

/** Get the user's referral code, creating one if missing. (service-role client) */
export async function getOrCreateReferralCode(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (data?.code) return data.code;
  for (let i = 0; i < 6; i++) {
    const code = genRefCode();
    const { error } = await admin.from("referral_codes").insert({ user_id: userId, code });
    if (!error) return code;
  }
  throw new Error("Referral kodu üretilemedi");
}

/**
 * When a referred user becomes a member, credit the referrer:
 *  - yearly-scale gift (>= 365 days) → +3 months
 *  - otherwise (monthly) → +1 month
 * Extends from the referrer's current expiry if still active. One-time per referral.
 */
export async function maybeRewardReferrer(admin: SupabaseClient, referredUserId: string, durationDays: number): Promise<void> {
  const { data: attr } = await admin
    .from("referral_attributions")
    .select("referrer_user_id, rewarded")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();
  if (!attr || attr.rewarded) return;

  const months = durationDays >= 365 ? 3 : 1;
  const now = Date.now();

  const { data: persona } = await admin
    .from("personas")
    .select("id, profile")
    .eq("user_id", attr.referrer_user_id)
    .maybeSingle();

  const cur = (persona?.profile as { subscription?: { active?: boolean; expires_at?: string } } | null)?.subscription;
  const base = cur?.active && cur?.expires_at && new Date(cur.expires_at).getTime() > now
    ? new Date(cur.expires_at).getTime()
    : now;
  const expires = new Date(base + months * 30 * 86400000).toISOString();
  const subscription = { active: true, plan: "pro", source: "referral", expires_at: expires };

  if (persona) {
    const profile = { ...((persona.profile ?? {}) as Record<string, unknown>), subscription };
    await admin.from("personas").update({ profile }).eq("id", persona.id);
  } else {
    await admin.from("personas").insert({ user_id: attr.referrer_user_id, name: "Profilim", profile: { subscription }, onboarding_complete: false });
  }

  await admin.from("referral_attributions").update({ rewarded: true, reward_months: months }).eq("referred_user_id", referredUserId);
}
