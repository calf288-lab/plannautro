import type { VideoResult } from "./youtube";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 30) return `${days} дн. назад`;
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
  return `${Math.floor(days / 365)} г. назад`;
}

export function formatVideoList(videos: VideoResult[], query: string): string {
  if (!videos.length) return `😔 По запросу "${query}" ничего не найдено. Попробуй другую нишу.`;

  const lines: string[] = [
    `🔍 Топ видео по нише: *${query}*`,
    `Найдено: ${videos.length} видео\n`,
  ];

  videos.slice(0, 10).forEach((v, i) => {
    lines.push(
      `${i + 1}. *${v.title.slice(0, 60)}${v.title.length > 60 ? "..." : ""}*\n` +
      `   📺 ${v.channelTitle}\n` +
      `   👁 ${formatNum(v.viewCount)} просм  👍 ${formatNum(v.likeCount)}  💬 ${formatNum(v.commentCount)}\n` +
      `   📅 ${daysAgo(v.publishedAt)}\n` +
      `   🔗 ${v.url}\n`
    );
  });

  return lines.join("\n");
}

export function formatTopChannels(channels: { channel_title: string; channel_url: string; total_views: number; video_count: number }[]): string {
  if (!channels.length) return "📊 Нет данных. Сначала выполни поиск по нише.";

  const lines = ["📊 *Топ каналы-конкуренты (из твоих поисков):*\n"];
  channels.forEach((ch, i) => {
    lines.push(
      `${i + 1}. *${ch.channel_title}*\n` +
      `   👁 ${formatNum(ch.total_views)} суммарных просм\n` +
      `   🎬 ${ch.video_count} видео в топе\n` +
      `   🔗 ${ch.channel_url}\n`
    );
  });
  return lines.join("\n");
}

export function formatHistory(history: { query: string; results_count: number; created_at: string }[]): string {
  if (!history.length) return "📋 История поисков пуста.";
  const lines = ["📋 *Последние поиски:*\n"];
  history.forEach((h, i) => {
    const date = new Date(h.created_at).toLocaleDateString("ru-RU");
    lines.push(`${i + 1}. "${h.query}" — ${h.results_count} видео (${date})`);
  });
  return lines.join("\n");
}
