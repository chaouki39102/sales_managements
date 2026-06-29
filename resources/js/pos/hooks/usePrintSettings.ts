// resources/js/pos/hooks/usePrintSettings.ts
// ════════════════════════════════════════════════════════════════════════════
//  Hook موحَّد لإعدادات الطباعة
//  بسيط — يفوِّض كل عمليات DB/Device إلى printStore
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveSlug }    from '@/lib/store/appStore';
import { defaultTemplate }  from '@/reporting';
import {
  dbFetchTemplates, dbFetchDocConfigs,
  dbSaveTemplate, dbSaveDocConfigs, dbCopyTemplate,
  deviceGetPrinters, deviceSavePrinters,
  tplKey,
} from '../store/printStore';
import type {
  ReceiptTemplate80mm, DocumentPrintConfig,
  DetectedPrinter, PaperSize,
} from '@/reporting';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const K = {
  templates:  (slug: string) => [slug, 'print', 'templates']   as const,
  docConfigs: (slug: string) => [slug, 'print', 'doc-configs'] as const,
  printers:   (slug: string) => [slug, 'print', 'printers']    as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** كل القوالب من DB */
export function useAllTemplates() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey:  K.templates(slug),
    queryFn:   dbFetchTemplates,
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

/** قالب مستند واحد مع merge مع defaultTemplate */
export function usePrintTemplate(docCode: string, size: PaperSize) {
  const slug  = useActiveSlug() ?? '';
  const key   = tplKey(docCode, size);
  const query = useAllTemplates();

  const template = query.data?.[key]
    ? { ...defaultTemplate(), ...query.data[key] }
    : defaultTemplate();

  return { template, isLoading: query.isLoading };
}

/** تكوين المستندات من DB */
export function useDocPrintConfigs() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey:  K.docConfigs(slug),
    queryFn:   dbFetchDocConfigs,
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

/** الطابعات من localStorage (device-specific) */
export function usePrintersList() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey: K.printers(slug),
    queryFn:  () => deviceGetPrinters(slug),
    enabled:  !!slug,
    staleTime: Infinity, // لا تُعاد الجلب — localStorage لا يتغير من تلقاء نفسه
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** حفظ قالب في DB */
export function useSaveTemplate() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ docCode, size, tpl }: {
      docCode: string; size: PaperSize; tpl: ReceiptTemplate80mm;
    }) => dbSaveTemplate(docCode, size, tpl),

    // Optimistic update — الـ UI يتحدث فوراً قبل DB
    onMutate: async ({ docCode, size, tpl }) => {
      await qc.cancelQueries({ queryKey: K.templates(slug) });
      const prev = qc.getQueryData<Record<string, ReceiptTemplate80mm>>(K.templates(slug));
      qc.setQueryData(K.templates(slug), (old: Record<string, ReceiptTemplate80mm> = {}) => ({
        ...old,
        [tplKey(docCode, size)]: tpl,
      }));
      return { prev };
    },

    onError: (_, __, ctx) => {
      // rollback عند الخطأ
      if (ctx?.prev) qc.setQueryData(K.templates(slug), ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: K.templates(slug) });
    },
  });
}

/** نسخ قالب لمستند آخر */
export function useCopyTemplate() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceCode, targetCode, size }: {
      sourceCode: string; targetCode: string; size: PaperSize;
    }) => dbCopyTemplate(sourceCode, targetCode, size),

    onSuccess: () => qc.invalidateQueries({ queryKey: K.templates(slug) }),
  });
}

/** حفظ تكوين المستندات */
export function useSaveDocConfigs() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (configs: DocumentPrintConfig[]) => dbSaveDocConfigs(configs),

    onMutate: async (configs) => {
      await qc.cancelQueries({ queryKey: K.docConfigs(slug) });
      const prev = qc.getQueryData(K.docConfigs(slug));
      qc.setQueryData(K.docConfigs(slug), configs);
      return { prev };
    },

    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.docConfigs(slug), ctx.prev);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: K.docConfigs(slug) }),
  });
}

/** حفظ الطابعات في localStorage */
export function useSavePrinters() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (printers: DetectedPrinter[]) => {
      deviceSavePrinters(slug, printers);
      return Promise.resolve(printers);
    },
    onSuccess: (printers) => {
      qc.setQueryData(K.printers(slug), printers);
    },
  });
}

// ─── للاستخدام في POS (بسيط) ─────────────────────────────────────────────────

const PAPER_WIDTH_MAP: Record<string, number> = {
  '80mm': 80,
  '58mm': 58,
  'A4': 210,
  'A5': 148,
};

/** hook للاستخدام في POSPage — يُرجع إعدادات الطباعة لنوع مستند */
export function usePrintSettings(docTypeCode: string) {
  const { data: configs = [] } = useDocPrintConfigs();
  const config = configs.find(c => c.docTypeCode === docTypeCode) ?? null;
  const size   = (config?.paperSize ?? 'none') as PaperSize;
  const { template } = usePrintTemplate(docTypeCode, size !== 'none' ? size : '80mm');

  return {
    config,
    template,
    enabled:     !!(config?.enabled && size !== 'none'),
    autoPrint:   config?.autoPrint   ?? false,
    showPreview: config?.showPreview ?? true,
    copies:      config?.copies      ?? 1,
    paperSize:   size,
    paperWidth:  PAPER_WIDTH_MAP[size] ?? 80,
    printerId:   config?.printerId ?? null,
  };
}
