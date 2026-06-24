// ════════════════════════════════════════════════════════════════════════════
// lib/pos/hooks/usePOSSmartSearch.ts
//
// Hook متقدم للبحث الذكي في POS يتضمن:
// ✅ Debounce ذكي للبحث
// ✅ تجميع النتائج حسب الفئة
// ✅ تخزين مؤقت
// ✅ حالة تحميل منفصلة للبحث النشط
// ✅ دعم التصفية حسب الفئة المحددة
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchVariants,
  searchWithCategories,
  clearSearchCache,
  type SearchResults,
  type CategorySearchResult,
} from '@/lib/pos/services/posSearchService';
import type { ProductVariant, Family } from '@/lib/api/core/types';

export interface UsePOSSmartSearchOptions {
  /** تأخير البحث الضبابي (milliseconds) */
  debounceMs?: number;
  /** أقصى عدد نتائج */
  maxResults?: number;
  /** الحد الأدنى لدرجة المطابقة */
  minScore?: number;
  /** عرض المنتجات المفعلة فقط */
  activeOnly?: boolean;
}

export interface UsePOSSmartSearchResult {
  // الحالة
  query: string;
  isSearching: boolean;
  
  // النتائج
  results: SearchResults;
  resultsByCategory: CategorySearchResult[];
  
  // التحكم
  setQuery: (q: string) => void;
  clearResults: () => void;
  
  // معلومات الأداء
  executionTime: number;
  totalResults: number;
}

const DEFAULT_DEBOUNCE = 300;

/**
 * Hook للبحث الذكي في POS
 * 
 * مثال الاستخدام:
 * ```tsx
 * const { query, setQuery, results, resultsByCategory, isSearching } = 
 *   usePOSSmartSearch(variants, families);
 * 
 * return (
 *   <>
 *     <SearchInput value={query} onChange={setQuery} />
 *     {isSearching && <Spinner />}
 *     {resultsByCategory.map(cat => (
 *       <CategoryResults key={cat.category.id} category={cat.category} results={cat.variants} />
 *     ))}
 *   </>
 * );
 * ```
 */
export function usePOSSmartSearch(
  variants: ProductVariant[],
  families?: Array<{ id: number; name: string; _count?: { products: number } }>,
  options: UsePOSSmartSearchOptions = {},
): UsePOSSmartSearchResult {
  const {
    debounceMs = DEFAULT_DEBOUNCE,
    maxResults = 100,
    minScore = 50,
    activeOnly = true,
  } = options;

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    query: '',
    results: [],
    total: 0,
    executionTime: 0,
  });
  const [resultsByCategory, setResultsByCategory] = useState<CategorySearchResult[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastQueryRef = useRef('');

  // البحث الفعلي
  const performSearch = useCallback(
    (searchQuery: string) => {
      setIsSearching(true);
      try {
        const searchResults = searchVariants(variants, searchQuery, {
          maxResults,
          minScore,
          activeOnly,
        });
        setResults(searchResults);

        // تجميع حسب الفئة إذا كانت متاحة
        if (families && families.length > 0) {
          const grouped = searchWithCategories(variants, searchQuery, families);
          setResultsByCategory(grouped);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [variants, families, maxResults, minScore, activeOnly],
  );

  // معالج تغيير الكلمة المفتاحية مع debounce
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    lastQueryRef.current = newQuery;

    // إلغاء البحث السابق
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newQuery.trim()) {
      // فارغ — إظهار كل المنتجات
      setResults({
        query: '',
        results: variants
          .filter(v => (activeOnly ? v.active && v.product?.active : true))
          .slice(0, maxResults)
          .map(v => ({ variant: v, score: 0, matchType: 'partial_name' as const })),
        total: variants.length,
        executionTime: 0,
      });
      setResultsByCategory([]);
      setIsSearching(false);
      return;
    }

    // بدء البحث بعد تأخير
    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      if (newQuery === lastQueryRef.current) {
        performSearch(newQuery);
      }
    }, debounceMs);
  }, [variants, performSearch, debounceMs, maxResults, activeOnly]);

  // تنظيف عند الفك
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults({ query: '', results: [], total: 0, executionTime: 0 });
    setResultsByCategory([]);
    clearSearchCache();
  }, []);

  return {
    query,
    isSearching,
    results,
    resultsByCategory,
    setQuery: handleQueryChange,
    clearResults,
    executionTime: results.executionTime,
    totalResults: results.total,
  };
}

/**
 * Hook لبحث سريع بدون تجميع (للبحث البسيط)
 */
export function usePOSQuickSearch(
  variants: ProductVariant[],
  options: UsePOSSmartSearchOptions = {},
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    query: '',
    results: [],
    total: 0,
    executionTime: 0,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const searchResults = searchVariants(variants, newQuery, {
        maxResults: options.maxResults ?? 50,
        minScore: options.minScore ?? 50,
        activeOnly: options.activeOnly ?? true,
      });
      setResults(searchResults);
    }, options.debounceMs ?? DEFAULT_DEBOUNCE);
  }, [variants, options]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { query, setQuery: handleQueryChange, results };
}

export default usePOSSmartSearch;
