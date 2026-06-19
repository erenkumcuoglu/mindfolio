import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const bodySchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: parsed.data.current_password,
    });

    if (signInError) {
      return Response.json(
        { error: "Current password is incorrect" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.new_password,
    });

    if (updateError) throw updateError;

    return Response.json({ success: true });
  } catch (error) {
    logError({ error, context: "POST /api/auth/update-password" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
