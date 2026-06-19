import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_MAX_AGE_SHORT = 60 * 60 * 4;

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const maxAge = parsed.data.rememberMe ? SESSION_MAX_AGE : SESSION_MAX_AGE_SHORT;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge })
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes("email not confirmed") ||
        error.code === "email_not_confirmed"
      ) {
        return Response.json(
          { error: "email_not_confirmed", email: parsed.data.email },
          { status: 403 }
        );
      }
      // Closed beta: treat all invalid credentials as "not invited"
      if (
        error.message?.toLowerCase().includes("invalid login credentials") ||
        error.message?.toLowerCase().includes("invalid credentials")
      ) {
        return Response.json(
          { error: "beta_only", email: parsed.data.email },
          { status: 403 }
        );
      }
      logError({ error, context: "POST /api/auth/login (signInWithPassword failed)" });
      return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 });
    }

    return Response.json({ success: true, user: data.user });
  } catch (error) {
    logError({ error, context: "POST /api/auth/login" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
