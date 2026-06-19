import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageStats } from "@/lib/db/usage";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

export async function GET(_request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const stats = await getUsageStats(supabase, user.id);
    return Response.json(stats);
  } catch (error) {
    logError({ error, userId, context: "GET /api/usage" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
