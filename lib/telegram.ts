import { env } from "./env";

const API = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;

function truncate(text: string, max = 1000): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts: Record<string, unknown> = {}
): Promise<void> {
  const safeText = truncate(text);
  // Убираем parse_mode чтобы HTML-ошибки не ломали отправку
  const { parse_mode: _pm, ...restOpts } = opts as { parse_mode?: string; [key: string]: unknown };
  void _pm;

  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: safeText, ...restOpts }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage error: ${err}`);
  }
}

export async function getFile(fileId: string): Promise<string> {
  const res = await fetch(`${API}/getFile?file_id=${fileId}`);
  const data = (await res.json()) as { ok: boolean; result: { file_path: string } };
  if (!data.ok) throw new Error("Не удалось получить файл от Telegram");
  return `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${data.result.file_path}`;
}

export async function downloadFile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ошибка загрузки файла: ${res.status}`);
  return res.arrayBuffer();
}
