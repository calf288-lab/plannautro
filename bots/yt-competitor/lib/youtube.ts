import { env } from "./env";

export interface VideoResult {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  url: string;
  channelUrl: string;
  thumbnailUrl: string;
  description: string;
}

export interface ChannelResult {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  channelUrl: string;
  description: string;
  avgViews: number; // среднее по топ-видео
  topVideos: VideoResult[];
}

const BASE = "https://www.googleapis.com/youtube/v3";

// Поиск топ видео по нише за последние N дней
export async function searchTopVideos(
  query: string,
  maxResults = 10,
  daysAgo = 90
): Promise<VideoResult[]> {
  const publishedAfter = new Date(Date.now() - daysAgo * 86400000).toISOString();

  // 1. Поиск видео
  const searchUrl = new URL(`${BASE}/search`);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "viewCount");
  searchUrl.searchParams.set("publishedAfter", publishedAfter);
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("relevanceLanguage", "ru");
  searchUrl.searchParams.set("key", env.YOUTUBE_API_KEY);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`YouTube search error ${searchRes.status}: ${err}`);
  }

  const searchData = (await searchRes.json()) as {
    items: { id: { videoId: string }; snippet: { title: string; channelId: string; channelTitle: string; publishedAt: string; description: string; thumbnails: { medium: { url: string } } } }[];
  };

  if (!searchData.items?.length) return [];

  const videoIds = searchData.items.map((i) => i.id.videoId).join(",");

  // 2. Получаем статистику видео
  const statsUrl = new URL(`${BASE}/videos`);
  statsUrl.searchParams.set("part", "statistics");
  statsUrl.searchParams.set("id", videoIds);
  statsUrl.searchParams.set("key", env.YOUTUBE_API_KEY);

  const statsRes = await fetch(statsUrl.toString());
  const statsData = (await statsRes.json()) as {
    items: { id: string; statistics: { viewCount: string; likeCount: string; commentCount: string } }[];
  };

  const statsMap = new Map(statsData.items.map((i) => [i.id, i.statistics]));

  return searchData.items.map((item) => {
    const stats = statsMap.get(item.id.videoId);
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      viewCount: parseInt(stats?.viewCount ?? "0"),
      likeCount: parseInt(stats?.likeCount ?? "0"),
      commentCount: parseInt(stats?.commentCount ?? "0"),
      publishedAt: item.snippet.publishedAt,
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
      channelUrl: `https://youtube.com/channel/${item.snippet.channelId}`,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? "",
      description: item.snippet.description?.slice(0, 200) ?? "",
    };
  }).sort((a, b) => b.viewCount - a.viewCount);
}

// Получить детали каналов-конкурентов
export async function getChannelsInfo(channelIds: string[]): Promise<ChannelResult[]> {
  if (!channelIds.length) return [];

  const url = new URL(`${BASE}/channels`);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", channelIds.join(","));
  url.searchParams.set("key", env.YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube channels error: ${err}`);
  }

  const data = (await res.json()) as {
    items: {
      id: string;
      snippet: { title: string; description: string };
      statistics: { subscriberCount: string; videoCount: string; viewCount: string };
    }[];
  };

  return (data.items ?? []).map((ch) => ({
    channelId: ch.id,
    channelTitle: ch.snippet.title,
    subscriberCount: parseInt(ch.statistics.subscriberCount ?? "0"),
    videoCount: parseInt(ch.statistics.videoCount ?? "0"),
    viewCount: parseInt(ch.statistics.viewCount ?? "0"),
    channelUrl: `https://youtube.com/channel/${ch.id}`,
    description: ch.snippet.description?.slice(0, 150) ?? "",
    avgViews: 0,
    topVideos: [],
  }));
}
