// resources/js/pos/store/printStore.ts
// ════════════════════════════════════════════════════════════════════════════
//  POS Print Store — Device layer only (localStorage printer selection).
//
//  DB layer functions (dbSaveTemplate, dbFetchTemplates, etc.) are now
//  canonical in print-settings/. Re-exported here for backward compat.
// ════════════════════════════════════════════════════════════════════════════

export {
  DB_KEY_TEMPLATES, DB_KEY_DOC_CONFIGS, tplKey,
  dbFetchTemplates, dbFetchTemplate, dbSaveTemplate,
  dbCopyTemplate, dbSaveDocConfigs, dbFetchDocConfigs,
} from '@/pages/settings/print-settings/services/printStoreService';

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
