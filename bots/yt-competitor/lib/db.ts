import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { VideoResult } from "./youtube";

function db() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// Сохранить результаты поиска
export async function saveSearch(userId: number, query: string, videos: VideoResult[]): Promise<void> {
  const client = db();

  // Сохраняем поиск
  const { data: search, error: searchErr } = await client
    .from("yt_searches")
    .insert({ user_id: userId, query, results_count: videos.length })
    .select("id")
    .single();

  if (searchErr) throw new Error(`Ошибка сохранения поиска: ${JSON.stringify(searchErr)}`);

  // Сохраняем видео
  if (videos.length && search) {
    const rows = videos.map((v) => ({
      search_id: search.id,
      user_id: userId,
      query,
      video_id: v.videoId,
      title: v.title,
      channel_id: v.channelId,
      channel_title: v.channelTitle,
      view_count: v.viewCount,
      like_count: v.likeCount,
      comment_count: v.commentCount,
      published_at: v.publishedAt,
      url: v.url,
      channel_url: v.channelUrl,
    }));

    const { error } = await client.from("yt_videos").insert(rows);
    if (error) throw new Error(`Ошибка сохранения видео: ${JSON.stringify(error)}`);
  }
}

// История поисков пользователя
export async function getSearchHistory(userId: number, limit = 5): Promise<{ query: string; results_count: number; created_at: string }[]> {
  const client = db();
  const { data, error } = await client
    .from("yt_searches")
    .select("query, results_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Ошибка истории: ${JSON.stringify(error)}`);
  return data ?? [];
}

// Топ каналы из всех поисков пользователя
export async function getTopChannels(userId: number, query?: string): Promise<{ channel_title: string; channel_url: string; total_views: number; video_count: number }[]> {
  const client = db();
  let q = client
    .from("yt_videos")
    .select("channel_title, channel_url, view_count")
    .eq("user_id", userId);

  if (query) q = q.ilike("query", `%${query}%`);

  const { data, error } = await q;
  if (error) throw new Error(`Ошибка топ каналов: ${JSON.stringify(error)}`);

  // Группируем по каналу
  const map = new Map<string, { channel_title: string; channel_url: string; total_views: number; video_count: number }>();
  for (const row of data ?? []) {
    const existing = map.get(row.channel_url) ?? { channel_title: row.channel_title, channel_url: row.channel_url, total_views: 0, video_count: 0 };
    existing.total_views += row.view_count;
    existing.video_count += 1;
    map.set(row.channel_url, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.total_views - a.total_views).slice(0, 10);
}
