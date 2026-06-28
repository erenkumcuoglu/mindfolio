import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { createAdminClient } from "@/lib/supabase/admin";

/** Server-component gate: is the current (cookie) user an admin? */
export async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

/** API-route gate: returns the admin user or null (supports cookie + bearer). */
export async function requireAdmin(request: NextRequest): Promise<{ id: string } | null> {
  const supabase = await createClientFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? { id: user.id } : null;
}
