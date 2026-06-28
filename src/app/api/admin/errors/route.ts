import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log-error";

/** GET: recent error events + unseen count (admin only). */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("error_events")
      .select("id, created_at, message, context, user_id, seen")
      .order("created_at", { ascending: false })
      .limit(50);

    // Table may not be migrated yet — degrade gracefully.
    if (error) return Response.json({ events: [], unseen: 0, ready: false });

    const events = data ?? [];
    const unseen = events.filter((e) => !e.seen).length;
    return Response.json({ events, unseen, ready: true });
  } catch (error) {
    logError({ error, context: "GET /api/admin/errors" });
    return Response.json({ error: "Error" }, { status: 500 });
  }
}

/** PATCH: mark all (or a specific) error event as seen. */
export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();
    let q = admin.from("error_events").update({ seen: true });
    q = body?.id ? q.eq("id", body.id) : q.eq("seen", false);
    const { error } = await q;
    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    logError({ error, context: "PATCH /api/admin/errors" });
    return Response.json({ error: "Error" }, { status: 500 });
  }
}
