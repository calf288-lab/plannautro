import { env } from "./env";

export interface ParsedTask {
  text: string;
  time: string | null;
}

const SYSTEM_PROMPT = `Ты помощник утреннего планирования. Пользователь описывает свои планы на день.
Извлеки список задач из текста. Каждая задача — отдельный пункт.
Если указано время — запомни его для задачи (формат HH:MM или примерное описание).
Верни ТОЛЬКО валидный JSON массив объектов вида:
[{"text": "текст задачи", "time": "09:00 или null"}]
Без markdown, без пояснений — только JSON.`;

export async function parseTasks(userText: string): Promise<ParsedTask[]> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq LLM error: ${err}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  const content = data.choices[0]?.message?.content ?? "[]";

  try {
    const parsed = JSON.parse(content) as ParsedTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error(`Не удалось разобрать ответ LLM: ${content.slice(0, 200)}`);
  }
}
