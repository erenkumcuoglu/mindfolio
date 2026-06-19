import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const bodySchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  source: z.enum(["transcript", "written", "generated"]),
  transcript: z.string().optional(),
  idea_id: z.string().uuid().optional().nullable(),
});

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
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("drafts")
      .insert({
        user_id: user.id,
        title: parsed.data.title ?? null,
        content: parsed.data.content,
        source: parsed.data.source,
        transcript: parsed.data.transcript ?? null,
        idea_id: parsed.data.idea_id ?? null,
      })
      .select("*, idea:ideas(id, title, preview)")
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "POST /api/drafts" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get("idea_id");

    let query = supabase
      .from("drafts")
      .select("*, idea:ideas(id, title, preview)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (idea_id) {
      query = query.eq("idea_id", idea_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (error) {
    logError({ error, userId, context: "GET /api/drafts" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    const parsed = z
      .object({
        id: z.string().uuid(),
        idea_id: z.string().uuid().nullable(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("drafts")
      .update({ idea_id: parsed.data.idea_id })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select("*, idea:ideas(id, title, preview)")
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "PATCH /api/drafts" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
