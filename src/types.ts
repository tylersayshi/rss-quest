export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
}

export interface RSSItem {
  title: string;
  description: string;
  content: string;
  author: string;
  link: string;
  pubDate: string;
}
