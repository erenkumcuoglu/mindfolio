import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${new URL(request.url).origin}/auth/callback?next=/studio`,
      }
    );

    if (error) {
      logError({ error, context: "POST /api/auth/reset-password" });
      return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    logError({ error, context: "POST /api/auth/reset-password" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
