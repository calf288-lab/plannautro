import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { ParsedTask } from "./llm";

export interface Task {
  id: bigint;
  user_id: bigint;
  text: string;
  time: string | null;
  day: string;
  done: boolean;
  created_at: string;
}

function getClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function saveTasks(userId: number, tasks: ParsedTask[], day: string): Promise<void> {
  const client = getClient();
  const rows = tasks.map((t) => ({
    user_id: userId,
    text: t.text,
    time: t.time ?? null,
    day,
    done: false,
  }));

  const { error } = await client.from("tasks").insert(rows);
  if (error) {
    throw new Error(`Ошибка сохранения задач: ${JSON.stringify(error)}`);
  }
}

export async function getTodayTasks(userId: number, day: string): Promise<Task[]> {
  const client = getClient();
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("day", day)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Ошибка получения задач: ${JSON.stringify(error)}`);
  }
  return (data ?? []) as Task[];
}

export async function markDone(userId: number, day: string, taskNum: number): Promise<boolean> {
  const client = getClient();
  const { data, error } = await client
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("day", day)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Ошибка поиска задачи: ${JSON.stringify(error)}`);

  const tasks = data ?? [];
  const task = tasks[taskNum - 1];
  if (!task) return false;

  const { error: upErr } = await client
    .from("tasks")
    .update({ done: true })
    .eq("id", task.id);

  if (upErr) throw new Error(`Ошибка обновления задачи: ${JSON.stringify(upErr)}`);
  return true;
}

export async function clearTodayTasks(userId: number, day: string): Promise<number> {
  const client = getClient();
  const { data, error } = await client
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("day", day)
    .select("id");

  if (error) throw new Error(`Ошибка очистки задач: ${JSON.stringify(error)}`);
  return (data ?? []).length;
}
