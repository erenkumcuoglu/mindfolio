// Supabase Edge Function: async audio transcription.
//
// Flow: the client uploads audio to the `recordings` bucket, inserts a
// transcript_jobs row (RLS-guarded), then invokes this function with { jobId }.
// We respond 202 immediately and finish the work in the background
// (EdgeRuntime.waitUntil) so the client isn't coupled to the Gemini call
// duration — the client polls the job row for the result. Raw audio is deleted
// after transcription (privacy).
//
// Deploy:  supabase functions deploy transcribe
// Secret:  supabase secrets set GEMINI_API_KEY=...
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "gemini-2.5-flash";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type Admin = any;

async function processJob(admin: Admin, jobId: string): Promise<void> {
  const { data: job } = await admin
    .from("transcript_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (!job) return;

  try {
    await admin
      .from("transcript_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    // Security: a job may only reference audio under its own owner's folder.
    if (!String(job.storage_path).startsWith(`${job.user_id}/`)) {
      throw new Error("Invalid storage path");
    }

    const { data: blob, error: dlErr } = await admin
      .storage
      .from("recordings")
      .download(job.storage_path);
    if (dlErr || !blob) throw new Error("Audio not found in storage");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const base64 = encodeBase64(bytes);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: job.mime_type || "audio/mp4", data: base64 } },
                { text: "Transcribe the audio exactly as heard. Do not summarize or clean up." },
              ],
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini error ${res.status}: ${t.slice(0, 300)}`);
    }

    const jr = await res.json();
    const text: string = (jr?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Empty transcription");

    await admin
      .from("transcript_jobs")
      .update({ status: "done", result: text, updated_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (e) {
    await admin
      .from("transcript_jobs")
      .update({
        status: "error",
        error: String((e as Error)?.message ?? e),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } finally {
    // Privacy: raw audio is never retained, whether or not transcription worked.
    try {
      await admin.storage.from("recordings").remove([job.storage_path]);
    } catch (_) {
      // best effort
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { jobId } = await req.json().catch(() => ({}));
    if (!jobId || typeof jobId !== "string") return json({ error: "jobId required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const work = processJob(admin, jobId);
    // Respond immediately; keep processing in the background.
    // deno-lint-ignore no-explicit-any
    const edge = (globalThis as any).EdgeRuntime;
    if (edge?.waitUntil) edge.waitUntil(work);
    else await work;

    return json({ ok: true, jobId }, 202);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
