import { NextRequest } from "next/server";
import { createProvider } from "@/lib/ai";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit, incrementUsage } from "@/lib/db/usage";
import { userFacingMessage } from "@/lib/ai/errors";
import { logError } from "@/lib/log-error";
import { corsHeaders, corsPreflight } from "@/lib/cors";

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
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

    const contentType = request.headers.get("content-type") || "";

    // ── Storage-path flow (preferred) ───────────────────────────────────
    // The client uploads audio DIRECTLY to Supabase Storage, then sends only
    // { storagePath, mimeType }. This keeps the request body tiny and avoids
    // Netlify's 6MB synchronous-function body limit, which previously killed
    // any recording longer than ~4-5 min. The server downloads the object with
    // the admin client, transcribes it, then deletes it (privacy: raw audio is
    // never retained).
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));

      if (typeof body?.storagePath === "string" && body.storagePath) {
        const storagePath: string = body.storagePath;
        // Security: a user may only transcribe files under their own folder.
        if (!storagePath.startsWith(`${user.id}/`)) {
          return reply({ error: "Forbidden" }, 403);
        }
        const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/mp4";

        await checkUsageLimit(supabase, user.id);

        const admin = createAdminClient();
        const { data: downloaded, error: downloadError } = await admin
          .storage
          .from("recordings")
          .download(storagePath);

        if (downloadError || !downloaded) {
          return reply({ error: "Audio not found in storage" }, 404);
        }
        if (downloaded.size > MAX_AUDIO_BYTES) {
          // Clean up the oversized upload before bailing.
          await admin.storage.from("recordings").remove([storagePath]);
          return reply({ error: "File too large. Maximum 20MB." }, 400);
        }

        const provider = await createProvider();
        const text = await provider.transcribe({ audio: downloaded, mimeType });

        // Privacy & security: delete the raw audio immediately after transcription.
        const { error: deleteError } = await admin
          .storage
          .from("recordings")
          .remove([storagePath]);
        if (deleteError) {
          console.error("Failed to delete temporary audio:", deleteError.message);
        }

        await incrementUsage(supabase, user.id);
        return reply({ text });
      }

      // ── Legacy JSON base64 flow (kept for backwards compatibility) ─────────
      // Older mobile builds send { audioBase64, mimeType }. Subject to the 6MB
      // body limit; superseded by the storage-path flow above.
      const b64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
      if (!b64) return reply({ error: "storagePath veya audioBase64 gerekli" }, 400);
      const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/mp4";
      let file: Blob;
      try {
        const buf = Buffer.from(b64, "base64");
        file = new Blob([buf], { type: mimeType });
      } catch {
        return reply({ error: "audioBase64 çözümlenemedi" }, 400);
      }
      return await transcribeInline(file, mimeType, supabase, user.id, reply);
    }

    // ── Legacy multipart flow (web) ───────────────────────────────────
    const formData = await request.formData();
    const rawFile = formData.get("audio");
    if (!rawFile || !(rawFile instanceof Blob)) {
      return reply({ error: "Audio file required" }, 400);
    }
    const mimeType = rawFile.type || "audio/webm";
    return await transcribeInline(rawFile, mimeType, supabase, user.id, reply);
  } catch (error) {
    const message = userFacingMessage(error);
    logError({ error, userId, context: "POST /api/ai/transcribe" });
    return reply({ error: message }, 429);
  }
}

/**
 * Legacy path: the audio bytes arrive in the request body (multipart or base64).
 * Staged through Storage only for the 1h-retention cleanup, then transcribed and
 * deleted. Kept so older clients keep working during the storage-path rollout.
 */
async function transcribeInline(
  file: Blob,
  mimeType: string,
  supabase: Awaited<ReturnType<typeof createClientFromRequest>>,
  uid: string,
  reply: (data: unknown, status?: number) => Response,
): Promise<Response> {
  const allowed = mimeType.startsWith("audio/");
  if (!allowed) return reply({ error: `Unsupported audio type: ${mimeType}` }, 400);
  if (file.size > MAX_AUDIO_BYTES) return reply({ error: "File too large. Maximum 20MB." }, 400);

  await checkUsageLimit(supabase, uid);

  const admin = createAdminClient();
  const storagePath = `${uid}/${Date.now()}.webm`;
  const { error: uploadError } = await admin
    .storage
    .from("recordings")
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError) {
    console.error("Storage upload failed (continuing anyway):", uploadError.message);
  }

  const provider = await createProvider();
  const text = await provider.transcribe({ audio: file, mimeType });

  const { error: deleteError } = await admin.storage.from("recordings").remove([storagePath]);
  if (deleteError) {
    console.error("Failed to delete temporary audio:", deleteError.message);
  }

  await incrementUsage(supabase, uid);
  return reply({ text });
}
