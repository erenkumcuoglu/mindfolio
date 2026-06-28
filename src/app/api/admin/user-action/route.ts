import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient as createSb } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { maybeRewardReferrer } from "@/lib/referral";
import { logError } from "@/lib/log-error";

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["reset_password", "grant_pro", "freeze"]),
});

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
    const { userId, action } = parsed.data;

    const admin = createAdminClient();

    if (action === "reset_password") {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const email = u?.user?.email;
      if (!email) return Response.json({ error: "E-posta bulunamadı" }, { status: 404 });
      const anon = createSb(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await anon.auth.resetPasswordForEmail(email, { redirectTo: `${request.nextUrl.origin}/update-password` });
      return Response.json({ ok: true, message: "Şifre sıfırlama e-postası gönderildi." });
    }

    // grant_pro / freeze → update persona.profile.subscription
    const active = action === "grant_pro";
    const subscription = active
      ? { active: true, plan: "pro", source: "admin", expires_at: new Date(Date.now() + 365 * 86400000).toISOString() }
      : { active: false, plan: "pro", source: "admin" };

    const { data: persona } = await admin.from("personas").select("id, profile").eq("user_id", userId).maybeSingle();
    if (persona) {
      const profile = { ...((persona.profile ?? {}) as Record<string, unknown>), subscription };
      await admin.from("personas").update({ profile }).eq("id", persona.id);
    } else {
      await admin.from("personas").insert({ user_id: userId, name: "Profilim", profile: { subscription }, onboarding_complete: false });
    }
    if (active) await maybeRewardReferrer(admin, userId, 365);

    return Response.json({ ok: true, message: active ? "Pro tanımlandı." : "Üyelik donduruldu." });
  } catch (error) {
    logError({ error, context: "POST /api/admin/user-action" });
    return Response.json({ error: "Error" }, { status: 500 });
  }
}
