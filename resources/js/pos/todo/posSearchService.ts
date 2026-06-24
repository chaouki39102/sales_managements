// ════════════════════════════════════════════════════════════════════════════
// lib/pos/services/posSearchService.ts
// 
// نظام بحث ذكي احترافي للـ POS مع:
// ✅ Fuzzy search (تصحيح الأخطاء الإملائية)
// ✅ Priority-based scoring (باركود > اسم دقيق > بحث جزئي)
// ✅ Debounce محسَّن
// ✅ Cache مع TTL
// ✅ تجميع النتائج حسب درجة الملاءمة
// ════════════════════════════════════════════════════════════════════════════

import type { ProductVariant, Product } from '@/lib/api/core/types';
import { Str } from '@/utils/string';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  variant: ProductVariant;
  score: number;
  matchType: 'barcode' | 'exact_name' | 'partial_name' | 'fuzzy' | 'ref';
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
  // أولويات المطابقة (كلما زاد الرقم، كانت النتيجة أفضل)
  barcode_exact: 1000,      // مطابقة دقيقة للباركود
  barcode_partial: 800,     // بحث جزئي في الباركود
  ref_exact: 750,           // مطابقة دقيقة للمرجع
  ref_partial: 700,         // بحث جزئي في المرجع
  name_exact: 650,          // اسم منتج دقيق
  name_start: 550,          // يبدأ باسم
  name_partial: 450,        // بحث جزئي في الاسم
  family_match: 300,        // مطابقة الفئة
  variant_name: 200,        // اسم المتغير
  fuzzy_high: 150,          // fuzzy مع تشابه عالي (> 0.8)
  fuzzy_medium: 80,         // fuzzy متوسط (0.6-0.8)
} as const;

const CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

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

// ─── Levenshtein Distance (Fuzzy Matching) ────────────────────────────────────

/**
 * حساب المسافة بين نصين — يُستخدم للبحث الضبابي
 * قيمة منخفضة = تشابه أكثر
 */
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
        matrix[i - 1][j] + 1,     // حذف
        matrix[i][j - 1] + 1,     // إدراج
        matrix[i - 1][j - 1] + cost, // استبدال
      );
    }
  }

  return matrix[aLen][bLen];
}

/**
 * حساب نسبة التشابه (0-1)
 * 1.0 = متطابق تماماً
 * 0.0 = مختلف تماماً
 */
function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

// ─── Search Functions ─────────────────────────────────────────────────────────

/**
 * تطبيع النص للبحث (حذف المسافات الزائدة، تحويل للصغير، إزالة التشكيل)
 */
function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u0640\u064B-\u064F\u0670-\u0674]/g, '') // إزالة التشكيل العربي
    .replace(/\s+/g, ' '); // تطبيع المسافات
}

/**
 * قائمة الأولويات عند البحث
 */
interface SearchField {
  value: string | null | undefined;
  scoreExact: number;
  scorePartial: number;
  scoreStart?: number;
}

/**
 * تقييم منتج واحد حسب درجة المطابقة
 */
function scoreVariant(variant: ProductVariant, query: string): { score: number; matchType: SearchResult['matchType']; matchedField?: string } {
  const normalizedQuery = normalizeSearchText(query);
  let bestScore = 0;
  let bestMatchType: SearchResult['matchType'] = 'fuzzy';
  let matchedField: string | undefined;

  const fields: [keyof typeof SearchField, SearchField][] = [
    [
      'barcode',
      {
        value: variant.barcode,
        scoreExact: SCORING.barcode_exact,
        scorePartial: SCORING.barcode_partial,
      },
    ],
    [
      'ref',
      {
        value: variant.ref,
        scoreExact: SCORING.ref_exact,
        scorePartial: SCORING.ref_partial,
      },
    ],
    [
      'product.name',
      {
        value: variant.product?.name,
        scoreExact: SCORING.name_exact,
        scorePartial: SCORING.name_partial,
        scoreStart: SCORING.name_start,
      },
    ],
    [
      'variant_name',
      {
        value: variant.variant_name,
        scoreExact: SCORING.variant_name,
        scorePartial: 150,
      },
    ],
  ];

  // البحث عن مطابقات دقيقة وجزئية
  for (const [fieldName, field] of fields) {
    if (!field.value) continue;

    const normalizedValue = normalizeSearchText(field.value);

    // مطابقة دقيقة
    if (normalizedValue === normalizedQuery) {
      if (field.scoreExact > bestScore) {
        bestScore = field.scoreExact;
        bestMatchType = fieldName.includes('barcode') ? 'barcode' : 'exact_name';
        matchedField = fieldName;
      }
      continue;
    }

    // يبدأ بـ (للأسماء فقط)
    if (field.scoreStart && normalizedValue.startsWith(normalizedQuery)) {
      const score = field.scoreStart + normalizedQuery.length; // الأطول أولاً
      if (score > bestScore) {
        bestScore = score;
        bestMatchType = 'partial_name';
        matchedField = fieldName;
      }
      continue;
    }

    // بحث جزئي
    if (normalizedValue.includes(normalizedQuery)) {
      // المطابقة في البداية أفضل من الوسط
      const position = normalizedValue.indexOf(normalizedQuery);
      const score = field.scorePartial + (100 / (position + 1));
      if (score > bestScore) {
        bestScore = score;
        bestMatchType = fieldName.includes('barcode') ? 'barcode' : 'partial_name';
        matchedField = fieldName;
      }
    }
  }

  // fuzzy search — إذا لم نجد مطابقة دقيقة أو جزئية
  if (bestScore === 0) {
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

    // threshold: فقط نتائج مع تشابه أكثر من 50%
    if (similarity > 0.5) {
      bestScore = similarity > 0.8 ? SCORING.fuzzy_high : SCORING.fuzzy_medium;
      bestMatchType = 'fuzzy';
    }
  }

  return { score: bestScore, matchType: bestMatchType, matchedField };
}

