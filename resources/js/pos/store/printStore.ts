// resources/js/pos/store/printStore.ts
// ════════════════════════════════════════════════════════════════════════════
//  POS Print Store — Device layer only (localStorage printer selection)
//  and document print config (settings API).
//
//  Template loading has been migrated to the Print Runtime
//  (usePrintTemplatesList + TemplateResolver via /print-templates API).
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPatch } from '@/lib/api/core/client';
import {
  dbSaveDocConfigs  as _dbSaveDocConfigs,
  dbFetchDocConfigs as _dbFetchDocConfigs,
} from '@/pages/settings/print-settings/services/printStoreService';

// Minimal ApiClient adapter — only the methods printStoreService uses
const hostApi = { get: apiGet, patch: apiPatch } as any;

export const DB_KEY_DOC_CONFIGS = 'print:doc_configs';
export const tplKey = (docCode: string, size: string) => `${docCode}_${size}`;

export const dbSaveDocConfigs = (configs: any[]) => _dbSaveDocConfigs(hostApi, configs);
export const dbFetchDocConfigs = ()         => _dbFetchDocConfigs(hostApi);

import type { DetectedPrinter } from '@/pages/settings/print-settings/types';

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
