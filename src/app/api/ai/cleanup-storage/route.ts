import { createAdminClient } from "@/lib/supabase/admin";
import { logError, GENERIC_ERROR_MESSAGE } from "@/lib/log-error";

/**
 * Cleans up audio recordings older than 1 hour.
 * Can be called by an external cron (Vercel Cron, GitHub Actions, etc.)
 * or manually for testing.
 *
 * GET /api/ai/cleanup-storage
 * Returns the number of files deleted.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: folders, error: listError } = await admin
      .storage
      .from("recordings")
      .list("", { limit: 1000 });

    if (listError) {
      return Response.json({ deleted: 0, error: listError.message }, { status: 200 });
    }

    if (!folders || folders.length === 0) {
      return Response.json({ deleted: 0 });
    }

    let totalDeleted = 0;

    for (const folder of folders) {
      if (!folder.id) continue;

      const { data: files } = await admin
        .storage
        .from("recordings")
        .list(folder.name, { limit: 1000 });

      if (!files || files.length === 0) continue;

      const toRemove: string[] = [];

      for (const file of files) {
        const createdAt = new Date(file.created_at ?? file.updated_at ?? 0);
        if (createdAt < new Date(oneHourAgo)) {
          toRemove.push(`${folder.name}/${file.name}`);
        }
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await admin
          .storage
          .from("recordings")
          .remove(toRemove);

        if (!removeError) {
          totalDeleted += toRemove.length;
        }
      }
    }

    return Response.json({ deleted: totalDeleted });
  } catch (error) {
    logError({ error, context: "GET /api/ai/cleanup-storage" });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
