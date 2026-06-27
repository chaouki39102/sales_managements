// resources/js/pos/hooks/usePrintSettings.ts
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentPrintConfig, ReceiptTemplate80mm, PaperSize, DetectedPrinter } from '@/pages/settings/print-settings/types';
import { defaultTemplate } from '@/pages/settings/print-settings/types';

export const TPL_KEY = (docCode: string, size: PaperSize) => `print_tpl_${docCode}_${size}`;
export const DOC_CONFIGS_KEY = 'print_doc_configs';
export const PRINTERS_KEY = 'print_printers';

const printKeys = {
  all:        (slug: string) => [slug, 'print-settings'] as const,
  template:   (slug: string, docCode: string, size: PaperSize) => [slug, 'print-settings', 'tpl', docCode, size] as const,
  docConfigs: (slug: string) => [slug, 'print-settings', 'doc-configs'] as const,
  printers:   (slug: string) => [slug, 'print-settings', 'printers'] as const,
};

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
    try {
      const cached = localStorage.getItem(`erp_${key}`);
      if (cached) return JSON.parse(cached) as T;
    } catch {}
    return fallback;
  }
}

async function saveSetting(key: string, value: unknown): Promise<void> {
  const payload = { [key]: typeof value === 'string' ? value : JSON.stringify(value) };
  await apiPatch('/settings', payload);
  try { localStorage.setItem(`erp_${key}`, JSON.stringify(value)); } catch {}
}

export function usePrintTemplate(docCode: string, size: PaperSize) {
  const slug = useActiveSlug();
  const key  = TPL_KEY(docCode, size);

  return useQuery({
    queryKey: printKeys.template(slug ?? '', docCode, size),
    queryFn:  () => fetchSetting<ReceiptTemplate80mm>(key, defaultTemplate()),
    enabled:  !!slug && !!docCode && size !== 'none',
    staleTime: 5 * 60_000,
    select: (data) => ({ ...defaultTemplate(), ...data }),
  });
}

export function useDocPrintConfigs() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey: printKeys.docConfigs(slug ?? ''),
    queryFn:  () => fetchSetting<DocumentPrintConfig[]>(DOC_CONFIGS_KEY, []),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function usePrintersList() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey: printKeys.printers(slug ?? ''),
    queryFn:  () => fetchSetting<DetectedPrinter[]>(PRINTERS_KEY, []),
    enabled:  !!slug,
    staleTime: 60_000,
  });
}

export function useSavePrintTemplate() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: async ({ docCode, size, template }: { docCode: string; size: PaperSize; template: ReceiptTemplate80mm }) => {
      await saveSetting(TPL_KEY(docCode, size), template);
    },
    onSuccess: (_, { docCode, size }) => {
      if (slug) qc.invalidateQueries({ queryKey: printKeys.template(slug, docCode, size) });
    },
  });
}

export function useSaveDocConfigs() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: async (configs: DocumentPrintConfig[]) => {
      await saveSetting(DOC_CONFIGS_KEY, configs);
    },
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: printKeys.docConfigs(slug) });
    },
  });
}

export function useSavePrinters() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: async (printers: DetectedPrinter[]) => {
      await saveSetting(PRINTERS_KEY, printers);
    },
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: printKeys.printers(slug) });
    },
  });
}

export function usePrintSettings(docTypeCode: string) {
  const { data: allConfigs = [] } = useDocPrintConfigs();

  const docConfig = useMemo(
    () => allConfigs.find(c => c.docTypeCode === docTypeCode) ?? null,
    [allConfigs, docTypeCode],
  );

  const size = docConfig?.paperSize ?? 'none';
  const { data: template } = usePrintTemplate(docTypeCode, size as PaperSize);
  const finalTemplate = useMemo(() => template ?? defaultTemplate(), [template]);
  const paperWidth = finalTemplate.paperWidth ?? 80;

  const printers = usePrintersList();
  const selectedPrinter = useMemo(() => {
    const list = printers.data ?? [];
    if (docConfig?.printerId) {
      return list.find(p => p.id === docConfig.printerId) ?? null;
    }
    return list.find(p => p.isDefault) ?? list[0] ?? null;
  }, [printers.data, docConfig]);

  return {
    docConfig,
    template:         finalTemplate,
    selectedPrinter,
    isPrintEnabled:   !!(docConfig?.enabled && size !== 'none'),
    copies:           docConfig?.copies ?? 1,
    paperWidth,
    autoPrint:        docConfig?.autoPrint ?? false,
    showPreview:      docConfig?.showPreview ?? true,
    paperSize:        size as PaperSize,
  };
}
