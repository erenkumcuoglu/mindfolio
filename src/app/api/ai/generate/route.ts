import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createProvider } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "@/lib/db/usage";
import { userFacingMessage } from "@/lib/ai/errors";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const bodySchema = z.object({
  prompt: z.string().min(1).max(10000),
  format: z.enum(["linkedin", "substack", "blog", "x", "raw"]).optional(),
});

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await checkUsageLimit(supabase, user.id);

    const persona = await supabase
      .from("personas")
      .select("profile")
      .eq("user_id", user.id)
      .maybeSingle();

    const provider = await createProvider();
    const result = await provider.generate({
      prompt: parsed.data.prompt,
      format: parsed.data.format,
      personaProfile: persona.data?.profile ?? undefined,
    });

    await incrementUsage(supabase, user.id);

    return Response.json(result);
  } catch (error) {
    const message = userFacingMessage(error);
    logError({ error, userId, context: "POST /api/ai/generate" });
    return Response.json({ error: message }, { status: 429 });
  }
}
