import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateEnv, env } from "../lib/env";
import { handleMessage } from "../lib/handlers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Webhook ready" });
  }

  // Проверка секрета
  const secret = req.headers["x-telegram-bot-api-secret-token"];
  try {
    validateEnv();
    if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      console.warn("Invalid webhook secret");
      return res.status(200).json({ ok: false });
    }
  } catch (err) {
    console.error("Env validation error:", JSON.stringify(err));
    return res.status(200).json({ ok: false });
  }

  try {
    const update = req.body as { message?: unknown };
    if (update.message) {
      // Ждём обработку — иначе Vercel убьёт функцию до завершения
      await handleMessage(update.message as Parameters<typeof handleMessage>[0]);
    }
  } catch (err) {
    console.error("Webhook error:", JSON.stringify(err));
  }

  return res.status(200).json({ ok: true });
}
