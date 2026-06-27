// resources/js/pos/store/printStore.ts
// ════════════════════════════════════════════════════════════════════════════
//  نظام إعدادات الطباعة — المصدر الوحيد للحقيقة
//
//  طبقتان واضحتان:
//  ① DEVICE  — localStorage  — إعدادات هذا الجهاز فقط (الطابعة المختارة)
//  ② COMPANY — DB/settings   — مشترك بين كل الفريق (القوالب، تكوين المستندات)
//
//  القاعدة:
//  - ما يختلف من جهاز لجهاز     → localStorage
//  - ما يجب أن يراه كل الفريق   → DB
//
//  مفاتيح DB (settings table):
//    print:templates   → { FV_80mm: {...}, BL_80mm: {...}, ... }
//    print:doc_configs → [ { docTypeCode, enabled, paperSize, copies, ... } ]
//
//  مفاتيح localStorage (per-slug per-device):
//    print:printers:{slug}    → DetectedPrinter[]
//    print:device_doc:{slug}  → { [docTypeCode]: { printerId } }
// ════════════════════════════════════════════════════════════════════════════

import { apiPatch, apiGet } from '@/lib/api/core/client';
import type {
  ReceiptTemplate80mm, DocumentPrintConfig,
  DetectedPrinter, PaperSize,
} from '@/pages/settings/print-settings/types';
import { defaultTemplate } from '@/pages/settings/print-settings/types';

// ─── DB Keys ─────────────────────────────────────────────────────────────────

export const DB_KEY_TEMPLATES   = 'print:templates';
export const DB_KEY_DOC_CONFIGS = 'print:doc_configs';

// ─── Device Keys (localStorage) ──────────────────────────────────────────────

const DEV_KEY_PRINTERS   = (slug: string) => `print:printers:${slug}`;
const DEV_KEY_DOC_DEVICE = (slug: string) => `print:device_doc:${slug}`;

// ─── Template Key ─────────────────────────────────────────────────────────────
// مفتاح داخل print:templates dictionary
export const tplKey = (docCode: string, size: PaperSize) => `${docCode}_${size}`;

// ════════════════════════════════════════════════════════════════════════════
//  DB Layer — القوالب وتكوين المستندات (مشترك)
// ════════════════════════════════════════════════════════════════════════════

/** جلب كل القوالب من DB كـ dictionary */
export async function dbFetchTemplates(): Promise<Record<string, ReceiptTemplate80mm>> {
  try {
    const res = await apiGet<{ value: string | object }>(`/settings/${DB_KEY_TEMPLATES}`);
    const raw = (res as any)?.value ?? (res as any)?.data?.value ?? null;
    if (!raw) return {};
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed as Record<string, ReceiptTemplate80mm>;
  } catch {
    return {};
  }
}

/** جلب قالب مستند واحد */
export async function dbFetchTemplate(
  docCode: string, size: PaperSize,
): Promise<ReceiptTemplate80mm> {
  const all = await dbFetchTemplates();
  const key = tplKey(docCode, size);
  return all[key] ? { ...defaultTemplate(), ...all[key] } : defaultTemplate();
}

/** حفظ قالب واحد في DB — يدمج مع بقية القوالب */
export async function dbSaveTemplate(
  docCode: string, size: PaperSize, template: ReceiptTemplate80mm,
): Promise<void> {
  const all = await dbFetchTemplates();
  const key = tplKey(docCode, size);
  all[key]  = template;
  await apiPatch('/settings', { [DB_KEY_TEMPLATES]: JSON.stringify(all) });
}

/** نسخ قالب إلى مستند آخر في نفس حجم الورق */
export async function dbCopyTemplate(
  sourceCode: string, targetCode: string, size: PaperSize,
): Promise<void> {
  const all       = await dbFetchTemplates();
  const sourceKey = tplKey(sourceCode, size);
  const targetKey = tplKey(targetCode, size);
  if (!all[sourceKey]) throw new Error(`لا يوجد قالب لـ ${sourceCode}`);
  all[targetKey] = { ...all[sourceKey] };
  await apiPatch('/settings', { [DB_KEY_TEMPLATES]: JSON.stringify(all) });
}

/** حفظ تكوين المستندات */
export async function dbSaveDocConfigs(configs: DocumentPrintConfig[]): Promise<void> {
  await apiPatch('/settings', { [DB_KEY_DOC_CONFIGS]: JSON.stringify(configs) });
}

/** جلب تكوين المستندات */
export async function dbFetchDocConfigs(): Promise<DocumentPrintConfig[]> {
  try {
    const res = await apiGet<{ value: string | object }>(`/settings/${DB_KEY_DOC_CONFIGS}`);
    const raw = (res as any)?.value ?? (res as any)?.data?.value ?? null;
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

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
