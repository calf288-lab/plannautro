import { env } from "./env";

const API = () => `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;

function truncate(text: string, max = 4000): string {
  return text.length <= max ? text : text.slice(0, max - 3) + "...";
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const res = await fetch(`${API()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: truncate(text) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage error: ${err}`);
  }
}

export async function sendMessageMd(chatId: number, text: string): Promise<void> {
  // Сначала пробуем с Markdown, при ошибке — без
  const res = await fetch(`${API()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: truncate(text), parse_mode: "Markdown" }),
  });
  if (!res.ok) {
    await sendMessage(chatId, text);
  }
}
