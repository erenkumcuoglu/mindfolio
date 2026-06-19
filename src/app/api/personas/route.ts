import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  voice: z.string().max(2000).optional(),
  profile: z.record(z.unknown()).optional(),
  onboarding_complete: z.boolean().optional(),
  subscription: z
    .object({
      active: z.boolean(),
      plan: z.string().optional(),
      mock: z.boolean().optional(),
      subscribed_at: z.string().optional(),
      canceled_at: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return Response.json(data ?? null);
  } catch (error) {
    logError({ error, userId, context: "GET /api/personas" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const existing = await supabase
      .from("personas")
      .select("id, profile, onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing.data) {
      // Protect existing persona from profile overwrite
      const updates: Record<string, unknown> = {};

      if (parsed.data.name !== undefined) updates.name = parsed.data.name;
      if (parsed.data.description !== undefined) updates.description = parsed.data.description;
      if (parsed.data.voice !== undefined) updates.voice = parsed.data.voice;

      // Only allow profile overwrite if current profile is empty
      if (parsed.data.profile !== undefined) {
        const currentProfile = existing.data.profile as Record<string, unknown> | null;
        if (!currentProfile || Object.keys(currentProfile).length === 0) {
          updates.profile = parsed.data.profile;
        }
      }

      // Handle subscription merge into existing profile
      if (parsed.data.subscription !== undefined) {
        const currentProfile = (existing.data.profile ?? {}) as Record<string, unknown>;
        updates.profile = { ...currentProfile, subscription: parsed.data.subscription };
      }

      // Only allow onboarding_complete to be set to true (never reset to false)
      if (parsed.data.onboarding_complete === true) {
        updates.onboarding_complete = true;
      }

      const { data, error } = await supabase
        .from("personas")
        .update(updates)
        .eq("id", existing.data.id)
        .select()
        .single();

      if (error) throw error;
      return Response.json(data);
    }

    const { data, error } = await supabase
      .from("personas")
      .insert({
        user_id: user.id,
        name: parsed.data.name ?? "My Persona",
        description: parsed.data.description ?? "",
        voice: parsed.data.voice ?? "",
        profile: parsed.data.profile ?? {},
        onboarding_complete: parsed.data.onboarding_complete ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    logError({ error, userId, context: "PUT /api/personas" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
