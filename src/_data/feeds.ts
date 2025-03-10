import Parser from "rss-parser";
import { RSSFeed } from "../types";
const parser = new Parser();

const rssFeedUrls = [
  "https://tylur.blog/api/rss.xml",
  "https://tkdodo.eu/blog/rss.xml",
  "https://overreacted.io/rss.xml",
  "https://cassidoo.co/rss.xml",
  "https://waku.gg/api/rss.xml",
];

export async function getFeedData() {
  const feedPromises = rssFeedUrls.map(async (url) => {
    try {
      const feed = await parser.parseURL(url);
      return {
        title: feed.title || "",
        description: feed.description || "",
        link: feed.link || "",
        items:
          feed.items?.map((item) => ({
            title: item.title || "",
            description: item.contentSnippet || item.content || "",
            link: item.link || "",
            pubDate: item.pubDate || "",
          })) || [],
      };
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error);
      return null;
    }
  });

  const results = await Promise.all(feedPromises);
  return results.filter((feed): feed is RSSFeed => feed !== null);
}
