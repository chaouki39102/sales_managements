// ════════════════════════════════════════════════════════════════════════════
// pos/utils/thermalPrint.ts — طباعة حرارية ذكية مع مسار احتياطي
//
// WebUSB على ويندوز يفشل غالباً بـ "Unable to claim interface": تعريف
// النظام (usbprint.sys) يحجز واجهة الطابعة من نوع printer-class فور
// توصيلها، وكروم لا يستطيع فك الحجز على ويندوز. المسار الاحتياطي يرسل
// البايتات نفسها عبر Windows Print Spooler (RAW) إلى طابعة النظام
// المختارة في الإعدادات ← الطابعات (المميّزة بنجمة أو أول طابعة نظام).
// ════════════════════════════════════════════════════════════════════════════

import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import {
  buildReceiptBytesFromTemplate,
  sendBytesToReceiptPrinter,
  KICK_DRAWER_PIN2,
  type ThermalPrintResult,
} from './printService';
import { systemPrintersApi } from '@/lib/api/endpoints/systemPrinters';
import { deviceGetPrinters } from '@/pos/store/printStore';

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** اسم طابعة ويندوز المختارة للطباعة الحرارية على هذا الجهاز (أو null). */
function resolveWindowsTarget(slug?: string | null): string | null {
  if (!slug) return null;
  try {
    const sys = (deviceGetPrinters(slug) ?? []).filter(
      (p) => p.source === 'system',
    );
    return (
      sys.find((p) => p.isDefault)?.name ?? sys[0]?.name ?? null
    );
  } catch {
    return null;
  }
}

async function windowsRawFallback(
  bytes: Uint8Array,
  slug?: string | null,
): Promise<ThermalPrintResult> {
  const target = resolveWindowsTarget(slug);
  if (!target) {
    return {
      ok: false,
      method: 'none',
      message:
        'تعذر الاتصال المباشر بالطابعة — وللطباعة عبر ويندوز ثبّت الطابعة في النظام ثم أضفها من الإعدادات ← الطابعات',
    };
  }

  try {
    await systemPrintersApi.rawPrint(target, bytesToBase64(bytes));
    return {
      ok: true,
      method: 'windows',
      message: `تمت الطباعة عبر ويندوز («${target}»)`,
    };
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ??
      err?.message ??
      'فشلت الطباعة عبر ويندوز';
    return { ok: false, method: 'none', message: msg };
  }
}

/**
 * إرسال بايتات ESC/POS: WebUSB أولاً (يعمل حين لا يحجز تعريف النظام
 * الواجهة)، ثم fallback تلقائي إلى spooler ويندوز عند الفشل.
 */
export async function sendBytesToPrinterSmart(
  bytes: Uint8Array,
  slug?: string | null,
): Promise<ThermalPrintResult> {
  const usbRes = await sendBytesToReceiptPrinter(bytes);
  if (usbRes.ok) return usbRes;

  return windowsRawFallback(bytes, slug);
}

/** طباعة فاتورة حرارية من القالب — WebUSB ثم ويندوز تلقائياً. */
export async function printThermalSmart(
  template: PrintTemplate,
  data: UniversalDocumentData,
  docNumber: string | undefined,
  slug?: string | null,
): Promise<ThermalPrintResult> {
  const bytes = await buildReceiptBytesFromTemplate(template, data, docNumber);
  return sendBytesToPrinterSmart(bytes, slug);
}

/** فتح الدرج — WebUSB ثم ويندوز تلقائياً (صامت: لا رسائل خطأ مزعجة). */
export async function openCashDrawerSmart(
  slug?: string | null,
): Promise<ThermalPrintResult> {
  return sendBytesToPrinterSmart(KICK_DRAWER_PIN2, slug);
}
