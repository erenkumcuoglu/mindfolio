import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log-error";

function countBy(rows: { user_id?: string | null }[] | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) {
    if (!r.user_id) continue;
    m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
  }
  return m;
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = list?.users ?? [];

    const personas = (await admin.from("personas").select("user_id, name, profile")).data ?? [];
    const content = (await admin.from("content").select("user_id, body")).data ?? [];
    const ideas = (await admin.from("ideas").select("user_id")).data ?? [];
    const reds = (await admin.from("promo_redemptions").select("user_id")).data ?? [];
    const drafts = (await admin.from("drafts").select("user_id")).data ?? [];

    const personaByUser = new Map(personas.map((p) => [p.user_id, p]));
    const contentCount = countBy(content as { user_id?: string }[]);
    const ideasCount = countBy(ideas as { user_id?: string }[]);
    const redCount = countBy(reds as { user_id?: string }[]);
    const draftsCount = countBy(drafts as { user_id?: string }[]);

    const rows = users.map((u) => {
      const p = personaByUser.get(u.id) as { name?: string; profile?: { subscription?: { active?: boolean; expires_at?: string }; pillars?: unknown[]; positioning_statement?: string } } | undefined;
      const sub = p?.profile?.subscription;
      const hasPersona = !!p && (!!p.profile?.positioning_statement || (p.profile?.pillars?.length ?? 0) > 0);
      return {
        id: u.id,
        email: u.email ?? "",
        name: p?.name ?? (u.email ? u.email.split("@")[0] : "—"),
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at,
        pro: !!sub?.active,
        expires_at: sub?.expires_at ?? null,
        persona: hasPersona,
        contentCount: contentCount.get(u.id) ?? 0,
        ideasCount: ideasCount.get(u.id) ?? 0,
        draftsCount: draftsCount.get(u.id) ?? 0,
        redemptions: redCount.get(u.id) ?? 0,
      };
    });
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return Response.json({ users: rows });
  } catch (error) {
    logError({ error, context: "GET /api/admin/users" });
    return Response.json({ error: "Error" }, { status: 500 });
  }
}
