import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const createSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  source_type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pillar: z.string().optional(),
  preview: z.record(z.unknown()).optional(),
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
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let preview = parsed.data.preview;
    if (parsed.data.url && !preview) {
      try {
        const previewRes = await fetch(
          `${request.nextUrl.origin}/api/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: parsed.data.url }),
          }
        );
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          preview = previewData.preview;
        }
      } catch {
        // preview fetch is best-effort
      }
    }

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        content: parsed.data.content ?? null,
        url: parsed.data.url || null,
        source_type: parsed.data.source_type ?? null,
        tags: parsed.data.tags ?? [],
        pillar: parsed.data.pillar ?? null,
        preview: preview ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "POST /api/ideas" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  content: z.string().nullable().optional(),
  url: z.string().url().nullable().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  pillar: z.string().nullable().optional(),
  preview: z.record(z.unknown()).nullable().optional(),
});

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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;

    const { data, error } = await supabase
      .from("ideas")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "PATCH /api/ideas" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("ideas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    logError({ error, userId, context: "DELETE /api/ideas" });
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
    const pillar = searchParams.get("pillar");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    let query = supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);

    if (pillar) query = query.eq("pillar", pillar);
    if (search) query = query.ilike("title", `%${search}%`);
    if (tag) query = query.contains("tags", [tag]);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (error) {
    logError({ error, userId, context: "GET /api/ideas" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
