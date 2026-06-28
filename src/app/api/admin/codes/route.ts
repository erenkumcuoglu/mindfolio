import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log-error";

const createSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  kind: z.enum(["one_time", "multi"]).default("multi"),
  max_uses: z.number().int().positive().nullable().optional(),
  duration_days: z.number().int().positive().max(3650).default(90),
});

const patchSchema = z.object({ id: z.string().uuid(), active: z.boolean() });

function genCode(len = 7): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false });
  return Response.json({ codes: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    const admin = createAdminClient();
    const code = (parsed.data.code?.trim() || genCode()).toUpperCase();
    const max_uses = parsed.data.kind === "one_time" ? 1 : parsed.data.max_uses ?? null;

    const { data, error } = await admin
      .from("promo_codes")
      .insert({
        code,
        kind: parsed.data.kind,
        max_uses,
        duration_days: parsed.data.duration_days,
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return Response.json({ error: "Bu kod zaten var." }, { status: 409 });
      throw error;
    }
    return Response.json({ code: data });
  } catch (error) {
    logError({ error, context: "POST /api/admin/codes" });
    return Response.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("promo_codes").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  return Response.json({ ok: true });
}
