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

export async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const userId = message.from?.id ?? chatId;
  const day = todayString();

  try {
    // Команды
    if (message.text) {
      const text = message.text.trim();

      if (text === "/start") {
        await sendMessage(
          chatId,
          `👋 Привет! Я бот утреннего планирования.\n\n` +
            `Просто напиши или надиктуй свои планы на день, и я сохраню их как задачи.\n\n` +
            `Команды:\n` +
            `/today — показать задачи на сегодня\n` +
            `/done <номер> — отметить задачу выполненной\n` +
            `/clear — очистить задачи на сегодня`
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
          await sendMessage(chatId, `✅ Задача ${num} отмечена выполненной!`);
          const tasks = await getTodayTasks(userId, day);
          await sendMessage(chatId, formatTaskList(tasks));
        } else {
          await sendMessage(chatId, `❌ Задача с номером ${num} не найдена.`);
        }
        return;
      }

      if (text === "/clear") {
        const count = await clearTodayTasks(userId, day);
        await sendMessage(chatId, `🗑️ Удалено задач: ${count}`);
        return;
      }

      // Обычный текст — парсим как планы на день
      await sendMessage(chatId, "⏳ Анализирую ваши планы...");
      const tasks = await parseTasks(text);

      if (tasks.length === 0) {
        await sendMessage(chatId, "🤔 Не удалось распознать задачи. Попробуйте описать планы подробнее.");
        return;
      }

      await saveTasks(userId, tasks, day);
      const saved = await getTodayTasks(userId, day);
      await sendMessage(chatId, `✅ Сохранено ${tasks.length} задач!\n\n${formatTaskList(saved)}`);
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

      await sendMessage(chatId, `📝 Распознано:\n"${transcription.slice(0, 300)}"\n\n⏳ Анализирую планы...`);

      const tasks = await parseTasks(transcription);

      if (tasks.length === 0) {
        await sendMessage(chatId, "🤔 Не удалось распознать задачи. Попробуйте описать планы подробнее.");
        return;
      }

      await saveTasks(userId, tasks, day);
      const saved = await getTodayTasks(userId, day);
      await sendMessage(chatId, `✅ Сохранено ${tasks.length} задач!\n\n${formatTaskList(saved)}`);
      return;
    }

    await sendMessage(chatId, "🤖 Пришлите текст или голосовое сообщение с планами на день.");
  } catch (err) {
    console.error("Handler error:", JSON.stringify(err));
    try {
      await sendMessage(chatId, "❌ Произошла ошибка. Попробуйте позже.");
    } catch {
      // игнорируем ошибку отправки
    }
  }
}
