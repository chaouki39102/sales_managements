// resources/js/pos/hooks/usePrintSettings.ts
// ════════════════════════════════════════════════════════════════════════════
//  Hook موحَّد لإعدادات الطباعة
//  — Template loading via Print Runtime (API) instead of legacy settings API
//  — Document config still uses settings API for printing behavior
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveSlug }    from '@/lib/store/appStore';
import {
  dbFetchDocConfigs, dbSaveDocConfigs,
  deviceGetPrinters, deviceSavePrinters,
} from '../store/printStore';
import { usePrintTemplatesList, resolveTemplate } from '@/pages/settings/print-settings/runtime';
import type { DocTypeCode } from '@/pages/settings/print-settings/types';
import type {
  DocumentPrintConfig,
  DetectedPrinter, PaperSize,
} from '@/pages/settings/print-settings/types';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const K = {
  docConfigs: (slug: string) => [slug, 'print', 'doc-configs'] as const,
  printers:   (slug: string) => [slug, 'print', 'printers']    as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** تكوين المستندات من DB (طباعة: نسخ، auto-print، طابعة، إلخ) */
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

/** hook للاستخدام في POSPage — يُرجع القالب والإعدادات لنوع مستند */
export function usePrintSettings(docTypeCode: string) {
  const { data: configs = [] } = useDocPrintConfigs();
  const config = configs.find(c => c.docTypeCode === docTypeCode) ?? null;
  const size   = (config?.paperSize ?? 'none') as PaperSize;

  const { data: templates = [] } = usePrintTemplatesList(docTypeCode as DocTypeCode);
  const template = resolveTemplate(templates, docTypeCode, size !== 'none' ? size : '80mm') ?? null;

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
