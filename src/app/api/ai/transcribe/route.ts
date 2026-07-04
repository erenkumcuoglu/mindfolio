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

    // Mobil client'ta RN'nin FormData polyfill'i "Unsupported FormDataPart"
    // hatası verdiği için hem multipart hem JSON base64 body destekliyoruz.
    // JSON: { audioBase64: string, mimeType: string, filename?: string }
    let file: Blob | null = null;
    let mimeType = "audio/webm";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const b64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
      if (!b64) return reply({ error: "audioBase64 gerekli" }, 400);
      mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/mp4";
      try {
        const buf = Buffer.from(b64, "base64");
        file = new Blob([buf], { type: mimeType });
      } catch {
        return reply({ error: "audioBase64 çözümlenemedi" }, 400);
      }
    } else {
      const formData = await request.formData();
      const rawFile = formData.get("audio");
      if (!rawFile || !(rawFile instanceof Blob)) {
        return reply({ error: "Audio file required" }, 400);
      }
      file = rawFile;
      mimeType = rawFile.type || "audio/webm";
    }

    const allowedTypes = [
      "audio/mp3", "audio/mp4", "audio/mpeg", "audio/m4a",
      "audio/aac", "audio/wav", "audio/ogg", "audio/flac",
      "audio/webm", "audio/x-m4a",
    ];

    if (!allowedTypes.includes(mimeType) && !mimeType.startsWith("audio/")) {
      return reply({ error: `Unsupported audio type: ${mimeType}` }, 400);
    }

    if (file.size > 20 * 1024 * 1024) {
      return reply({ error: "File too large. Maximum 20MB." }, 400);
    }

    await checkUsageLimit(supabase, user.id);

    const admin = createAdminClient();
    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}.webm`;

    const { error: uploadError } = await admin
      .storage
      .from("recordings")
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload failed (continuing anyway):", uploadError.message);
    }

    const provider = await createProvider();
    const text = await provider.transcribe({ audio: file, mimeType });

    // Privacy & security: raw audio is NOT retained. Delete it immediately after
    // transcription; we only keep the transcript/draft.
    const { error: deleteError } = await admin
      .storage
      .from("recordings")
      .remove([storagePath]);

    if (deleteError) {
      console.error("Failed to delete temporary audio:", deleteError.message);
    }

    await incrementUsage(supabase, user.id);

    return reply({ text });
  } catch (error) {
    const message = userFacingMessage(error);
    logError({ error, userId, context: "POST /api/ai/transcribe" });
    return reply({ error: message }, 429);
  }
}
