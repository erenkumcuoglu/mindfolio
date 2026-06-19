import { createClient } from "@/lib/supabase/server";

export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobType = "transcribe" | "generate-linkedin" | "generate-substack" | "generate-blog";

export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  input: Record<string, unknown>;
  output: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export async function createJob(
  type: JobType,
  input: Record<string, unknown>
): Promise<Job> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({ type, input })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateJob(
  id: string,
  updates: Partial<Pick<Job, "status" | "output" | "error">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export async function listJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}
