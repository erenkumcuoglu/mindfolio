import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const submitSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().max(5000).optional(),
});

/**
 * GET /api/nps
 * Returns { show: boolean } — whether the NPS prompt should be displayed.
 * Conditions: 3+ jobs OR 7+ days since signup, and no prior response.
 */
export async function GET() {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // 1. Check if user already responded
    const { count: existing } = await supabase
      .from("nps_responses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (existing && existing > 0) {
      return Response.json({ show: false });
    }

    // 2. Count total jobs
    const { count: jobCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (jobCount && jobCount >= 3) {
      return Response.json({ show: true });
    }

    // 3. Check account age
    const createdAt = new Date(user.created_at);
    const daysSinceSignup = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSignup >= 7) {
      return Response.json({ show: true });
    }

    return Response.json({ show: false });
  } catch (error) {
    logError({ error, userId, context: "GET /api/nps" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

/**
 * POST /api/nps
 * Body: { score: 0-10, comment?: string }
 * Saves the NPS response and returns { success: true }.
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("nps_responses")
      .insert({
        user_id: user.id,
        score: parsed.data.score,
        comment: parsed.data.comment ?? null,
      });

    if (insertError) throw insertError;

    return Response.json({ success: true });
  } catch (error) {
    logError({ error, userId, context: "POST /api/nps" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
