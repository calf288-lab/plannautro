export const env = {
  get TELEGRAM_TOKEN() { return process.env.YT_TELEGRAM_TOKEN ?? ""; },
  get TELEGRAM_WEBHOOK_SECRET() { return process.env.YT_TELEGRAM_WEBHOOK_SECRET ?? ""; },
  get YOUTUBE_API_KEY() { return process.env.YOUTUBE_API_KEY ?? ""; },
  get SUPABASE_URL() { return process.env.SUPABASE_URL ?? ""; },
  get SUPABASE_SERVICE_ROLE_KEY() { return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""; },
};

export function validateEnv() {
  const keys = ["YT_TELEGRAM_TOKEN", "YOUTUBE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Отсутствуют переменные: ${missing.join(", ")}`);
}
