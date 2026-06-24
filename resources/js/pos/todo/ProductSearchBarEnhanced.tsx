// ════════════════════════════════════════════════════════════════════════════
// components/pos/ProductSearchBarEnhanced.tsx
//
// شريط بحث متقدم للـ POS يتضمن:
// ✅ بحث ذكي مع اقتراحات
// ✅ عرض أفضل النتائج أولاً
// ✅ دعم الباركود مع fuzzy search
// ✅ اختصارات لوحة مفاتيح (مثل Enter)
// ✅ أيقونات تصنيفية
// ════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { useKey } from 'react-use';
import type { ProductVariant } from '@/lib/api/core/types';
import type { SearchResult } from '@/lib/pos/services/posSearchService';
import { usePOSSmartSearch } from '@/lib/pos/hooks/usePOSSmartSearch';

interface ProductSearchBarEnhancedProps {
  variants: ProductVariant[];
  families?: Array<{ id: number; name: string; _count?: { products: number } }>;
  onSelectVariant: (variant: ProductVariant) => void;
  onQueryChange?: (query: string) => void;
  maxSuggestions?: number;
  className?: string;
}

/**
 * أيقونات لأنواع المطابقة المختلفة
 */
const MATCH_TYPE_ICONS = {
  barcode: '📦',
  exact_name: '✓',
  partial_name: '🔍',
  fuzzy: '≈',
  ref: '#️⃣',
} as const;

