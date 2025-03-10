"use client";

import { useOverlay, useModal, usePreventScroll } from "@react-aria/overlays";
import { FocusScope } from "@react-aria/focus";
import { RSSFeed } from "../types";
import { useEffect, useRef, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";

// Define types for our search index
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

    // // Early optimization: If we have an exact match for the full query, prioritize those results
    // const exactMatchToken = query
    //   .toLowerCase()
    //   .replace(/[^\w\s]/g, " ")
    //   .trim();
    // if (this.invertedIndex[exactMatchToken]) {
    //   const exactMatches: SearchResult[] = Object.entries(
    //     this.invertedIndex[exactMatchToken]
    //   )
    //     .map(([docId, score]) => ({
    //       id: docId,
    //       score: score * 2, // Boost exact matches
    //       ...this.documentMap[docId]!,
    //     }))
    //     .sort((a, b) => b.score - a.score)
    //     .slice(0, limit);

    //   if (exactMatches.length === limit) {
    //     return exactMatches; // Return early if we have enough exact matches
    //   }
    // }

    // Filter out common terms for more efficient search
    // const searchTokens = tokens.filter((token) => !this.commonTerms.has(token));
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

export function SearchDialog({
  isOpen,
  onClose,
  defaultValue,
  feeds,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultValue: string;
  feeds: RSSFeed[];
}) {
  // TODO solve infinite render loop

  const ref = useRef<HTMLDivElement>(null);
  const { overlayProps } = useOverlay(
    { isOpen, onClose, isDismissable: true },
    ref
  );
  const { modalProps } = useModal();
  usePreventScroll();

  const [query, setQuery] = useState(defaultValue || "");
  const [results, setResults] = useState<SearchResult[]>([]);

  // Fetch the search index using React Query
  const {
    data: searchIndex,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["searchIndex"],
    queryFn: fetchSearchIndex,
    staleTime: Infinity, // The index doesn't change during a session
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Create search engine when index is loaded
  const searchEngine = searchIndex ? new SearchEngine(searchIndex) : null;

  // Perform search when query changes
  const performSearch = useCallback(
    (searchQuery: string) => {
      if (!searchEngine || !searchQuery.trim()) {
        setResults([]);
        return;
      }

      const searchResults = searchEngine.search(searchQuery, 10);
      setResults(searchResults);
    },
    [searchEngine]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Set initial value
  useEffect(() => {
    if (defaultValue) {
      setQuery(defaultValue);
      const input = document.querySelector("[cmdk-input]") as HTMLInputElement;
      if (input) {
        setTimeout(() => {
          input.value = defaultValue;
          input.focus();
        }, 1);
      }
    }
  }, [defaultValue]);

  // Keyboard shortcut to close
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClose]);

  return (
    <FocusScope contain restoreFocus autoFocus>
      <div
        {...overlayProps}
        {...modalProps}
        ref={ref}
        className="fixed top-[20%] left-1/2 transform -translate-x-1/2 p-4 z-50 w-full max-w-xl"
      >
        <Command className="rounded-lg border shadow-md bg-white dark:bg-gray-800">
          <Command.Input
            placeholder={
              isLoading ? "Loading search index..." : "Search articles..."
            }
            value={query}
            onValueChange={setQuery}
            disabled={isLoading}
            autoFocus
            className="w-full px-4 py-3 text-base"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-gray-500">
                Loading search index...
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-red-500">
                Error loading search index
              </div>
            ) : results.length === 0 ? (
              <Command.Empty className="py-6 text-center text-sm text-gray-500">
                {query.trim() ? "No articles found" : "Start typing to search"}
              </Command.Empty>
            ) : (
              results.map((result) => (
                <Command.Item
                  key={result.id}
                  onSelect={() => {
                    window.open(result.link, "_blank");
                    onClose();
                  }}
                  className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <a
                    className="font-medium block"
                    href={result.link}
                    target="_blank"
                  >
                    {result.title}
                  </a>
                  <div className="text-sm opacity-70 flex justify-between mt-1">
                    <span>{result.feedTitle}</span>
                    <span>{new Date(result.pubDate).toLocaleDateString()}</span>
                  </div>
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </div>
    </FocusScope>
  );
}
