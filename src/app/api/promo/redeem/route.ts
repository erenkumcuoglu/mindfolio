import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { maybeRewardReferrer } from "@/lib/referral";
import { logError } from "@/lib/log-error";
import { corsHeaders, corsPreflight } from "@/lib/cors";

const bodySchema = z.object({ code: z.string().min(1).max(64) });

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });

  try {
    const supabase = await createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reply({ error: "Unauthorized" }, 401);
    userId = user.id;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return reply({ error: "Geçersiz kod" }, 400);
    const code = parsed.data.code.trim().toUpperCase();

    const admin = createAdminClient();

    const { data: promo } = await admin
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    if (!promo) return reply({ error: "Kod geçersiz veya pasif." }, 404);

    const max = promo.kind === "one_time" ? 1 : promo.max_uses;
    if (max != null && promo.uses >= max) {
      return reply({ error: "Bu kodun kullanım hakkı dolmuş." }, 409);
    }

    const { data: already } = await admin
      .from("promo_redemptions")
      .select("id")
      .eq("code_id", promo.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (already) return reply({ error: "Bu kodu zaten kullandın." }, 409);

    // Record redemption + bump usage
    const { error: redErr } = await admin
      .from("promo_redemptions")
      .insert({ code_id: promo.id, user_id: user.id });
    if (redErr) {
      // unique violation = race; treat as already redeemed
      return reply({ error: "Bu kodu zaten kullandın." }, 409);
    }
    await admin.from("promo_codes").update({ uses: promo.uses + 1 }).eq("id", promo.id);

    // Grant the gifted membership on the user's persona
    const expiresAt = new Date(Date.now() + promo.duration_days * 86400000).toISOString();
    const subscription = { active: true, plan: "pro", source: "promo", expires_at: expiresAt };

    const { data: persona } = await admin
      .from("personas")
      .select("id, profile")
      .eq("user_id", user.id)
      .maybeSingle();

    if (persona) {
      const profile = { ...((persona.profile ?? {}) as Record<string, unknown>), subscription };
      await admin.from("personas").update({ profile }).eq("id", persona.id);
    } else {
      await admin.from("personas").insert({
        user_id: user.id,
        name: "Profilim",
        profile: { subscription },
        onboarding_complete: false,
      });
    }

    // If this user was referred, credit the referrer.
    await maybeRewardReferrer(admin, user.id, promo.duration_days);

    return reply({ ok: true, duration_days: promo.duration_days, expires_at: expiresAt });
  } catch (error) {
    logError({ error, userId, context: "POST /api/promo/redeem" });
    return reply({ error: "Bir şeyler ters gitti." }, 500);
  }
}
