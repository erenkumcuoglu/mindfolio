import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendAlert } from "@/lib/log-error";

/** Admin-only: fire a real test alert (Telegram / webhook) to verify config. */
export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) return Response.json({ error: "Forbidden" }, { status: 403 });

  const telegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const webhook = !!process.env.MINDFOLIO_ALERT_WEBHOOK;

  sendAlert("Bu bir TEST bildirimidir — entegrasyon çalışıyor ✅", "manual test");

  return Response.json({
    ok: true,
    sent: telegram || webhook,
    channels: { telegram, webhook },
    hint: telegram
      ? "Telegram'a mesaj gönderildi. Gelmedi ise bota önce /start deyip bir mesaj attığından emin ol."
      : "Telegram env değişkenleri görünmüyor. Sunucuyu .env yükledikten sonra yeniden başlat.",
  });
}
