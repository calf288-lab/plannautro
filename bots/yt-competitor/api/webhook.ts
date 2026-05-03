import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateEnv, env } from "../lib/env";
import { handleMessage } from "../lib/handlers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "YT Competitor Bot ready" });
  }

  const secret = req.headers["x-telegram-bot-api-secret-token"];
  try {
    validateEnv();
    if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      console.warn("Invalid webhook secret");
      return res.status(200).json({ ok: false });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Env error:", msg);
    return res.status(200).json({ ok: false });
  }

  try {
    const update = req.body as { message?: unknown };
    if (update.message) {
      await handleMessage(update.message as Parameters<typeof handleMessage>[0]);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Webhook error:", msg);
  }

  return res.status(200).json({ ok: true });
}
