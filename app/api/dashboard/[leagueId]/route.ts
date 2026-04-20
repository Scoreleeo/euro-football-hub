import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { config } from "@/lib/config";
import { getDashboardData } from "@/lib/api-football/services";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  link?: string;
  image?: string;
  kind: string;
};

const parser = new Parser();

// 🔥 REAL football feeds
const FEEDS = [
  {
    source: "BBC Sport",
    url: "http://feeds.bbci.co.uk/sport/football/rss.xml",
  },
];

function stripHtml(value?: string) {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").trim();
}

function detectKind(title: string) {
  const t = title.toLowerCase();

  if (t.includes("breaking")) return "breaking";
  if (t.includes("injury") || t.includes("doubt")) return "injury";
  if (t.includes("transfer") || t.includes("sign")) return "transfer";

  return "news";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await context.params;

  const season = Number(
    request.nextUrl.searchParams.get("season") || config.defaultSeason
  );

  const payload = await getDashboardData(Number(leagueId), season);

  let news: NewsItem[] = [];

  try {
    const feedResults = await Promise.all(
      FEEDS.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);

        return parsed.items.slice(0, 6).map((item: any, i: number) => ({
          id: `${feed.source}-${i}`,
          title: item.title || "",
          summary: stripHtml(item.contentSnippet || item.content || ""),
          source: feed.source,
          date: item.isoDate || item.pubDate || new Date().toISOString(),
          link: item.link,
          image: item.enclosure?.url || undefined,
          kind: detectKind(item.title || ""),
        }));
      })
    );

    news = feedResults.flat();
  } catch (err) {
    console.error("RSS ERROR:", err);
  }

  return NextResponse.json({
    ...payload,
    news,
  });
}