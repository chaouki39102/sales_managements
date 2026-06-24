// ════════════════════════════════════════════════════════════════════════════
// lib/pos/services/posSearchService.v2.ts
// 
// ✅ نسخة محسّنة مع:
// - بحث فوري للحروف الأولى (prefix search)
// - debounce أقصر (100ms بدل 300ms)
// - عتبة أقل للنتائج القصيرة (2-3 حروف)
// - تحسينات أداء كبيرة
// ════════════════════════════════════════════════════════════════════════════

import type { ProductVariant } from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  variant: ProductVariant;
  score: number;
  matchType: 'barcode' | 'exact_name' | 'partial_name' | 'fuzzy' | 'ref' | 'prefix';
  matchedField?: string;
}

export interface SearchResults {
  query: string;
  results: SearchResult[];
  total: number;
  executionTime: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORING = {
  // بحث البادئة (أول 3 حروف) — الأعلى أولوية
  prefix_exact: 950,        // يبدأ بـ البحث
  prefix_barcode: 900,      // باركود يبدأ بـ
  
  // بحث دقيق
  barcode_exact: 1000,
  barcode_partial: 800,
  ref_exact: 750,
  ref_partial: 700,
  name_exact: 650,
  
  // بحث جزئي (ما يزال مرتفع)
  name_start: 550,
  name_partial: 450,
  
  family_match: 300,
  variant_name: 200,
  
  // fuzzy
  fuzzy_high: 150,
  fuzzy_medium: 80,
} as const;

const CACHE_TTL = 10 * 60 * 1000;

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();

  get(query: string): SearchResult[] | null {
    const entry = this.cache.get(query);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
    if (isExpired) {
      this.cache.delete(query);
      return null;
    }
    
    return entry.results;
  }

