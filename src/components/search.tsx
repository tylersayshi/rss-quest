import { useState, useEffect, useRef, useDeferredValue, useMemo } from "react";
import { Search as LucSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SearchIndex, SearchResult } from "../_lib/search-engine";
import { SearchEngine } from "../_lib/search-engine";

const fetchSearchIndex = async (): Promise<{
  index: SearchIndex;
  postCount: number;
}> => {
  const response = await fetch("/search.json");
  if (!response.ok) {
    throw new Error("Failed to load search index");
  }
  return response.json();
};

export const Search = () => {
  // const router = useRouter_UNSTABLE();
  const [query, setQuery] = useState("");
  const lazyQuery = useDeferredValue(query);
  const [results, setResults] = useState<{
    results: SearchResult[];
    query: string;
  }>({ results: [], query: "" });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const {
    data: search,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["searchIndex"],
    queryFn: fetchSearchIndex,
    staleTime: Infinity,
  });

  const engine = useMemo(
    () => (search?.index ? new SearchEngine(search.index) : undefined),
    [search]
  );

  useEffect(() => {
    if (!engine || !search || lazyQuery === results.query) {
      return;
    } else if (!lazyQuery.trim()) {
      setResults({ results: [], query: lazyQuery });
      return;
    }

    const searchResults = engine.search(lazyQuery, 25);
    setResults({ results: searchResults, query: lazyQuery });
  }, [engine, lazyQuery, results.query, search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement !== searchInputRef.current &&
        ((e.metaKey && e.key === "k") || e.key === "/")
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
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get("q");
    if (searchQuery) {
      setQuery(searchQuery);
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    // Get current query parameter value
    const currentUrl = new URL(window.location.href);
    const currentQuery = currentUrl.searchParams.get("q") || "";

    // Only update if the query parameter value is different
    const normalizedLazyQuery = lazyQuery || "";

    if (currentQuery === normalizedLazyQuery) {
      return; // No change needed, values already match
    }

    // Update URL without page reload
    const newUrl = new URL(window.location.href);

    if (normalizedLazyQuery) {
      newUrl.searchParams.set("q", normalizedLazyQuery);
    } else {
      newUrl.searchParams.delete("q");
    }

    window.history.pushState({}, "", newUrl);
  }, [lazyQuery]);

  return (
    <>
      <style>{`
      .listbox-item-${activeIndex} {
        border-color: black;
      }

      @media (prefers-color-scheme: dark) {
        .listbox-item-${activeIndex} {
          border-color: white;
        }
      }
    `}</style>

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
              <LucSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setActiveIndex(e.target.value.length ? 0 : -1);
                setQuery(e.target.value);
              }}
              placeholder={
                isLoading
                  ? "Loading search index..."
                  : `Search ${search?.postCount} posts...`
              }
              onFocus={() => setActiveIndex((i) => (i === -1 ? 0 : i))}
              className="w-full py-4 pl-10 pr-4 text-lg border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  searchInputRef.current?.blur();
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((a) => {
                    const newIndex = (a + 1) % results.results.length;

                    setTimeout(() => {
                      const activeItem = document.querySelector(
                        `.listbox-item-${newIndex}`
                      );
                      if (activeItem && containerRef.current) {
                        const containerRect =
                          containerRef.current.getBoundingClientRect();
                        const activeItemRect =
                          activeItem.getBoundingClientRect();
                        // Check if the item is below the visible area
                        if (activeItemRect.bottom > containerRect.bottom) {
                          activeItem.scrollIntoView({ block: "nearest" });
                        }
                        // Check if the item is above the visible area
                        else if (activeItemRect.top < containerRect.top) {
                          activeItem.scrollIntoView({ block: "nearest" });
                        }
                      }
                    }, 0);

                    return newIndex;
                  });
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((a) => {
                    const newIndex =
                      (a - 1 + results.results.length) % results.results.length;

                    setTimeout(() => {
                      const activeItem = document.querySelector(
                        `.listbox-item-${newIndex}`
                      );
                      if (activeItem && containerRef.current) {
                        const containerRect =
                          containerRef.current.getBoundingClientRect();
                        const activeItemRect =
                          activeItem.getBoundingClientRect();

                        // Check if the item is below the visible area
                        if (activeItemRect.bottom > containerRect.bottom) {
                          activeItem.scrollIntoView({ block: "nearest" });
                        }
                        // Check if the item is above the visible area
                        else if (activeItemRect.top < containerRect.top) {
                          activeItem.scrollIntoView({ block: "nearest" });
                        }
                      }
                    }, 0);

                    return newIndex;
                  });
                } else if (e.key === "Enter") {
                  if (activeIndex === -1) {
                    return;
                  }
                  const result = results.results[activeIndex];
                  if (result) {
                    window.location.assign(result.link);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Search results */}
      <div
        className="w-full min-h-0 px-1"
        onMouseEnter={() => setActiveIndex(-1)}
      >
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            Loading search index...
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            Error loading search index
          </div>
        ) : results.results.length > 0 ? (
          <ul
            className="space-y-4 focus-visible:outline-none overflow-auto max-h-full"
            ref={containerRef}
            aria-label="Search results"
          >
            {results.results.map((result, index) => (
              <li key={result.id} className="relative isolate">
                <div
                  className={`rounded-lg border border-transparent dark:hover:border-white hover:border-black p-3 listbox-item-${index}`}
                >
                  <a className="text-lg" href={result.link}>
                    {/* https://www.youtube.com/watch?v=-h9rH539x1k */}
                    <span className="absolute inset-0 z-10" />
                    {result.title}
                  </a>
                  <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                    <span>{result.feedTitle}</span>
                    <span>{new Date(result.pubDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
