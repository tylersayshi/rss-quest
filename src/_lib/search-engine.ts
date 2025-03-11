export interface SearchIndex {
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

export interface SearchResult {
  id: string;
  score: number;
  title: string;
  link: string;
  pubDate: string;
  feedTitle: string;
}

export class SearchEngine {
  private invertedIndex: SearchIndex["invertedIndex"];
  private documentMap: SearchIndex["documentMap"];
  private commonTerms: Set<string>;

  constructor(searchIndex: SearchIndex) {
    this.invertedIndex = searchIndex.invertedIndex;
    this.documentMap = searchIndex.documentMap;
    this.commonTerms = new Set(searchIndex.commonTerms || []);
  }

  search(query: string, limit: number): SearchResult[] {
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

    // needs to search Document map

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