  set(query: string, results: SearchResult[]): void {
    this.cache.set(query, { results, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SearchCache();

// ─── Levenshtein Distance ──────────────────────────────────────────────────────

function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = Array(aLen + 1)
    .fill(null)
    .map(() => Array(bLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) matrix[i][0] = i;
  for (let j = 0; j <= bLen; j++) matrix[0][j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[aLen][bLen];
}

function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

// ─── Text Normalization ───────────────────────────────────────────────────────

function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u0640\u064B-\u064F\u0670-\u0674]/g, '')
    .replace(/\s+/g, ' ');
}

// ─── Enhanced Scoring ─────────────────────────────────────────────────────────

/**
 * تقييم محسّن مع دعم البحث عن البادئة
 */
function scoreVariantEnhanced(
  variant: ProductVariant,
  query: string,
): {
  score: number;
  matchType: SearchResult['matchType'];
  matchedField?: string;
} {
  const normalizedQuery = normalizeSearchText(query);
  const queryLength = normalizedQuery.length;
  let bestScore = 0;
  let bestMatchType: SearchResult['matchType'] = 'fuzzy';
  let matchedField: string | undefined;

  // ─── البادئة (Prefix) — للبحث السريع ───────────────────────────────────────

  // إذا كان البحث 2-3 حروف، ركّز على البادئة
  if (queryLength <= 3) {
    // بادئة الباركود
    if (
      variant.barcode &&
      normalizeSearchText(variant.barcode).startsWith(normalizedQuery)
    ) {
      return {
        score: SCORING.prefix_barcode,
        matchType: 'prefix',
        matchedField: 'barcode',
      };
    }

    // بادئة الاسم
    if (
      variant.product?.name &&
      normalizeSearchText(variant.product.name).startsWith(normalizedQuery)
    ) {
      return {
        score: SCORING.prefix_exact,
        matchType: 'prefix',
        matchedField: 'product.name',
      };
    }

    // بادئة المرجع
    if (
      variant.ref &&
      normalizeSearchText(variant.ref).startsWith(normalizedQuery)
    ) {
      return {
        score: SCORING.prefix_exact,
        matchType: 'prefix',
        matchedField: 'ref',
      };
    }
  }

  // ─── البحث الدقيق والجزئي ──────────────────────────────────────────────────

  const fields: Array<{
    name: keyof typeof SearchResult['matchType'];
    value: string | null | undefined;
    scoreExact: number;
    scorePartial: number;
    scoreStart?: number;
  }> = [
    {
      name: 'barcode',
      value: variant.barcode,
      scoreExact: SCORING.barcode_exact,
      scorePartial: SCORING.barcode_partial,
    },
    {
      name: 'ref',
      value: variant.ref,
      scoreExact: SCORING.ref_exact,
      scorePartial: SCORING.ref_partial,
    },
    {
      name: 'product.name',
      value: variant.product?.name,
      scoreExact: SCORING.name_exact,
      scorePartial: SCORING.name_partial,
      scoreStart: SCORING.name_start,
    },
    {
      name: 'variant_name',
      value: variant.variant_name,
      scoreExact: SCORING.variant_name,
      scorePartial: 150,
    },
  ];

  for (const field of fields) {
    if (!field.value) continue;

    const normalizedValue = normalizeSearchText(field.value);

    // مطابقة دقيقة
    if (normalizedValue === normalizedQuery) {
      if (field.scoreExact > bestScore) {
        bestScore = field.scoreExact;
        bestMatchType = field.name.includes('barcode')
          ? 'barcode'
          : field.name.includes('ref')
            ? 'ref'
            : 'exact_name';
        matchedField = field.name;
      }
      continue;
    }

    // يبدأ بـ (الأهم للبحث السريع)
    if (field.scoreStart && normalizedValue.startsWith(normalizedQuery)) {
      const score = field.scoreStart + normalizedQuery.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatchType = 'partial_name';
        matchedField = field.name;
      }
      continue;
    }

    // بحث جزئي
    if (normalizedValue.includes(normalizedQuery)) {
      const position = normalizedValue.indexOf(normalizedQuery);
      const score = field.scorePartial + 100 / (position + 1);
      if (score > bestScore) {
        bestScore = score;
        bestMatchType = field.name.includes('barcode')
          ? 'barcode'
          : 'partial_name';
        matchedField = field.name;
      }
    }
  }

  // fuzzy search فقط إذا لم نجد شيء
  if (bestScore === 0 && queryLength >= 2) {
    // للبحث القصير (2-3 حروف)، كن متساهلاً أكثر
    const threshold = queryLength === 2 ? 0.6 : 0.5;

    const allSearchableText = [
      variant.barcode,
      variant.ref,
      variant.product?.name,
      variant.variant_name,
      variant.product?.family?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const similarity = similarityRatio(
      normalizeSearchText(allSearchableText),
      normalizedQuery,
    );

    if (similarity > threshold) {
      bestScore = similarity > 0.8 ? SCORING.fuzzy_high : SCORING.fuzzy_medium;
      bestMatchType = 'fuzzy';
    }
  }

  return { score: bestScore, matchType: bestMatchType, matchedField };
}

// ─── Main Search Function ─────────────────────────────────────────────────────

/**
 * بحث محسّن مع دعم البحث السريع
 */
export function searchVariantsEnhanced(
  variants: ProductVariant[],
  query: string,
  options: {
    maxResults?: number;
    minScore?: number;
    activeOnly?: boolean;
  } = {},
): SearchResults {
  const startTime = performance.now();
  const { maxResults = 100, activeOnly = true } = options;

  // تعديل minScore حسب طول البحث
  let minScore = options.minScore ?? 50;
  const queryLength = query.trim().length;

  if (queryLength === 2) {
    minScore = 30; // متساهل أكثر للبحث بـ حرفين فقط
  } else if (queryLength === 3) {
    minScore = 40; // متساهل للبحث بـ 3 حروف
  } else if (queryLength <= 1) {
    minScore = 0; // بدون حد أدنى للحرف الواحد
  }

  // كاش
  const cacheKey = `${normalizeSearchText(query)}-${activeOnly}`;
  const cachedResults = cache.get(cacheKey);

  if (cachedResults) {
    return {
      query,
      results: cachedResults.slice(0, maxResults),
      total: cachedResults.length,
      executionTime: performance.now() - startTime,
    };
  }

  // تطبيق الفلاتر
  let filtered = variants;
  if (activeOnly) {
    filtered = filtered.filter(v => v.active && v.product?.active);
  }

  // إذا كان البحث فارغاً
  if (!query.trim()) {
    const empty = filtered
      .slice(0, maxResults)
      .map(v => ({
        variant: v,
        score: 0,
        matchType: 'partial_name' as const,
      }));

    cache.set(cacheKey, empty);
    return {
      query,
      results: empty,
      total: filtered.length,
      executionTime: performance.now() - startTime,
    };
  }

  // التقييم
  const scored: SearchResult[] = filtered
    .map(variant => {
      const { score, matchType, matchedField } = scoreVariantEnhanced(
        variant,
        query,
      );
      return {
        variant,
        score,
        matchType,
        matchedField,
      };
    })
    .filter(r => r.score >= minScore)
    .sort((a, b) => {
      // أولاً: prefix matches
      if (a.matchType === 'prefix' && b.matchType !== 'prefix') return -1;
      if (a.matchType !== 'prefix' && b.matchType === 'prefix') return 1;

      // ثانياً: الدرجة
      if (b.score !== a.score) return b.score - a.score;

      // ثالثاً: الاسم
      return (a.variant.product?.name || '').localeCompare(
        b.variant.product?.name || '',
      );
    })
    .slice(0, maxResults);

  cache.set(cacheKey, scored);

  return {
    query,
    results: scored,
    total: scored.length,
    executionTime: performance.now() - startTime,
  };
}

// ─── Debounce Utility ─────────────────────────────────────────────────────────

/**
 * debounce ذكي — يقلل التأخير للبحث القصير
 */
export function createSmartDebouncedSearch(
  fn: (query: string) => SearchResults,
  baseDelayMs: number = 100,
) {
  let timeoutId: NodeJS.Timeout;
  let lastQuery = '';

  return (query: string): Promise<SearchResults> => {
    return new Promise(resolve => {
      clearTimeout(timeoutId);
      lastQuery = query;

      // تأخير أقل للبحث القصير (2-3 حروف)
      const queryLength = query.trim().length;
      let delay = baseDelayMs;

      if (queryLength <= 2) {
        delay = 50; // بحث سريع جداً للحرف أو حرفين
      } else if (queryLength <= 3) {
        delay = 75; // بحث سريع للـ 3 حروف
      } else {
        delay = 100; // debounce عادي
      }

      timeoutId = setTimeout(() => {
        if (query === lastQuery) {
          resolve(fn(query));
        }
      }, delay);
    });
  };
}

// ─── Cache Management ──────────────────────────────────────────────────────────

export function clearSearchCache(): void {
  cache.clear();
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default {
  searchVariantsEnhanced,
  createSmartDebouncedSearch,
  clearSearchCache,
  normalizeSearchText,
};