// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/seeds.ts
// Seeds API — بذر البيانات الأولية للشركة
// ════════════════════════════════════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import type { SeedKey, SeedResult } from '../core/types';

// ─── كل الـ seeds المتاحة بالترتيب الصحيح ────────────────────────────────────

export const SEED_DEFINITIONS: Array<{
  key:   SeedKey;
  label: string;
  group: 'global' | 'tenant';
}> = [
  // Global (مشتركة — تُدرَج مرة واحدة)
  { key: 'currencies',                  label: 'العملات (DZD, EUR, USD)',             group: 'global' },
  { key: 'tvas',                        label: 'نسب الضريبة TVA',                     group: 'global' },
  { key: 'legal-forms',                 label: 'الأشكال القانونية',                   group: 'global' },
  { key: 'fiscal-stamps',               label: 'طوابع الدفع',                         group: 'global' },
  { key: 'inventory-valuation-methods', label: 'طرق تقييم المخزون',                  group: 'global' },
  { key: 'wilayas-communes',            label: 'الولايات والبلديات',                  group: 'global' },
  { key: 'document-base-operations',    label: 'العمليات الأساسية للوثائق',           group: 'global' },
  { key: 'document-statuses',           label: 'حالات الوثائق',                       group: 'global' },
  { key: 'document-types',              label: 'أنواع الوثائق التجارية',              group: 'global' },
  // Tenant (مرتبطة بالشركة — تُدرَج لكل شركة)
  { key: 'units',                       label: 'وحدات القياس',                        group: 'tenant' },
  { key: 'price-levels',                label: 'مستويات الأسعار',                     group: 'tenant' },
  { key: 'warehouses',                  label: 'مستودع رئيسي',                        group: 'tenant' },
  { key: 'treasury-accounts',           label: 'حسابات الخزينة',                      group: 'tenant' },
  { key: 'payment-modes',               label: 'طرق الدفع',                           group: 'tenant' },
  { key: 'numbering-series',            label: 'سلاسل الترقيم التلقائي',              group: 'tenant' },
  { key: 'expense-categories',          label: 'تصنيفات المصاريف',                    group: 'tenant' },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export const seedsApi = {
  run: (slug: string, key: SeedKey) =>
    apiPost<{ message: string }>(
      `/${slug}/seeds/${key}`,
      undefined,
      { _skipSlug: true } as Parameters<typeof apiPost>[2],
    ),
} as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface SeedProgress {
  total:     number;
  completed: number;
  results:   SeedResult[];
  current:   SeedKey | null;
}

/**
 * يُشغِّل الـ seeds بشكل تسلسلي ويتتبع التقدم
 * بعد الاكتمال: يُبطل كاش جميع lookups الخاصة بالشركة
 */
export function useSeedCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      keys,
      onProgress,
    }: {
      slug:       string;
      keys:       SeedKey[];
      onProgress: (progress: SeedProgress) => void;
    }): Promise<SeedResult[]> => {
      const results: SeedResult[] = [];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        onProgress({ total: keys.length, completed: i, results, current: key });

        try {
          const res = await seedsApi.run(slug, key);
          results.push({ key, success: true, message: res.message });
        } catch (err: any) {
          results.push({
            key,
            success: false,
            message: err?.message ?? 'فشل',
          });
          // نكمل بقية الـ seeds حتى لو فشل واحد
        }
      }

      onProgress({ total: keys.length, completed: keys.length, results, current: null });
      return results;
    },

    onSuccess: (_, { slug }) => {
      // إبطال كاش كل lookups الخاصة بهذه الشركة
      qc.invalidateQueries({ queryKey: tenantKeys.lookups.all(slug) });
    },
  });
}
