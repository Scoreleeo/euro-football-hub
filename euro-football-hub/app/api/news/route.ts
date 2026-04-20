import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const parser = new Parser();

type ParsedFeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: {
    url?: string;
  };
  creator?: string;
  author?: string;
};

function cleanText(value?: string) {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").trim();
}

function pickImage(item: ParsedFeedItem) {
  if (item.enclosure?.url) return item.enclosure.url;

  const html = item.content || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

export async function GET() {
  try {
    const feedUrl = process.env.RSS_FEED_URL;

    if (!feedUrl) {
      return NextResponse.json(
        { error: "Missing RSS_FEED_URL in .env.local" },
        { status: 500 }
      );
    }

    const res = await fetch(feedUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "ProFootballIntel/1.0",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch RSS feed: " + res.status);
    }

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    const articles = (feed.items || []).slice(0, 12).map((item: ParsedFeedItem, index: number) => ({
      id: item.link || item.title || "article-" + index,
      title: item.title || "Football news",
      link: item.link || "#",
      date: item.isoDate || item.pubDate || "",
      summary:
        cleanText(item.contentSnippet) ||
        cleanText(item.content) ||
        "Latest football update.",
      image: pickImage(item),
      source: item.creator || item.author || feed.title || "Football News",
    }));

    return NextResponse.json({ articles });
  } catch (error: any) {
    console.error("NEWS ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load football news" },
      { status: 500 }
    );
  }
}