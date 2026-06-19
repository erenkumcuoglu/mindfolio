import { NextRequest } from "next/server";
import { createProvider } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUsageLimit, incrementUsage } from "@/lib/db/usage";
import { userFacingMessage } from "@/lib/ai/errors";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const formData = await request.formData();
    const file = formData.get("audio");

    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: "Audio file required" }, { status: 400 });
    }

    const allowedTypes = [
      "audio/mp3", "audio/mp4", "audio/mpeg", "audio/m4a",
      "audio/aac", "audio/wav", "audio/ogg", "audio/flac",
      "audio/webm", "audio/x-m4a",
    ];

    const mimeType = file.type || "audio/webm";
    if (!allowedTypes.includes(mimeType) && !mimeType.startsWith("audio/")) {
      return Response.json(
        { error: `Unsupported audio type: ${mimeType}` },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return Response.json(
        { error: "File too large. Maximum 20MB." },
        { status: 400 }
      );
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

    const { error: deleteError } = await admin
      .storage
      .from("recordings")
      .remove([storagePath]);

    if (deleteError) {
      console.error("Failed to delete temporary audio:", deleteError.message);
    }

    await incrementUsage(supabase, user.id);

    return Response.json({ text });
  } catch (error) {
    const message = userFacingMessage(error);
    logError({ error, userId, context: "POST /api/ai/transcribe" });
    return Response.json({ error: message }, { status: 429 });
  }
}
