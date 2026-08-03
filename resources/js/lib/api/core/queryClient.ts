// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/queryClient.ts
// React Query Client — إعدادات مُحسَّنة للأداء
// ════════════════════════════════════════════════════════════════════════════

import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { ApiError } from './client';
import { companyKeys } from './queryKeys';

// ─── Constants ────────────────────────────────────────────────────────────────

const MINUTE = 60_000;

// ─── Global error handler ─────────────────────────────────────────────────────

function onGlobalError(error: unknown): void {
  if (error instanceof ApiError) {
    // 401 يُعالَج في الـ Interceptor مباشرة
    if (error.status === 401) return;

    if (import.meta.env.DEV) {
      console.error(`[API ${error.status}] ${error.message}`, error.errors);
    }
  }
}

// ─── QueryClient instance ─────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onGlobalError,
  }),

  mutationCache: new MutationCache({
    onError: onGlobalError,
  }),

  defaultOptions: {
    queries: {
      staleTime:            10 * MINUTE,
      gcTime:               30 * MINUTE,
      // ✅ refetchOnMount: true — ضروري حتى يعمل invalidateQueries بشكل صحيح
      // بدونه: بعد mutation + invalidate، القائمة لا تتحدث لأن الـ component لم يُعد mount
      refetchOnMount:       true,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
      // إعادة المحاولة مرة واحدة فقط — بسرعة
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // لا إعادة محاولة لأخطاء الزبون
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },

    mutations: {
      retry: false,
    },
  },
});

// ─── Cache invalidation helpers ───────────────────────────────────────────────

/**
 * إبطال كل كاش شركة معينة عند تبديل الشركة النشطة
 */export function invalidateCompanyCache(qc: QueryClient, slug?: string): Promise<void> {
    return slug
        ? qc.invalidateQueries({ queryKey: [slug] })
        : qc.invalidateQueries({ queryKey: companyKeys.all });
}

/**
 * إزالة كل بيانات الـ tenant من الكاش عند تسجيل الخروج
 */
export function clearAllCache(): void {
  queryClient.clear();
}

/**
 * إبطال كل مفاتيح كاش المخزون الخاصة بشركة — تُستدعى بعد أي عملية
 * تُغيّر المخزون من خارج صفحة نقاط البيع (إنشاء/تعديل/حذف مستند، بيع سريع…).
 *
 * يغطي عائلات المفاتيح التالية (كُلَّها مسبوقة بادئة، لذا invalidateQueries يطابقها):
 * - [slug, 'pos-stock', …]        — نقاط البيع الكلاسيكية (POSPage)
 * - [slug, 'pos-pro-stock', …]    — نقاط البيع برو (POSProPage)
 * - [slug, 'warehouse-stock', …]  — مستودع مستند إضافة/تعديل + useDocumentLookups
 * - [slug, 'inventory', …]        — stock-at / movements / summary / lots (صفحة المخزون)
 */
export function invalidateStockQueries(qc: QueryClient, slug: string): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: [slug, 'pos-stock'] }),
    qc.invalidateQueries({ queryKey: [slug, 'pos-pro-stock'] }),
    qc.invalidateQueries({ queryKey: [slug, 'warehouse-stock'] }),
    qc.invalidateQueries({ queryKey: [slug, 'inventory'] }),
  ]).then(() => undefined);
}

export default queryClient;
