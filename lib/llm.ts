import { env } from "./env";

export interface ParsedTask {
  text: string;
  time: string | null;
}

const SYSTEM_PROMPT = `Ты помощник утреннего планирования. Пользователь описывает свои планы на день.
Твоя задача — извлечь конкретные задачи/дела из текста.

ВАЖНО:
- Если текст содержит конкретные планы, задачи или дела — извлеки их как задачи
- Если текст НЕ содержит планов (например просто вопрос, приветствие, "ясно", "окей", "привет") — верни пустой массив []
- Каждая задача — отдельный объект с полями text и time
- Если указано время — запиши его (формат HH:MM или описание). Иначе time = null

Верни ТОЛЬКО валидный JSON массив. Без markdown, без пояснений, только JSON:
[{"text": "текст задачи", "time": "09:00"}]
или [] если задач нет.`;

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
    const errText = await res.text();
    throw new Error(`Groq LLM error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  const content = (data.choices[0]?.message?.content ?? "[]").trim();

  // Очищаем markdown-обёртки если LLM всё же добавил
  const clean = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const parsed = JSON.parse(clean) as ParsedTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (parseErr) {
    // Логируем полный текст ответа для отладки
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    throw new Error(`JSON parse error: ${msg}. LLM вернул: "${clean.slice(0, 300)}"`);
  }
}
