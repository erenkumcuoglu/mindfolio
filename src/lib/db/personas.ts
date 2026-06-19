import { createClient } from "@/lib/supabase/server";

export interface PersonaProfile {
  purpose: string;
  topics: string[];
  professional_background: string;
  linkedin_url: string;
  demographics: {
    industry: string;
    role: string;
    experience: string;
  };
  tone: {
    style: string;
    formality: string;
    humor: string;
    voice: string;
  };
  writing_samples: string[];
  values: string[];
  audience: string;
  positioning_statement?: string;
  pillars?: { title: string; description: string }[];
  voice_profile?: string[];
  differentiation?: { do: string[]; dont: string[] };
  sample_post?: string;
  suggested_platforms?: string[];
  cadence?: string;
}

export interface Persona {
  id: string;
  user_id: string;
  name: string;
  description: string;
  voice: string;
  profile: PersonaProfile;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export async function upsertPersona(data: {
  name: string;
  description?: string;
  voice?: string;
  profile?: PersonaProfile;
  onboarding_complete?: boolean;
}): Promise<Persona> {
  const supabase = await createClient();

  const existing = await supabase
    .from("personas")
    .select("id")
    .limit(1)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    name: data.name,
  };
  if (data.description !== undefined) payload.description = data.description;
  if (data.voice !== undefined) payload.voice = data.voice;
  if (data.profile !== undefined) payload.profile = data.profile;
  if (data.onboarding_complete !== undefined)
    payload.onboarding_complete = data.onboarding_complete;

  if (existing.data) {
    const { data: persona, error } = await supabase
      .from("personas")
      .update(payload)
      .eq("id", existing.data.id)
      .select()
      .single();

    if (error) throw error;
    return persona;
  }

  const { data: persona, error } = await supabase
    .from("personas")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return persona;
}

export async function getPersona(): Promise<Persona | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personas")
    .select("*")
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getPersonaByUserId(
  userId: string
): Promise<Persona | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personas")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}