export default function ProductSearchBarEnhanced({
  variants,
  families,
  onSelectVariant,
  onQueryChange,
  maxSuggestions = 10,
  className = '',
}: ProductSearchBarEnhancedProps) {
  const {
    query,
    results,
    resultsByCategory,
    setQuery,
    isSearching,
  } = usePOSSmartSearch(variants, families, {
    debounceMs: 200,
    maxResults: 100,
    activeOnly: true,
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // التعامل مع الاختصارات
  useKey('Escape', () => {
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  });

  useKey('Enter', () => {
    if (highlightedIndex >= 0 && results.results[highlightedIndex]) {
      const result = results.results[highlightedIndex];
      onSelectVariant(result.variant);
      setQuery('');
      setShowSuggestions(false);
    }
  });

  useKey('ArrowDown', () => {
    setHighlightedIndex(i =>
      i < results.results.length - 1 ? i + 1 : i,
    );
  });

  useKey('ArrowUp', () => {
    setHighlightedIndex(i => (i > 0 ? i - 1 : -1));
  });

  // إغلاق الاقتراحات عند النقر خارجاً
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    onQueryChange?.(q);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleSelectResult = (variant: ProductVariant) => {
    onSelectVariant(variant);
    setQuery('');
    setShowSuggestions(false);
  };

  const topResults = results.results.slice(0, maxSuggestions);
  const hasResults = topResults.length > 0;

  return (
    <div
      ref={containerRef}
      className={`pos-search-bar-enhanced ${className}`}
    >
      {/* Input */}
      <div className=\"pos-search-input-wrapper\">
        <i className=\"ti ti-search\" />
        <input
          ref={inputRef}
          type=\"text\"
          className=\"pos-search-input\"
          placeholder=\"بحث بالاسم أو الباركود...\"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          autoComplete=\"off\"
        />
        {isSearching && (
          <div className=\"pos-search-spinner\">
            <div className=\"spinner-small\" />
          </div>
        )}
        {query && (
          <button
            className=\"pos-search-clear\"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <i className=\"ti ti-x\" />
          </button>
        )}
        {results.executionTime > 0 && (
          <span className=\"pos-search-timing\">
            {results.executionTime.toFixed(0)}ms
          </span>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && hasResults && (
        <div className=\"pos-search-suggestions\">
          {/* النتائج الأعلى */}
          {topResults.length > 0 && (
            <div className=\"pos-search-section\">
              <div className=\"pos-search-section-title\">
                أفضل النتائج
                <span className=\"pos-search-count\">
                  {results.total} نتيجة
                </span>
              </div>
              {topResults.map((result, idx) => (
                <ResultItem
                  key={`${result.variant.id}-${idx}`}
                  result={result}
                  isHighlighted={idx === highlightedIndex}
                  onSelect={() => handleSelectResult(result.variant)}
                />
              ))}
            </div>
          )}

          {/* النتائج مجمعة حسب الفئة */}
          {resultsByCategory.length > 0 && (
            <div className=\"pos-search-section\">
              <div className=\"pos-search-section-title\">
                حسب التصنيف
              </div>
              {resultsByCategory.slice(0, 3).map(cat => (
                <CategorySection
                  key={cat.category.id}
                  category={cat.category}
                  results={cat.variants.slice(0, 3)}
                  onSelect={handleSelectResult}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* حالة البحث الفارغة */}
      {showSuggestions && query && !hasResults && !isSearching && (
        <div className=\"pos-search-empty\">
          <i className=\"ti ti-search-off\" />
          <p>لم يتم العثور على نتائج</p>
          <small>جرّب كلمات أخرى أو الباركود</small>
        </div>
      )}

      {/* شريط الإحصائيات */}
      {query && (
        <div className=\"pos-search-stats\">
          <span>عدد النتائج: <strong>{results.total}</strong></span>
          {results.executionTime > 0 && (
            <span>الوقت: <strong>{results.executionTime.toFixed(1)}ms</strong></span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

interface ResultItemProps {
  result: SearchResult;
  isHighlighted: boolean;
  onSelect: () => void;
}

function ResultItem({ result, isHighlighted, onSelect }: ResultItemProps) {
  const variant = result.variant;
  const product = variant.product;
  const icon = MATCH_TYPE_ICONS[result.matchType];
  const matchLabel = {
    barcode: 'باركود',
    exact_name: 'اسم دقيق',
    partial_name: 'بحث جزئي',
    fuzzy: 'تشابه',
    ref: 'مرجع',
  }[result.matchType];

  return (
    <div
      className={`pos-search-result-item ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onSelect}
      role=\"button\"
      tabIndex={0}
    >
      <div className=\"pos-search-result-icon\">{icon}</div>
      <div className=\"pos-search-result-content\">
        <div className=\"pos-search-result-name\">
          {product?.name}
          {variant.variant_name && (
            <span className=\"pos-search-variant-name\">
              ({variant.variant_name})
            </span>
          )}
        </div>
        <div className=\"pos-search-result-meta\">
          {variant.ref && (
            <span className=\"pos-search-meta-ref\">Ref: {variant.ref}</span>
          )}
          {variant.barcode && (
            <span className=\"pos-search-meta-barcode\">
              {variant.barcode}
            </span>
          )}
          <span className=\"pos-search-match-type\">{matchLabel}</span>
          <span className=\"pos-search-score\">
            {(result.score.toFixed(0))}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: { id: number; name: string; _count?: { products: number } };
  results: SearchResult[];
  onSelect: (variant: ProductVariant) => void;
}

function CategorySection({
  category,
  results,
  onSelect,
}: CategorySectionProps) {
  return (
    <div className=\"pos-search-category\">
      <div className=\"pos-search-category-name\">
        <i className=\"ti ti-folders\" />
        {category.name}
        {category._count && (
          <span className=\"pos-search-category-count\">
            {category._count.products}
          </span>
        )}
      </div>
      <div className=\"pos-search-category-items\">
        {results.map(result => (
          <div
            key={result.variant.id}
            className=\"pos-search-mini-item\"
            onClick={() => onSelect(result.variant)}
            role=\"button\"
            tabIndex={0}
          >
            <div className=\"pos-search-mini-name\">
              {result.variant.product?.name}
            </div>
            {result.variant.barcode && (
              <div className=\"pos-search-mini-barcode\">
                {result.variant.barcode}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
