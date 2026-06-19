import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    const { count: totalJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: totalDrafts } = await supabase
      .from("drafts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: totalIdeas } = await supabase
      .from("ideas")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: recentJobs } = await supabase
      .from("jobs")
      .select("created_at, type, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return Response.json({
      totalJobs: totalJobs ?? 0,
      totalDrafts: totalDrafts ?? 0,
      totalIdeas: totalIdeas ?? 0,
      recentJobs,
    });
  } catch (error) {
    logError({ error, userId, context: "GET /api/ai/usage" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
