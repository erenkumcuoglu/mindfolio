import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log-error";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = list?.users ?? [];
    const weekAgo = Date.now() - 7 * 86400000;
    const recent = users.filter((u) => new Date(u.created_at).getTime() > weekAgo).length;

    const { data: personas } = await admin.from("personas").select("profile");
    const paying = (personas ?? []).filter(
      (p) => ((p.profile as { subscription?: { active?: boolean } } | null)?.subscription?.active)
    ).length;

    return Response.json({ total: users.length, recent, paying });
  } catch (error) {
    logError({ error, context: "GET /api/admin/stats" });
    return Response.json({ error: "Error" }, { status: 500 });
  }
}
