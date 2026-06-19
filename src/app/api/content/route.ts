import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  body: z.string().optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("content")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (error) {
    logError({ error, userId, context: "GET /api/content" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("content")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        category: parsed.data.category ?? null,
        tags: parsed.data.tags ?? [],
        notes: parsed.data.notes ?? null,
        body: parsed.data.body ?? null,
        scheduled_at: parsed.data.scheduled_at ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "POST /api/content" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    const { data, error } = await supabase
      .from("content")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "PATCH /api/content" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;

    const { id } = await request.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase
      .from("content")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    logError({ error, userId, context: "DELETE /api/content" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
