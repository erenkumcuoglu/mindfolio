import { createClient } from "@/lib/supabase/server";

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  favicon: string;
  site_name: string;
  author: string;
  url: string;
  type: "link" | "youtube" | "twitter";
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  url: string | null;
  source_type: string | null;
  tags: string[];
  pillar: string | null;
  preview: LinkPreview | null;
  created_at: string;
  updated_at: string;
}

export async function createIdea(data: {
  title: string;
  content?: string;
  url?: string;
  source_type?: string;
  tags?: string[];
  pillar?: string;
  preview?: LinkPreview;
}): Promise<Idea> {
  const supabase = await createClient();
  const { data: idea, error } = await supabase
    .from("ideas")
    .insert({
      title: data.title,
      content: data.content ?? null,
      url: data.url ?? null,
      source_type: data.source_type ?? null,
      tags: data.tags ?? [],
      pillar: data.pillar ?? null,
      preview: data.preview ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return idea;
}

export async function updateIdea(
  id: string,
  updates: Partial<Pick<Idea, "title" | "content" | "tags" | "pillar" | "preview">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ideas")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteIdea(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function listIdeas(params?: {
  pillar?: string;
  tags?: string[];
  search?: string;
}): Promise<Idea[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.pillar) {
    query = query.eq("pillar", params.pillar);
  }

  if (params?.tags && params.tags.length > 0) {
    query = query.contains("tags", params.tags);
  }

  if (params?.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  const { data } = await query.limit(50);
  return data ?? [];
}
