// ════════════════════════════════════════════════════════════════════════════
// pos/utils/thermalPrint.ts — طباعة حرارية ذكية مع مسار احتياطي
//
// WebUSB على ويندوز يفشل غالباً بـ "Unable to claim interface": تعريف
// النظام (usbprint.sys) يحجز واجهة الطابعة من نوع printer-class فور
// توصيلها، وكروم لا يستطيع فك الحجز على ويندوز.
//
// سلسلة الاحتياط عند فشل WebUSB (كلها صامتة — بدون معاينة أو حوار):
// 1. طابعة حرارية مسجّلة/مكتشفة → بايتات ESC/POS خام عبر spooler ويندوز.
// 2. أي طابعة ويندوز عادية (ليزر/حبر مثل Canon) → تحويل الإيصال إلى نص
//    وطباعته GDI (نفس محرك Word) — لا معنى لإرسال ESC/POS لليزر.
// الاختيار التلقائي بدون أي إعداد: المحفوظ ← طابعة النظام المسجّلة ←
// حرارية-الاسم من كشف ويندوز ← الطابعة الافتراضية لويندوز ← أي طابعة.
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

function utf8Base64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

/** أنماط أسماء الطابعات الحرارية/الخاصة بالإيصالات (تقبل ESC/POS الخام). */
const THERMAL_RE =
  /pos|thermal|receipt|xprinter|epson|gprinter|tm-\d|rp\d+|58mm|80mm/i;

const PREFER_WIN_KEY = 'print:prefer-windows';
const winTargetKey = (slug: string) => `print:win-target:${slug}`;

function readPreferWin(): boolean {
  try {
    return localStorage.getItem(PREFER_WIN_KEY) === '1';
  } catch {
    return false;
  }
}

function writePreferWin(): void {
  try {
    localStorage.setItem(PREFER_WIN_KEY, '1');
  } catch {
    /* ignore */
  }
}

function readRememberedTarget(slug?: string | null): string | null {
  if (!slug) return null;
  try {
    return localStorage.getItem(winTargetKey(slug));
  } catch {
    return null;
  }
}

function writeRememberedTarget(slug: string | null | undefined, name: string): void {
  if (!slug) return;
  try {
    localStorage.setItem(winTargetKey(slug), name);
  } catch {
    /* ignore */
  }
}

function clearRememberedTarget(slug?: string | null): void {
  if (!slug) return;
  try {
    localStorage.removeItem(winTargetKey(slug));
  } catch {
    /* ignore */
  }
}

/** الطابعة الحرارية المسجّلة محلياً في متجر الطابعات (إن وُجدت). */
function savedSystemTarget(slug?: string | null): string | null {
  if (!slug) return null;
  try {
    const sys = (deviceGetPrinters(slug) ?? []).filter(
      (p) => p.source === 'system',
    );
    return sys.find((p) => p.isDefault)?.name ?? sys[0]?.name ?? null;
  } catch {
    return null;
  }
}

interface WinPrinterLite {
  name: string;
  is_default: boolean;
}

/**
 * اختيار طابعة ويندوز تلقائياً: الاسم المحفوظ ← طابعة نظام مسجّلة ←
 * حرارية-الاسم من الكشف المباشر ← الافتراضية ← أول طابعة.
 */
async function resolveWindowsTarget(
  slug?: string | null,
): Promise<string | null> {
  const remembered = readRememberedTarget(slug);
  if (remembered) return remembered;

  const saved = savedSystemTarget(slug);
  if (saved) return saved;

  try {
    const payload = await systemPrintersApi.list();
    const printers: WinPrinterLite[] = payload?.printers ?? [];
    if (printers.length === 0) return null;
    const thermal = printers.find((p) => THERMAL_RE.test(p.name));
    return (
      thermal?.name ?? printers.find((p) => p.is_default)?.name ?? printers[0]!.name
    );
  } catch {
    return null;
  }
}

/**
 * تحويل بايتات ESC/POS إلى أسطر نصية مقروءة — يُستعمل عندما تكون طابعة
 * الهدف عادية (ليزر/حبر) ولا تفهم أوامر ESC/POS الخام.
 *
 * القواعد: أوامر الأقواس GS ( k تُتخطى بطولها المعلَن (pL pH)، الباركود
 * GS k يُقرأ حتى NUL، الصورة النقطية GS v 0 بطولها المحسوب، وأغلب الأوامر
 * البسيطة طولها 3 بايتات. LF يفصل الأسطر وHT يصبح فراغين.
 */
