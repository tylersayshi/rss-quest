import { getFeedData } from "../../_data/feeds";
import { RSSFeed } from "../../types";

interface SearchIndex {
  invertedIndex: InvertedIndex;
  documentMap: DocumentMap;
  commonTerms: string[];
  metadata: IndexMetadata;
}

interface InvertedIndex {
  [term: string]: {
    [docId: string]: number;
  };
}

interface DocumentMap {
  [docId: string]: {
    feedTitle: string;
    title: string;
    link: string;
    pubDate: string;
  };
}

interface IndexMetadata {
  documentCount: number;
  termCount: number;
  indexSize: number;
  generatedAt: string;
}

interface DocLocation {
  feedIndex: number;
  itemIndex: number;
}

// Function to tokenize and normalize text
function tokenize(text: string): string[] {
  if (!text) return [];

  const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "by",
    "about",
    "as",
    "of",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "shall",
    "should",
    "can",
    "could",
    "may",
    "might",
    "must",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "they",
    "them",
    "their",
    "we",
    "us",
    "our",
    "you",
    "your",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter(
      (word) =>
        word.length > 1 && // Skip single characters
        !STOP_WORDS.has(word) // Skip stop words
    );
}

// Function to build the optimized inverted index
function buildSearchIndex(feeds: RSSFeed[]): SearchIndex {
  // Create a document ID mapping system
  const docIdMap = new Map<number, DocLocation>();
  let nextDocId = 0;

  // First pass: assign IDs and count term frequencies
  const termFrequency: Record<string, number> = {};

  feeds.forEach((feed, feedIndex) => {
    feed.items.forEach((item, itemIndex) => {
      // Assign a unique ID to this item
      const docId = nextDocId++;

      // Store a reference to locate this item later
      docIdMap.set(docId, {
        feedIndex,
        itemIndex,
      });

      // Process title and description to count term frequencies
      const titleTokens = tokenize(item.title);
      const descriptionTokens = tokenize(item.description);

      // Count unique terms in this document
      const uniqueTerms = new Set([...titleTokens, ...descriptionTokens]);
      uniqueTerms.forEach((term) => {
        termFrequency[term] = (termFrequency[term] || 0) + 1;
      });
    });
  });

  // Identify extremely common terms (appearing in >50% of documents)
  const totalDocuments = docIdMap.size;
  const commonTermThreshold = totalDocuments * 0.5;
  const commonTerms = new Set(
    Object.entries(termFrequency)
      .filter(([_, count]) => count > commonTermThreshold)
      .map(([term, _]) => term)
  );

  // Build the inverted index
  const invertedIndex: InvertedIndex = {};

  docIdMap.forEach((location, docId) => {
    const feed = feeds[location.feedIndex]!;
    const item = feed.items[location.itemIndex]!;

    // Process title (with higher weight)
    const titleTokens = tokenize(item.title);
    titleTokens.forEach((token) => {
      // Skip extremely common terms
      if (commonTerms.has(token)) {
        return;
      }

      if (!invertedIndex[token]) {
        invertedIndex[token] = {};
      }
      invertedIndex[token][docId] = (invertedIndex[token][docId] || 0) + 3; // Higher weight for title
    });

    // Process description
    const descriptionTokens = tokenize(item.description);
    descriptionTokens.forEach((token) => {
      // Skip extremely common terms
      if (commonTerms.has(token)) {
        return;
      }

      if (!invertedIndex[token]) {
        invertedIndex[token] = {};
      }
      invertedIndex[token][docId] = (invertedIndex[token][docId] || 0) + 1;
    });
  });

  // Create a lookup table for document retrieval
  const documentMap: DocumentMap = {};
  docIdMap.forEach((location, docId) => {
    const feed = feeds[location.feedIndex]!;
    const item = feed.items[location.itemIndex]!;

    documentMap[docId] = {
      feedTitle: feed.title,
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
    };
  });

  // Create the final index structure
  return {
    invertedIndex,
    documentMap,
    commonTerms: Array.from(commonTerms),
    metadata: {
      documentCount: totalDocuments,
      termCount: Object.keys(invertedIndex).length,
      indexSize: JSON.stringify(invertedIndex).length,
      generatedAt: new Date().toISOString(),
    },
  };
}

export const GET = async () => {
  try {
    // Get the feed data
    const feeds = await getFeedData();

    // Build the search index
    const searchIndex = buildSearchIndex(feeds);

    // Return the index as JSON
    return Response.json(searchIndex);
  } catch (error) {
    console.error("Error generating search index:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate search index" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

export const getConfig = () => {
  return {
    render: "static",
  };
};
