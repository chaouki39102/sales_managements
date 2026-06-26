// resources/js/pos/hooks/usePrintSettings.ts
// ════════════════════════════════════════════════════════════════════════════
// إصلاحات جوهرية عن النسخة السابقة:
//
//   1. الحفظ والتحميل من DB عبر settingsApi (وليس localStorage فقط)
//   2. قالب منفصل لكل (docTypeCode + paperSize) — مفتاح: print_tpl_{CODE}_{SIZE}
//   3. localStorage كـ cache محلي فقط — DB هو مصدر الحقيقة
//   4. useAllTemplates() — hook يُرجع كل قوالب المستند الواحد
//   5. useSavePrintSettings() — mutation موحَّد يحفظ template + docConfig معاً
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useCallback }           from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch }               from '@/lib/api/core/client';
import { useActiveSlug }                  from '@/lib/store/appStore';
import type { DocumentPrintConfig, ReceiptTemplate80mm, PaperSize } from '@/pages/settings/print-settings/types';
import { defaultTemplate }                from '@/pages/settings/print-settings/types';

// ─── مفاتيح الإعدادات في DB ──────────────────────────────────────────────────

/** مفتاح قالب مستند بعينه في DB */
export const TPL_KEY = (docCode: string, size: PaperSize) =>
  `print_tpl_${docCode}_${size}`;

/** مفتاح إعدادات المستندات (enabled, copies...) في DB */
export const DOC_CONFIGS_KEY = 'print_doc_configs';

/** مفتاح الطابعات في DB */
export const PRINTERS_KEY = 'print_printers';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const printKeys = {
  all:        (slug: string) => [slug, 'print-settings'] as const,
  template:   (slug: string, docCode: string, size: PaperSize) =>
    [slug, 'print-settings', 'tpl', docCode, size] as const,
  docConfigs: (slug: string) => [slug, 'print-settings', 'doc-configs'] as const,
  printers:   (slug: string) => [slug, 'print-settings', 'printers'] as const,
};

// ─── API helpers ──────────────────────────────────────────────────────────────

/**
 * جلب قيمة إعداد واحد من DB
 * GET /{company}/settings/{key}
 */
async function fetchSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await apiGet<{ key: string; value: unknown }>(`/settings/${key}`);
    const raw = (res as any)?.value ?? (res as any)?.data?.value;
    if (raw === null || raw === undefined || raw === '') return fallback;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
    }
    return raw as T;
  } catch {
    // fallback إلى localStorage
    try {
      const cached = localStorage.getItem(`erp_${key}`);
      if (cached) return JSON.parse(cached) as T;
    } catch {}
    return fallback;
  }
}

/**
 * حفظ إعداد في DB
 * PATCH /{company}/settings  { key: value }
 */
async function saveSetting(key: string, value: unknown): Promise<void> {
  const payload = { [key]: typeof value === 'string' ? value : JSON.stringify(value) };
  await apiPatch('/settings', payload);
  // cache محلي
  try { localStorage.setItem(`erp_${key}`, JSON.stringify(value)); } catch {}
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * جلب قالب مستند واحد من DB
 */
export function usePrintTemplate(docCode: string, size: PaperSize) {
  const slug = useActiveSlug();
  const key  = TPL_KEY(docCode, size);

  return useQuery({
    queryKey: printKeys.template(slug ?? '', docCode, size),
    queryFn:  () => fetchSetting<ReceiptTemplate80mm>(key, defaultTemplate()),
    enabled:  !!slug && !!docCode && size !== 'none',
    staleTime: 5 * 60_000,
    // دمج مع القيم الافتراضية لضمان أي حقل جديد مُضاف مستقبلاً
    select: (data) => ({ ...defaultTemplate(), ...data }),
  });
}

/**
 * جلب إعدادات المستندات من DB (enabled, copies, paperSize...)
 */
export function useDocPrintConfigs() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey: printKeys.docConfigs(slug ?? ''),
    queryFn:  () => fetchSetting<DocumentPrintConfig[]>(DOC_CONFIGS_KEY, []),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

/**
 * جلب الطابعات من DB
 */
export function usePrintersList() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey: printKeys.printers(slug ?? ''),
    queryFn:  () => fetchSetting<import('@/pages/settings/print-settings/types').DetectedPrinter[]>(
      PRINTERS_KEY, [],
    ),
    enabled:  !!slug,
    staleTime: 60_000,
  });
}

/**
 * Mutation: حفظ قالب مستند في DB
 */
export function useSavePrintTemplate() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: async ({
      docCode, size, template,
    }: {
      docCode:  string;
      size:     PaperSize;
      template: ReceiptTemplate80mm;
    }) => {
      await saveSetting(TPL_KEY(docCode, size), template);
    },
    onSuccess: (_, { docCode, size }) => {
      if (slug) {
        qc.invalidateQueries({
          queryKey: printKeys.template(slug, docCode, size),
        });
      }
    },
  });
}

/**
 * Mutation: حفظ إعدادات المستندات في DB
 */
export function useSaveDocConfigs() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: async (configs: DocumentPrintConfig[]) => {
      await saveSetting(DOC_CONFIGS_KEY, configs);
    },
    onSuccess: () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: printKeys.docConfigs(slug) });
      }
    },
  });
}

/**
 * Mutation: حفظ الطابعات في DB
 */
export function useSavePrinters() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: async (
      printers: import('@/pages/settings/print-settings/types').DetectedPrinter[],
    ) => {
      await saveSetting(PRINTERS_KEY, printers);
    },
    onSuccess: () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: printKeys.printers(slug) });
      }
    },
  });
}

// ─── Hook للاستخدام في printService / POS ────────────────────────────────────

/**
 * usePrintSettings — للاستخدام في POSPage و ProfessionalReceipt
 * يُرجع القالب + إعداد المستند الجاهز للطباعة
 */
export function usePrintSettings(docTypeCode: string) {
  const { data: allConfigs = [] } = useDocPrintConfigs();

  const docConfig = useMemo(
    () => allConfigs.find(c => c.docTypeCode === docTypeCode) ?? null,
    [allConfigs, docTypeCode],
  );

  const size = docConfig?.paperSize ?? 'none';

  const { data: template } = usePrintTemplate(docTypeCode, size as PaperSize);

  const finalTemplate = useMemo(
    () => template ?? defaultTemplate(),
    [template],
  );

  return {
    docConfig,
    template:         finalTemplate,
    isPrintEnabled:   !!(docConfig?.enabled && size !== 'none'),
    copies:           docConfig?.copies ?? 1,
    autoPrint:        docConfig?.autoPrint ?? false,
    showPreview:      docConfig?.showPreview ?? true,
    paperSize:        size as PaperSize,
  };
}