export function escPosToPlainLines(bytes: Uint8Array): string[] {
  const text: number[] = [];
  const len = bytes.length;
  let i = 0;
  while (i < len) {
    const b = bytes[i]!;
    if (b === 0x0a) {
      text.push(0x0a);
      i++;
      continue;
    }
    if (b === 0x09) {
      text.push(0x20, 0x20);
      i++;
      continue;
    }
    if (b < 0x20 || b === 0x7f) {
      if (b === 0x1b || b === 0x1d || b === 0x1c || b === 0x10) {
        const c = i + 1 < len ? bytes[i + 1]! : -1;
        if (b !== 0x10 && c === 0x28) {
          // ESC ( fn pL pH data… : رأس الطول المعلن عند +3/+4 وليس +2/+3
          const pL = i + 3 < len ? bytes[i + 3]! : 0;
          const pH = i + 4 < len ? bytes[i + 4]! : 0;
          i = Math.min(i + 5 + pL + 256 * pH, len);
          continue;
        }
        if (b === 0x1d && c === 0x76) {
          // GS v 0 m xL xH yL yH data (صورة نقطية)
          if (i + 8 <= len) {
            const w = bytes[i + 3]! + 256 * bytes[i + 4]!;
            const h = bytes[i + 5]! + 256 * bytes[i + 6]!;
            i += 8 + w * h;
          } else {
            i = len;
          }
          continue;
        }
        if (b === 0x1d && c === 0x6b) {
          // GS k باركود: حتى NUL
          let j = i + 2;
          while (j < len && bytes[j] !== 0) j++;
          i = Math.min(j + 1, len);
          continue;
        }
        if (b === 0x10 && c === 0x14) {
          // DLE DC4 n m t
          i += 5;
          continue;
        }
        if ((b === 0x1b && c === 0x40) || (b === 0x1c && c === 0x26)) {
          // ESC @ (تهيئة) و FS & — أوامر من بايتين فقط
          i += 2;
          continue;
        }
        // أوامر بسيطة شائعة (ESC a n / GS h n / ...) طولها 3 بايتات
        i += 3;
        continue;
      }
      // بقية بايتات التحكم تُهمل
      i++;
      continue;
    }
    text.push(b);
    i++;
  }

  let out = '';
  try {
    out = new TextDecoder('utf-8').decode(new Uint8Array(text));
  } catch {
    out = '';
  }
  return out.replace(/\r/g, '').split('\n');
}

async function windowsRawFallback(
  bytes: Uint8Array,
  slug?: string | null,
): Promise<ThermalPrintResult> {
  const target = await resolveWindowsTarget(slug);
  if (!target) {
    return {
      ok: false,
      method: 'none',
      message:
        'تعذر الاتصال المباشر بالطابعة — وللطباعة عبر ويندوز ثبّت الطابعة في النظام ثم أضفها من الإعدادات ← الطابعات',
    };
  }

  const isThermal = THERMAL_RE.test(target);

  try {
    if (isThermal) {
      await systemPrintersApi.rawPrint(target, bytesToBase64(bytes));
    } else {
      const lines = escPosToPlainLines(bytes);
      await systemPrintersApi.rawText(target, utf8Base64(lines.join('\n')));
    }
    writeRememberedTarget(slug, target);
    writePreferWin();
    return {
      ok: true,
      method: 'windows',
      message: `تمت الطباعة («${target}»)`,
    };
  } catch (err: any) {
    const msg: string =
      err?.response?.data?.message ??
      err?.message ??
      'فشلت الطباعة عبر ويندوز';
    // الطابعة اختفت من قائمة النظام → اسحب الاختيار المحفوظ للمرة القادمة
    if (typeof msg === 'string' && msg.includes('غير موجودة')) {
      clearRememberedTarget(slug);
    }
    return { ok: false, method: 'none', message: msg };
  }
}

/**
 * إرسال بايتات ESC/POS: WebUSB أولاً (يعمل حين لا يحجز تعريف النظام
 * الواجهة)، ثم fallback تلقائي إلى ويندوز. بعد أول نجاح لويندوز على هذا
 * الجهاز يصير ويندوز هو المسار الأول مباشرة — طباعة أسرع بلا محاولة USB.
 * إذا فشل ويندوز تُعاد محاولة WebUSB كحل أخير.
 */
export async function sendBytesToPrinterSmart(
  bytes: Uint8Array,
  slug?: string | null,
): Promise<ThermalPrintResult> {
  let usbRes: ThermalPrintResult | null = null;

  if (!readPreferWin()) {
    usbRes = await sendBytesToReceiptPrinter(bytes);
    if (usbRes.ok) return usbRes;
  }

  const winRes = await windowsRawFallback(bytes, slug);
  if (winRes.ok) return winRes;

  if (!usbRes) usbRes = await sendBytesToReceiptPrinter(bytes);
  if (usbRes.ok) return usbRes;

  return winRes;
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
