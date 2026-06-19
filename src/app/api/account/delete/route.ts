import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

const bodySchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "You must confirm with { confirm: true }" }),
  }),
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
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const userId = user.id;

    const tables = ["drafts", "ideas", "personas", "jobs"] as const;
    for (const table of tables) {
      const { error: delErr } = await admin
        .from(table)
        .delete()
        .eq("user_id", userId);

      if (delErr) {
        logError({ error: delErr, userId, context: `DELETE ${table} (account deletion)` });
      }
    }

    const { data: fileList, error: listErr } = await admin
      .storage
      .from("recordings")
      .list(userId, { limit: 1000 });

    if (!listErr && fileList && fileList.length > 0) {
      const filePaths = fileList.map((f) => `${userId}/${f.name}`);
      const { error: removeErr } = await admin
        .storage
        .from("recordings")
        .remove(filePaths);

      if (removeErr) {
        logError({ error: removeErr, userId, context: "Storage cleanup (account deletion)" });
      }
    }

    const { error: deleteUserErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserErr) {
      logError({ error: deleteUserErr, userId, context: "Delete auth user (account deletion)" });
      return Response.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message:
        "Your account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    logError({ error, context: "POST /api/account/delete" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
