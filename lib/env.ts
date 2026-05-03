export const env = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN ?? "",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export function validateEnv() {
  const missing = Object.entries(env)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Отсутствуют переменные окружения: ${missing.join(", ")}`);
  }
}
