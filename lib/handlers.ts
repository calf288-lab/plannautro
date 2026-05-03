import { sendMessage, getFile, downloadFile } from "./telegram";
import { transcribeAudio } from "./transcribe";
import { parseTasks } from "./llm";
import { saveTasks, getTodayTasks, markDone, clearTodayTasks } from "./db";
import { formatTaskList, todayString } from "./format";

interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name?: string };
  chat: { id: number };
  text?: string;
  voice?: { file_id: string; mime_type?: string; duration?: number };
  audio?: { file_id: string; mime_type?: string };
}

function logError(label: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`${label}: ${err.message}\n${err.stack ?? ""}`);
  } else {
    try {
      console.error(`${label}: ${JSON.stringify(err)}`);
    } catch {
      console.error(`${label}: [non-serializable error]`);
    }
  }
}

export async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const userId = message.from?.id ?? chatId;
  const day = todayString();

  try {
    if (message.text) {
      const text = message.text.trim();

      if (text === "/start") {
        await sendMessage(
          chatId,
          `👋 Привет! Я бот утреннего планирования.\n\n` +
          `Расскажи мне свои планы на день — текстом или голосом — и я сохраню их как задачи.\n\n` +
          `Команды:\n` +
          `/today — задачи на сегодня\n` +
          `/done <номер> — отметить выполненной\n` +
          `/clear — очистить список`
        );
        return;
      }

      if (text === "/today") {
        const tasks = await getTodayTasks(userId, day);
        await sendMessage(chatId, formatTaskList(tasks));
        return;
      }

      if (text.startsWith("/done")) {
        const parts = text.split(" ");
        const num = parseInt(parts[1] ?? "", 10);
        if (isNaN(num) || num < 1) {
          await sendMessage(chatId, "❌ Укажите номер задачи. Пример: /done 2");
          return;
        }
        const ok = await markDone(userId, day, num);
        if (ok) {
          const tasks = await getTodayTasks(userId, day);
          await sendMessage(chatId, `✅ Задача ${num} выполнена!\n\n${formatTaskList(tasks)}`);
        } else {
          await sendMessage(chatId, `❌ Задача ${num} не найдена.`);
        }
        return;
      }

      if (text === "/clear") {
        const count = await clearTodayTasks(userId, day);
        await sendMessage(chatId, `🗑️ Удалено задач: ${count}`);
        return;
      }

      // Обычный текст — парсим как планы
      await sendMessage(chatId, "⏳ Анализирую ваши планы...");
      const tasks = await parseTasks(text);

      if (tasks.length === 0) {
        await sendMessage(
          chatId,
          `🤖 Я бот для планирования задач. Не понял, что нужно запланировать.\n\n` +
          `Попробуй написать что-то вроде:\n` +
          `"Сегодня нужно: позвонить врачу в 10, сходить в магазин, подготовить отчёт"\n\n` +
          `Или /today чтобы посмотреть текущий список.`
        );
        return;
      }

      await saveTasks(userId, tasks, day);
      const saved = await getTodayTasks(userId, day);
      await sendMessage(chatId, `✅ Добавлено задач: ${tasks.length}\n\n${formatTaskList(saved)}`);
      return;
    }

    // Голосовое сообщение
    if (message.voice || message.audio) {
      const file = message.voice ?? message.audio!;
      await sendMessage(chatId, "🎙️ Распознаю голосовое сообщение...");

      const fileUrl = await getFile(file.file_id);
      const audioBuffer = await downloadFile(fileUrl);
      const mimeType = file.mime_type ?? "audio/ogg";

      const transcription = await transcribeAudio(audioBuffer, mimeType);

      if (!transcription) {
        await sendMessage(chatId, "❌ Не удалось распознать речь. Попробуйте ещё раз.");
        return;
      }

      await sendMessage(chatId, `📝 Распознано: "${transcription.slice(0, 300)}"\n\n⏳ Анализирую...`);

      const tasks = await parseTasks(transcription);

      if (tasks.length === 0) {
        await sendMessage(chatId, "🤔 Не нашёл задач в голосовом. Попробуй описать конкретные планы на день.");
        return;
      }

      await saveTasks(userId, tasks, day);
      const saved = await getTodayTasks(userId, day);
      await sendMessage(chatId, `✅ Добавлено задач: ${tasks.length}\n\n${formatTaskList(saved)}`);
      return;
    }

    await sendMessage(chatId, "🤖 Пришли текст или голосовое сообщение с планами на день.");

  } catch (err) {
    logError("Handler error", err);
    try {
      await sendMessage(chatId, "❌ Произошла ошибка. Попробуйте позже.");
    } catch {
      // игнорируем
    }
  }
}
