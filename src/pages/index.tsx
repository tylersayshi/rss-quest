"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RSSFeed } from "../types";
import { useRouter_UNSTABLE } from "waku";

// Reusing the SearchEngine from the original search-dialog.tsx
interface SearchIndex {
  invertedIndex: {
    [term: string]: {
      [docId: string]: number;
    };
  };
  documentMap: {
    [docId: string]: {
      feedTitle: string;
      title: string;
      link: string;
      pubDate: string;
    };
  };
  commonTerms: string[];
  metadata: {
    documentCount: number;
    termCount: number;
    indexSize: number;
    generatedAt: string;
  };
}

interface SearchResult {
  id: string;
  score: number;
  title: string;
  link: string;
  pubDate: string;
  feedTitle: string;
}

// Client-side search engine
class SearchEngine {
  private invertedIndex: SearchIndex["invertedIndex"];
  private documentMap: SearchIndex["documentMap"];
  private commonTerms: Set<string>;

  constructor(searchIndex: SearchIndex) {
    this.invertedIndex = searchIndex.invertedIndex;
    this.documentMap = searchIndex.documentMap;
    this.commonTerms = new Set(searchIndex.commonTerms || []);
  }

  search(query: string, limit: number = 10): SearchResult[] {
    if (!query || query.trim() === "") {
      return [];
    }

    // Tokenize the query
    const tokens = this._tokenize(query);
    if (tokens.length === 0) return [];

    // Filter out common terms for more efficient search
    let searchTokens = tokens;

    // Only filter common terms if we have enough tokens
    if (tokens.length > 1) {
      searchTokens = tokens.filter((token) => !this.commonTerms.has(token));
    }

    // If all terms were common, use a few of them anyway
    if (searchTokens.length === 0 && tokens.length > 0) {
      searchTokens.push(...tokens.slice(0, 2));
    }

    // Calculate scores for each document
    const scores: Record<string, number> = {};

    // Process each search token
    searchTokens.forEach((token) => {
      // Look for exact matches
      if (this.invertedIndex[token]) {
        const matchingDocs = this.invertedIndex[token];

        for (const docId in matchingDocs) {
          const score = matchingDocs[docId]!;
          scores[docId] = (scores[docId] || 0) + score;
        }
      }

      // Look for prefix matches (for partial word search)
      Object.keys(this.invertedIndex).forEach((indexedToken) => {
        if (indexedToken.startsWith(token) && indexedToken !== token) {
          const matchingDocs = this.invertedIndex[indexedToken];

          for (const docId in matchingDocs) {
            // Lower weight for prefix matches
            const score = matchingDocs[docId]! * 0.75;
            scores[docId] = (scores[docId] || 0) + score;
          }
        }
      });
    });

    // Convert scores to array and sort
    const results: SearchResult[] = Object.entries(scores)
      .map(([docId, score]) => ({
        id: docId,
        score,
        ...this.documentMap[docId]!,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  private _tokenize(text: string): string[] {
    if (!text) return [];

    // Simple tokenization - split on non-word characters and convert to lowercase
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }
}

// Fetch search index using React Query
const fetchSearchIndex = async (): Promise<SearchIndex> => {
  const response = await fetch("/api/search.json");
  if (!response.ok) {
    throw new Error("Failed to load search index");
  }
  return response.json();
};

export default function Home({ feeds }: { feeds: RSSFeed[] }) {
  const router = useRouter_UNSTABLE();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch the search index using React Query
  const {
    data: searchIndex,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["searchIndex"],
    queryFn: fetchSearchIndex,
    staleTime: Infinity, // The index doesn't change during a session
  });

  // Create search engine when index is loaded
  const searchEngine = searchIndex ? new SearchEngine(searchIndex) : null;

  // Perform search when query changes
  useEffect(() => {
    if (!searchEngine || !query.trim()) {
      setResults([]);
      return;
    }

    const searchResults = searchEngine.search(query, 10);
    setResults(searchResults);
  }, [query, searchEngine]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' or cmd+k/ctrl+k
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== searchInputRef.current
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Set query from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(router.query);
    const searchQuery = params.get("q");
    if (searchQuery) {
      setQuery(searchQuery);
      searchInputRef.current?.focus();
    }
  }, [router.query]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-4xl">
        {/* Logo, title and search section */}
        <div className="flex items-start mb-12">
          <img
            src="/images/koala.png"
            alt="RSS Quest Koala"
            width={120}
            height={120}
            className="mr-8"
          />
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">RSS Quest</h1>

            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isLoading
                    ? "Loading search index..."
                    : "Search RSS feeds... (Press '/' to focus)"
                }
                className="w-full py-4 pl-10 pr-4 text-lg border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Search results */}
        <div className="w-full">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">
              Loading search index...
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              Error loading search index
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h2 className="text-lg font-medium text-blue-600 hover:underline">
                      {result.title}
                    </h2>
                    <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                      <span>{result.feedTitle}</span>
                      <span>
                        {new Date(result.pubDate).toLocaleDateString()}
                      </span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-4 text-gray-500">
              No results found
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Type to search RSS feeds
            </div>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-gray-500">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded">/ </kbd> or{" "}
          <kbd className="px-2 py-1 bg-gray-100 rounded">⌘K</kbd> to search
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  // This might need adjustment based on your data fetching strategy
  const { getFeedData } = require("../_data/feeds");
  const feeds = await getFeedData();

  return {
    props: {
      feeds,
    },
    // Optionally set revalidation period
    revalidate: 3600, // Revalidate every hour
  };
}
