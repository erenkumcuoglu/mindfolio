import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralCode } from "@/lib/referral";
import { logError } from "@/lib/log-error";
import { corsHeaders, corsPreflight } from "@/lib/cors";

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (d: unknown, s = 200) => Response.json(d, { status: s, headers: cors });
  try {
    const supabase = await createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reply({ error: "Unauthorized" }, 401);

    const admin = createAdminClient();
    const code = await getOrCreateReferralCode(admin, user.id);

    const { data: refs } = await admin
      .from("referral_attributions")
      .select("rewarded, reward_months")
      .eq("referrer_user_id", user.id);
    const referrals = refs?.length ?? 0;
    const earnedMonths = (refs ?? []).reduce((sum, r) => sum + (r.rewarded ? r.reward_months ?? 0 : 0), 0);

    // has the current user already used someone's code?
    const { data: mine } = await admin
      .from("referral_attributions")
      .select("referrer_user_id")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    return reply({ code, referrals, earnedMonths, appliedCode: !!mine });
  } catch (error) {
    logError({ error, context: "GET /api/referral" });
    return reply({ error: "Error" }, 500);
  }
}

const applySchema = z.object({ code: z.string().min(1).max(32) });

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (d: unknown, s = 200) => Response.json(d, { status: s, headers: cors });
  try {
    const supabase = await createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reply({ error: "Unauthorized" }, 401);

    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) return reply({ error: "Geçersiz kod" }, 400);
    const code = parsed.data.code.trim().toUpperCase();

    const admin = createAdminClient();
    const { data: owner } = await admin.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
    if (!owner) return reply({ error: "Davet kodu geçersiz." }, 404);
    if (owner.user_id === user.id) return reply({ error: "Kendi kodunu kullanamazsın." }, 400);

    const { error } = await admin
      .from("referral_attributions")
      .insert({ referred_user_id: user.id, referrer_user_id: owner.user_id });
    if (error) {
      if (error.code === "23505") return reply({ error: "Zaten bir davet kodu kullandın." }, 409);
      throw error;
    }
    return reply({ ok: true });
  } catch (error) {
    logError({ error, context: "POST /api/referral" });
    return reply({ error: "Error" }, 500);
  }
}
