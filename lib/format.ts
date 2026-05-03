import type { Task } from "./db";

export function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return "📋 Список задач пуст.";

  const lines = tasks.map((t, i) => {
    const done = t.done ? "✅" : "🔲";
    const time = t.time ? ` [${t.time}]` : "";
    return `${done} ${i + 1}.${time} ${t.text}`;
  });

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;

  return `📋 Задачи на сегодня (${doneCount}/${total}):\n\n${lines.join("\n")}`;
}
