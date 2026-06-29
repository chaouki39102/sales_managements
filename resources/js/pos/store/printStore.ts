// resources/js/pos/store/printStore.ts
// ════════════════════════════════════════════════════════════════════════════
//  POS Print Store — Device layer only (localStorage printer selection).
//
//  DB layer functions are now in print-settings/ with an ApiClient-first
//  signature. We wrap them here with the host's HTTP client so POS code
//  retains the same calling convention it always had.
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPatch } from '@/lib/api/core/client';
import {
  dbFetchTemplates as _dbFetchTemplates,
  dbFetchTemplate   as _dbFetchTemplate,
  dbSaveTemplate    as _dbSaveTemplate,
  dbCopyTemplate    as _dbCopyTemplate,
  dbSaveDocConfigs  as _dbSaveDocConfigs,
  dbFetchDocConfigs as _dbFetchDocConfigs,
} from '@/pages/settings/print-settings/services/printStoreService';

// Minimal ApiClient adapter — only the methods printStoreService uses
const hostApi = { get: apiGet, patch: apiPatch } as any;

export const DB_KEY_TEMPLATES   = 'print:templates';
export const DB_KEY_DOC_CONFIGS = 'print:doc_configs';
export const tplKey = (docCode: string, size: string) => `${docCode}_${size}`;

export const dbFetchTemplates = ()         => _dbFetchTemplates(hostApi);
export const dbFetchTemplate  = (docCode: string, size: string) => _dbFetchTemplate(hostApi, docCode, size as any);
export const dbSaveTemplate   = (docCode: string, size: string, tpl: any) => _dbSaveTemplate(hostApi, docCode, size as any, tpl);
export const dbCopyTemplate   = (sourceCode: string, targetCode: string, size: string) => _dbCopyTemplate(hostApi, sourceCode, targetCode, size as any);
export const dbSaveDocConfigs = (configs: any[]) => _dbSaveDocConfigs(hostApi, configs);
export const dbFetchDocConfigs = ()         => _dbFetchDocConfigs(hostApi);

import type { DetectedPrinter, PaperSize } from '@/pages/settings/print-settings/types';
import type { DocumentPrintConfig, ReceiptTemplate80mm } from '@/pages/settings/print-settings/types';
import { defaultTemplate } from '@/pages/settings/print-settings/types';

// ─── Device Keys (localStorage) ──────────────────────────────────────────────

const DEV_KEY_PRINTERS   = (slug: string) => `print:printers:${slug}`;
const DEV_KEY_DOC_DEVICE = (slug: string) => `print:device_doc:${slug}`;

// ════════════════════════════════════════════════════════════════════════════
//  Device Layer — الطابعات واختيار الطابعة per-doc (localStorage)
// ════════════════════════════════════════════════════════════════════════════

export function deviceGetPrinters(slug: string): DetectedPrinter[] {
  try {
    const raw = localStorage.getItem(DEV_KEY_PRINTERS(slug));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deviceSavePrinters(slug: string, printers: DetectedPrinter[]): void {
  try { localStorage.setItem(DEV_KEY_PRINTERS(slug), JSON.stringify(printers)); }
  catch { /* storage full */ }
}

/** الطابعة المختارة لمستند بعينه على هذا الجهاز */
export function deviceGetPrinterForDoc(slug: string, docCode: string): string | null {
  try {
    const raw = localStorage.getItem(DEV_KEY_DOC_DEVICE(slug));
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    return map[docCode] ?? null;
  } catch { return null; }
}

export function deviceSetPrinterForDoc(slug: string, docCode: string, printerId: string | null): void {
  try {
    const raw = localStorage.getItem(DEV_KEY_DOC_DEVICE(slug));
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (printerId === null) delete map[docCode];
    else map[docCode] = printerId;
    localStorage.setItem(DEV_KEY_DOC_DEVICE(slug), JSON.stringify(map));
  } catch { /* ignore */ }
}

// ════════════════════════════════════════════════════════════════════════════
//  Unified getPrintConfig — للاستخدام في POS عند الطباعة
// ════════════════════════════════════════════════════════════════════════════

export interface ResolvedPrintConfig {
  template:    ReceiptTemplate80mm;
  printerId:   string | null;
  copies:      number;
  autoPrint:   boolean;
  showPreview: boolean;
  paperSize:   PaperSize;
  enabled:     boolean;
}

/** يُستدعى في POS قبل الطباعة — يدمج DB + Device */
export async function getResolvedPrintConfig(
  slug: string, docCode: string, configs: DocumentPrintConfig[],
): Promise<ResolvedPrintConfig> {
  const config = configs.find(c => c.docTypeCode === docCode);

  if (!config || !config.enabled || config.paperSize === 'none') {
    return {
      template:    defaultTemplate(),
      printerId:   null,
      copies:      1,
      autoPrint:   false,
      showPreview: false,
      paperSize:   'none',
      enabled:     false,
    };
  }

  const size     = config.paperSize as PaperSize;
  const template = await dbFetchTemplate(docCode, size);
  const printerId = deviceGetPrinterForDoc(slug, docCode) ?? config.printerId ?? null;

  return {
    template,
    printerId,
    copies:      config.copies ?? 1,
    autoPrint:   config.autoPrint ?? false,
    showPreview: config.showPreview ?? true,
    paperSize:   size,
    enabled:     true,
  };
}
