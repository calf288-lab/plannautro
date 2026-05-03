import { sendMessage, sendMessageMd } from "./telegram";
import { searchTopVideos } from "./youtube";
import { saveSearch, getSearchHistory, getTopChannels } from "./db";
import { formatVideoList, formatTopChannels, formatHistory } from "./format";

interface TgMessage {
  from?: { id: number; first_name?: string };
  chat: { id: number };
  text?: string;
}

function logError(label: string, err: unknown) {
  if (err instanceof Error) console.error(`${label}: ${err.message}`);
  else try { console.error(`${label}: ${JSON.stringify(err)}`); } catch { console.error(`${label}: [unknown]`); }
}

// Парсим период из текста: "за месяц", "за неделю", "за год"
function parsePeriod(text: string): number {
  if (/неделю|7 дн/i.test(text)) return 7;
  if (/месяц|30 дн/i.test(text)) return 30;
  if (/год|365/i.test(text)) return 365;
  return 90; // по умолчанию 3 месяца
}

// Парсим количество результатов
function parseCount(text: string): number {
  const match = text.match(/топ[\s-]*(\d+)/i);
  if (match) return Math.min(parseInt(match[1]), 25);
  return 10;
}

export async function handleMessage(message: TgMessage): Promise<void> {
  const chatId = message.chat.id;
  const userId = message.from?.id ?? chatId;
  const text = message.text?.trim() ?? "";

  try {
    if (text === "/start") {
      await sendMessage(chatId,
        `🎯 Привет! Я бот для поиска конкурентов на YouTube.\n\n` +
        `Просто напиши нишу — и я найду топ видео по просмотрам.\n\n` +
        `Примеры:\n` +
        `• AI инструменты\n` +
        `• фитнес для начинающих\n` +
        `• криптовалюта 2024\n` +
        `• топ 20 маркетинг за месяц\n\n` +
        `Команды:\n` +
        `/competitors — топ каналы из всех поисков\n` +
        `/history — история поисков\n` +
        `/help — подсказки`
      );
      return;
    }

    if (text === "/help") {
      await sendMessage(chatId,
        `📖 Как пользоваться:\n\n` +
        `Напиши любую нишу или ключевые слова:\n` +
        `"AI tools" — найдёт топ 10 видео за 90 дней\n` +
        `"топ 20 фитнес" — найдёт топ 20 видео\n` +
        `"маркетинг за месяц" — найдёт за последний месяц\n` +
        `"криптовалюта за год" — найдёт за год\n\n` +
        `После нескольких поисков используй /competitors чтобы увидеть сводку лучших каналов.`
      );
      return;
    }

    if (text === "/competitors") {
      await sendMessage(chatId, "📊 Собираю топ каналы из твоих поисков...");
      const channels = await getTopChannels(userId);
      await sendMessageMd(chatId, formatTopChannels(channels));
      return;
    }

    if (text === "/history") {
      const history = await getSearchHistory(userId, 10);
      await sendMessageMd(chatId, formatHistory(history));
      return;
    }

    if (text.startsWith("/")) {
      await sendMessage(chatId, "❓ Неизвестная команда. Напиши /help для подсказок.");
      return;
    }

    // Поиск по нише
    const days = parsePeriod(text);
    const count = parseCount(text);
    // Убираем служебные слова для чистого запроса
    const query = text.replace(/топ[\s-]*\d+/i, "").replace(/за (неделю|месяц|год|\d+ дн\.?)/i, "").trim() || text;

    const periodLabel = days === 7 ? "неделю" : days === 30 ? "месяц" : days === 365 ? "год" : "3 месяца";
    await sendMessage(chatId, `🔍 Ищу топ ${count} видео по нише "${query}" за ${periodLabel}...`);

    const videos = await searchTopVideos(query, count, days);
    await saveSearch(userId, query, videos);
    await sendMessageMd(chatId, formatVideoList(videos, query));

    if (videos.length > 0) {
      const uniqueChannels = [...new Set(videos.map(v => v.channelTitle))].slice(0, 5).join(", ");
      await sendMessage(chatId, `💡 Найдено ${videos.length} видео от ${[...new Set(videos.map(v => v.channelId))].length} каналов.\nТоп каналы: ${uniqueChannels}\n\nИспользуй /competitors чтобы увидеть сводку всех конкурентов.`);
    }

  } catch (err) {
    logError("YT Handler error", err);
    try {
      await sendMessage(chatId, "❌ Произошла ошибка. Попробуйте позже.");
    } catch { /* ignore */ }
  }
}