// ─── Main Search Function ─────────────────────────────────────────────────────

/**
 * البحث الرئيسي في قائمة المتغيرات
 */
export function searchVariants(
  variants: ProductVariant[],
  query: string,
  options: {
    maxResults?: number;
    minScore?: number;
    activeOnly?: boolean;
  } = {},
): SearchResults {
  const startTime = performance.now();
  const {
    maxResults = 50,
    minScore = 50,
    activeOnly = true,
  } = options;

  // تفريغ البحث — استخدام الكاش
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

  // تطبيق الفلاتر الأساسية
  let filtered = variants;
  if (activeOnly) {
    filtered = filtered.filter(v => v.active && v.product?.active);
  }

  // إذا كان البحث فارغاً، أعد أفضل النتائج (المفعلة والمرتبة)
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

  // تقييم كل متغير
  const scored: SearchResult[] = filtered
    .map(variant => {
      const { score, matchType, matchedField } = scoreVariant(variant, query);
      return {
        variant,
        score,
        matchType,
        matchedField,
      };
    })
    .filter(r => r.score >= minScore)
    .sort((a, b) => {
      // ترتيب أولاً بالدرجة، ثم بالاسم (للثبات)
      if (b.score !== a.score) return b.score - a.score;
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

/**
 * بحث مع فئات
 */
export interface CategorySearchResult {
  category: { id: number; name: string; _count?: { products: number } };
  variants: SearchResult[];
  score: number; // نسبة تطابق الفئة
}

export function searchWithCategories(
  variants: ProductVariant[],
  query: string,
  categories: Array<{ id: number; name: string; _count?: { products: number } }> = [],
): CategorySearchResult[] {
  const results = searchVariants(variants, query);

  // تجميع النتائج حسب الفئة
  const byCategory = new Map<
    number,
    { category: (typeof categories)[0]; variants: SearchResult[] }
  >();

  for (const result of results.results) {
    const familyId = result.variant.product?.family_id;
    if (!familyId) continue;

    const category = categories.find(f => f.id === familyId);
    if (!category) continue;

    if (!byCategory.has(familyId)) {
      byCategory.set(familyId, { category, variants: [] });
    }
    byCategory.get(familyId)!.variants.push(result);
  }

  // ترتيب الفئات حسب عدد النتائج
  return Array.from(byCategory.values())
    .map(item => ({
      ...item,
      score: item.variants.reduce((sum, r) => sum + r.score, 0) / item.variants.length,
    }))
    .sort((a, b) => b.score - a.score);
}

// ─── Debounce utility ─────────────────────────────────────────────────────────

export function createDebouncedSearch(
  fn: (query: string) => SearchResults,
  delayMs: number = 300,
) {
  let timeoutId: NodeJS.Timeout;
  let lastQuery = '';

  return (query: string): Promise<SearchResults> => {
    return new Promise(resolve => {
      clearTimeout(timeoutId);
      lastQuery = query;

      timeoutId = setTimeout(() => {
        if (query === lastQuery) {
          resolve(fn(query));
        }
      }, delayMs);
    });
  };
}

// ─── Cache management ─────────────────────────────────────────────────────────

export function clearSearchCache(): void {
  cache.clear();
}

export default {
  searchVariants,
  searchWithCategories,
  createDebouncedSearch,
  clearSearchCache,
  scoreVariant,
  normalizeSearchText,
};
