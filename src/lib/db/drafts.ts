import { createClient } from "@/lib/supabase/server";

export interface Draft {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  source: "transcript" | "written" | "generated";
  transcript: string | null;
  idea_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function createDraft(data: {
  title?: string;
  content: string;
  source: Draft["source"];
  transcript?: string;
  idea_id?: string;
}): Promise<Draft> {
  const supabase = await createClient();
  const { data: draft, error } = await supabase
    .from("drafts")
    .insert({
      title: data.title ?? null,
      content: data.content,
      source: data.source,
      transcript: data.transcript ?? null,
      idea_id: data.idea_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return draft;
}

export async function updateDraft(
  id: string,
  updates: Partial<Pick<Draft, "title" | "content">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("drafts")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function getDraft(id: string): Promise<Draft | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export async function listDrafts(idea_id?: string): Promise<Draft[]> {
  const supabase = await createClient();
  let query = supabase
    .from("drafts")
    .select("*")
    .order("created_at", { ascending: false });

  if (idea_id) {
    query = query.eq("idea_id", idea_id);
  }

  const { data } = await query.limit(50);
  return data ?? [];
}
