import { Compass, Newspaper } from "lucide-react";

import { rssFeedUrls } from "../_data/feeds";
import type { RSSFeed } from "../types";
import Parser from "rss-parser";
import { SearchTrigger } from "../components/search-trigger";

const parser = new Parser();

async function getFeedData() {
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

export default async function App() {
  const feeds = await getFeedData();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Compass className="w-8 h-8 text-[rgb(var(--accent))]" />
          <h1 className="text-3xl font-bold font-chalk">RSS Quest</h1>
        </div>
        <SearchTrigger feeds={feeds} />
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="grid gap-6">
          {feeds.map((feed, index) => (
            <section key={index} className="quest-card">
              <div className="flex items-start gap-4">
                <Newspaper className="w-6 h-6 text-[rgb(var(--accent))] flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold mb-2">{feed.title}</h2>
                  <p className="opacity-70 mb-4">{feed.description}</p>
                  <div className="space-y-4">
                    {feed.items.slice(0, 3).map((item, itemIndex) => (
                      <article
                        key={itemIndex}
                        className="border-l-2 border-[rgb(var(--accent))] border-opacity-20 pl-4"
                      >
                        <h3 className="font-medium mb-1">
                          <a
                            href={item.link}
                            className="hover:text-[rgb(var(--accent))] transition-colors duration-200"
                          >
                            {item.title}
                          </a>
                        </h3>
                        <p className="opacity-70 text-sm">{item.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: "static",
  } as const;
};
