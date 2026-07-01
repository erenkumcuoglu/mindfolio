import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  voice: z.string().max(2000).optional(),
  profile: z.record(z.unknown()).optional(),
  overwriteProfile: z.boolean().optional(),
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
  // Pillar edits — merged into profile.pillars without overwriting the rest.
  pillars: z
    .array(z.object({ title: z.string().min(1).max(200), description: z.string().max(500).optional() }))
    .optional(),
});

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });

  try {
    const supabase = await createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return reply({ error: "Unauthorized" }, 401);
    }
    userId = user.id;

    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return reply(data ?? null);
  } catch (error) {
    logError({ error, userId, context: "GET /api/personas" });
    return reply({ error: GENERIC_ERROR_MESSAGE }, 500);
  }
}

export async function PUT(request: NextRequest) {
  let userId: string | undefined;
  const cors = corsHeaders(request.headers.get("origin"));
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });

  try {
    const supabase = await createClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return reply({ error: "Unauthorized" }, 401);
    }
    userId = user.id;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return reply({ error: "Invalid request", details: parsed.error.flatten() }, 400);
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

      // Allow profile overwrite if current profile is empty OR the caller
      // explicitly opts in (e.g. regenerating the persona). Preserve the
      // existing subscription so billing state is never lost on regenerate.
      if (parsed.data.profile !== undefined) {
        const currentProfile = (existing.data.profile as Record<string, unknown> | null) ?? {};
        const isEmpty = Object.keys(currentProfile).length === 0;
        if (isEmpty || parsed.data.overwriteProfile) {
          updates.profile = currentProfile.subscription
            ? { ...parsed.data.profile, subscription: currentProfile.subscription }
            : parsed.data.profile;
        }
      }

      // Handle subscription merge into existing profile
      if (parsed.data.subscription !== undefined) {
        const currentProfile = (updates.profile ?? existing.data.profile ?? {}) as Record<string, unknown>;
        updates.profile = { ...currentProfile, subscription: parsed.data.subscription };
      }

      // Handle pillars merge into existing profile (does not overwrite the rest)
      if (parsed.data.pillars !== undefined) {
        const currentProfile = (updates.profile ?? existing.data.profile ?? {}) as Record<string, unknown>;
        updates.profile = { ...currentProfile, pillars: parsed.data.pillars };
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
      return reply(data);
    }

    // İlk kez oluşturma — INSERT (subscription varsa profile'a merge et)
    const insertProfile = parsed.data.subscription
      ? { ...(parsed.data.profile ?? {}), subscription: parsed.data.subscription }
      : (parsed.data.profile ?? {});
    const { data, error } = await supabase
      .from("personas")
      .insert({
        user_id: user.id,
        name: parsed.data.name ?? "My Persona",
        description: parsed.data.description ?? "",
        voice: parsed.data.voice ?? "",
        profile: insertProfile,
        onboarding_complete: parsed.data.onboarding_complete ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return reply(data);
  } catch (error) {
    logError({ error, userId, context: "PUT /api/personas" });
    return reply({ error: GENERIC_ERROR_MESSAGE }, 500);
  }
}
