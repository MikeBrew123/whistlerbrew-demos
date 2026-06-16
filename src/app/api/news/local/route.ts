import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
}

function extractSource(title: string): { cleanTitle: string; source: string } {
  const match = title.match(/^(.*)\s+-\s+(.+)$/);
  if (match) return { cleanTitle: match[1].trim(), source: match[2].trim() };
  return { cleanTitle: title, source: "" };
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
    const sourceTag = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";

    const { cleanTitle, source: titleSource } = extractSource(title);
    const source = sourceTag || titleSource;

    items.push({
      title: cleanTitle,
      link,
      source,
      published: pubDate ? new Date(pubDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "",
    });
  }
  return items;
}

export async function POST(request: NextRequest) {
  try {
    const { fireNumber, communityName, fireName } = await request.json();
    if (!fireNumber && !communityName) {
      return NextResponse.json({ error: "fireNumber or communityName required" }, { status: 400 });
    }

    const terms: string[] = [];
    if (fireNumber) terms.push(fireNumber);
    if (communityName) terms.push(`"${communityName}" wildfire`);
    if (fireName && fireName !== communityName) terms.push(`"${fireName}" wildfire`);

    const query = `(${terms.join(" OR ")}) BC`;
    const url = `${GOOGLE_NEWS_RSS}?q=${encodeURIComponent(query)}&hl=en-CA&gl=CA&ceid=CA:en`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const xml = await res.text();
    const articles = parseRssItems(xml).slice(0, 8);

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ articles: [] });
  }
}
