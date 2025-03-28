import Parser from "rss-parser";
import type { RSSFeed } from "../types";
import { allChunked } from "@tyler/duckhawk";

const parser = new Parser({
  timeout: 3 * 60 * 1000, // 3 minutes
});

const rssFeedUrls = [
  "https://tylur.blog/api/rss.xml",
  "https://tkdodo.eu/blog/rss.xml",
  "https://overreacted.io/rss.xml",
  "https://cassidoo.co/rss.xml",
  "https://waku.gg/api/rss.xml",
  "https://blog.isquaredsoftware.com/index.xml",
  "https://byk.im/rss",
  "https://cra.mr/rss.xml",
  "https://romgrk.com/rss.xml",

  // from francois
  "https://francoisbest.com/posts/feed/rss.xml",
  "https://dzhavat.github.io/feed.xml",
  "https://bitsofco.de/rss",
  "https://joshwcomeau.com/rss.xml",
  "https://www.premieroctet.com/blog/rss.xml",
  "https://kyleshevlin.com/rss.xml",
  "https://simonwillison.net/atom/everything/",
  "https://aurorascharff.no/rss.xml",
  "https://kettanaito.com/blog/rss.xml",
  "https://souporserious.com/rss.xml",
  "https://offlinemark.com/feed/",
  "https://fettblog.eu/feed.xml",
  "https://surma.dev/index.xml",
  "https://soatok.blog/feed/",
  "https://www.hsablonniere.com/articles-feed.xml",
  "https://tobiasahlin.com/feed.xml",
  "https://ma.ttias.be/cronweekly/index.xml",
  "https://hnblogs.substack.com/feed",
  "https://romain-clement.net/feed/articles/rss.xml",
  "https://www.julian.digital/feed",

  // from lars
  "https://www.webpro.nl/blog/feed.xml",
  "http://www.broken-links.com/feed/",
  "http://blog.cloudfour.com/feed/",
  "http://gent.ilcore.com/feeds/posts/default",
  "http://www.stevesouders.com/blog/feed/",
  "http://martinfowler.com/feed.atom",
  "http://nicolasgallagher.com/feed/",
  "http://blog.patrickmeenan.com/feeds/posts/default",
  "http://www.phpied.com/feed/",
  "http://www.quirksmode.org/blog/atom.xml",
  "http://royal.pingdom.com/feed/",
  "http://www.standardista.com/feed/",
  "http://www.xanthir.com/blog/atom/",
  "http://blog.sourcetreeapp.com/feed/",
  "http://html5doctor.com/feed/",
  "http://feeds.feedburner.com/24ways",
  "http://feeds.feedburner.com/2ality",
  "http://feeds.feedburner.com/AJAXMagazine",
  "http://feeds.feedburner.com/codinghorror",
  "http://feeds.feedburner.com/dropshadows",
  "http://feeds.feedburner.com/blogspot/amDG",
  "http://feeds2.feedburner.com/jsmag",
  "http://feeds.feedburner.com/leaverou",
  "http://feeds.feedburner.com/lostechies",
  "http://feeds.feedburner.com/FunctioningForm",
  "http://feeds.feedburner.com/nczonline",
  "http://feeds.feedburner.com/nefariousdesigns",
  "http://feeds.feedburner.com/PerfectionKills",
  "http://feeds.feedburner.com/adobe_developer_center_html5",
  "http://feeds.feedburner.com/WhenCanIUse",
  "http://feeds.feedburner.com/ScottHanselman",
  "http://feeds.feedburner.com/addyosmani",
];

function getTextFromHtml(htmlString: string): string {
  if (!htmlString) {
    return "";
  }

  // Remove HTML tags
  const withoutTags = htmlString.replace(/<[^>]*>/g, " ");

  // Decode common HTML entities
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  return decoded.replace(/\s+/g, " ").trim();
}

// not all promises are resolved
export async function getFeedData() {
  const addedUrls = new Set<string>();

  const feedPromises = rssFeedUrls.map(async (url) => {
    if (addedUrls.has(url)) {
      return null;
    }
    try {
      console.time(`Indexing ${url}`);
      const feed = await parser.parseURL(url);
      const items: RSSFeed["items"] = [];
      const linkSet = new Set<string>();
      for (const item of feed.items) {
        if (!item.link || linkSet.has(item.link)) {
          continue;
        }
        linkSet.add(item.link);
        items.push({
          title: item.title || "",
          description: item.contentSnippet || item.content || "",
          link: item.link || "",
          pubDate: item.pubDate || "",
          content: item.content ? getTextFromHtml(item.content) : "",
          author: item.author || "",
        });
      }
      console.timeEnd(`Indexing ${url}`);
      console.log(items.length, "items fetched");
      return {
        title: feed.title || "",
        description: feed.description || "",
        link: feed.link || "",
        items,
      };
    } catch (error) {
      console.error(`Error fetching feed from ${url}:`, error);
      return null;
    }
  });

  const results = await allChunked(feedPromises, 10);
  console.log(
    results.reduce((acc, cur) => acc + (cur?.items.length ?? 0), 0) +
      " items fetched"
  );
  return results.filter((feed): feed is RSSFeed => feed !== null);
}
