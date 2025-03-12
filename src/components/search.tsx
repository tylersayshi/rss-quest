"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SearchEngine, SearchResult } from "../_lib/search-engine";
import { useRouter_UNSTABLE } from "waku";
import { ListBox, ListBoxItem, Header, Text } from "react-aria-components";

const fetchSearchIndex = async (): Promise<{
  engine: SearchEngine;
  postCount: number;
}> => {
  const response = await fetch("/api/search.json");
  if (!response.ok) {
    throw new Error("Failed to load search index");
  }
  const { index, postCount } = await response.json();
  const engine = new SearchEngine(index);
  return { engine, postCount };
};

const ABC = "abcdefghijklmnopqrstuvwxyz";

export const Searcher = () => {
  const router = useRouter_UNSTABLE();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    results: SearchResult[];
    query: string;
  }>({ results: [], query: "" });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const {
    data: search,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["searchIndex"],
    queryFn: fetchSearchIndex,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!search || query === results.query) {
      return;
    } else if (!query.trim()) {
      setResults({ results: [], query });
      return;
    }

    const searchResults = search.engine.search(query, 25);
    setResults({ results: searchResults, query });
  }, [query, search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        searchInputRef.current?.blur();
        return;
      }
      if (
        document.activeElement !== searchInputRef.current &&
        ((e.metaKey && e.key === "k") || e.key === "/")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();

        if (ABC.includes(e.key)) {
          setQuery((prevQuery) => prevQuery + e.key);
        }
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
    <>
      {/* Logo, title and search section */}
      <div className="flex items-start mb-6 mt-1">
        <img
          src="/images/koala.png"
          alt="RSS Quest Koala"
          width={62}
          height={62}
          className="mr-4"
        />
        <div className="flex-1">
          {/* Search bar */}
          <div className="relative flex flex-col gap-1">
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
                  : `Search ${search?.postCount} posts...`
              }
              className="w-full py-4 pl-10 pr-4 text-lg border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Search results */}
      <div className="w-full overflow-y-auto max-h-full px-1">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            Loading search index...
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            Error loading search index
          </div>
        ) : results.results.length > 0 ? (
          <ListBox
            className="space-y-4 focus-visible:outline-none"
            ref={listboxRef}
            selectionMode="single"
            aria-label="Search results"
            selectedKeys={["Enter"]}
          >
            {results.results.map((result) => (
              <ListBoxItem
                key={result.id}
                textValue={result.title}
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="rounded-lg border border-transparent focus:border-white hover:border-white p-3">
                  <Header className="text-lg">{result.title}</Header>
                  <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                    <Text>{result.feedTitle}</Text>
                    <Text>{new Date(result.pubDate).toLocaleDateString()}</Text>
                  </div>
                </div>
              </ListBoxItem>
            ))}
          </ListBox>
        ) : query.trim() ? (
          <div className="text-center py-4 text-gray-500">No results found</div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Type to search RSS feeds
          </div>
        )}
      </div>
    </>
  );
};
