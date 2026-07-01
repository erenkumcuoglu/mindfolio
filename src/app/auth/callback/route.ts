import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/studio";
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password reset recovery flow
      if (type === "recovery") {
        return Response.redirect(new URL("/update-password", origin));
      }
      // Onboarding gate — yeni kullanıcı persona/onboarding_complete yoksa onboarding'e gönder
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const persona = await supabase
          .from("personas")
          .select("onboarding_complete")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!persona.data?.onboarding_complete) {
          return Response.redirect(new URL("/onboarding", origin));
        }
      }
      return Response.redirect(new URL(next, origin));
    }
  }

  return Response.redirect(new URL("/login?error=auth", origin));
}
