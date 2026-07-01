import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createProvider } from "@/lib/ai";
import { createClientFromRequest } from "@/lib/supabase/from-request";
import { checkUsageLimit, incrementUsage } from "@/lib/db/usage";
import { userFacingMessage } from "@/lib/ai/errors";
import { logError } from "@/lib/log-error";
import { corsHeaders, corsPreflight } from "@/lib/cors";

const bodySchema = z.object({
  prompt: z.string().min(1).max(10000),
  format: z.enum(["linkedin", "substack", "medium", "blog", "x", "raw"]).optional(),
});

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

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return reply({ error: "Invalid request", details: parsed.error.flatten() }, 400);
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

    return reply(result);
  } catch (error) {
    const message = userFacingMessage(error);
    logError({ error, userId, context: "POST /api/ai/generate" });
    return reply({ error: message }, 429);
  }
}
