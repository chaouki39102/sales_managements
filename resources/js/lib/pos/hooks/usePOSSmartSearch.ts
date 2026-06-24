import { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchVariantsEnhanced,
  clearSearchCache,
  type SearchResults,
} from '@/lib/pos/services/posSearchService';
import type { ProductVariant } from '@/lib/api/core/types';

export interface UsePOSSmartSearchOptions {
  debounceMs?: number;
  maxResults?: number;
  minScore?: number;
  activeOnly?: boolean;
}

export interface UsePOSSmartSearchResult {
  query: string;
  isSearching: boolean;
  results: SearchResults;
  setQuery: (q: string) => void;
  clearResults: () => void;
  executionTime: number;
  totalResults: number;
}

const DEFAULT_DEBOUNCE = 200;

export function usePOSSmartSearch(
  variants: ProductVariant[],
  _families?: Array<{ id: number; name: string; _count?: { products: number } }>,
  options: UsePOSSmartSearchOptions = {},
): UsePOSSmartSearchResult {
  const { debounceMs = DEFAULT_DEBOUNCE, maxResults = 100, minScore, activeOnly = true } = options;

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    query: '', results: [], total: 0, executionTime: 0,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastQueryRef = useRef('');

  const performSearch = useCallback(
    (searchQuery: string) => {
      setIsSearching(true);
      try {
        const searchResults = searchVariantsEnhanced(variants, searchQuery, {
          maxResults,
          minScore,
          activeOnly,
        });
        setResults(searchResults);
      } finally {
        setIsSearching(false);
      }
    },
    [variants, maxResults, minScore, activeOnly],
  );

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    lastQueryRef.current = newQuery;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newQuery.trim()) {
      setResults({
        query: '',
        results: variants
          .filter(v => (activeOnly ? v.active && v.product?.active : true))
          .slice(0, maxResults)
          .map(v => ({ variant: v, score: 0, matchType: 'partial_name' as const })),
        total: variants.length,
        executionTime: 0,
      });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      if (newQuery === lastQueryRef.current) {
        performSearch(newQuery);
      }
    }, debounceMs);
  }, [variants, performSearch, debounceMs, maxResults, activeOnly]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults({ query: '', results: [], total: 0, executionTime: 0 });
    clearSearchCache();
  }, []);

  return {
    query,
    isSearching,
    results,
    setQuery: handleQueryChange,
    clearResults,
    executionTime: results.executionTime,
    totalResults: results.total,
  };
}

export default usePOSSmartSearch;
