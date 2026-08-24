// ════════════════════════════════════════════════════════════════════════════
// pos/utils/thermalPrint.ts — طباعة حرارية ذكية مع مسار احتياطي
//
// WebUSB على ويندوز يفشل غالباً بـ "Unable to claim interface": تعريف
// النظام (usbprint.sys) يحجز واجهة الطابعة من نوع printer-class فور
// توصيلها، وكروم لا يستطيع فك الحجز على ويندوز.
//
// سلسلة الاحتياط عند فشل WebUSB (كلها صامتة — بدون معاينة أو حوار):
// 1. طابعة حرارية مسجّلة/مكتشفة → بايتات ESC/POS خام عبر spooler ويندوز.
// 2. أي طابعة ويندوز عادية (ليزر/حبر مثل Canon) + HTML متوفر → طباعة HTML
//    بدقة كاملة عبر Edge headless ← لقطة PNG ← GDI PrintDocument
//    (نفس تنسيق المعاينة).
// 3. أي طابعة عادية بلا HTML (أو فشل مسار HTML) → تحويل الإيصال إلى نص
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
 * النص العربي داخل التدفق مرمّز Windows-1256 (من encodeArabic) فيُفكّ
 * عبر الجدول العكسي — وليس UTF-8 — وإلا طُبعت رموزاً مشوّهة على الليزر.
 */
/**
 * عكس جدول Windows-1256 المستعمل في EscPosBuilder.encodeArabic — البايتات
 * العالية في تدفق ESC/POS هي ترميز 1256 وليست UTF-8، وفكّها كـ UTF-8 يُنتج
 * رموزاً غير مقروءة على الطابعة العادية (ليزر/حبر).
 */
const WIN1256_REV: Record<number, string> = {
  0xc1: '\u0621', 0xc2: '\u0622', 0xc3: '\u0623', 0xc4: '\u0624',
  0xc5: '\u0625', 0xc6: '\u0626', 0xc7: '\u0627', 0xc8: '\u0628',
  0xc9: '\u0629', 0xca: '\u062a', 0xcb: '\u062b', 0xcc: '\u062c',
  0xcd: '\u062d', 0xce: '\u062e', 0xcf: '\u062f', 0xd0: '\u0630',
  0xd1: '\u0631', 0xd2: '\u0632', 0xd3: '\u0633', 0xd4: '\u0634',
  0xd5: '\u0635', 0xd6: '\u0636', 0xd8: '\u0637', 0xd9: '\u0638',
  0xda: '\u0639', 0xdb: '\u063a', 0xdd: '\u0641', 0xde: '\u0642',
  0xdf: '\u0643', 0xe1: '\u0644', 0xe3: '\u0645', 0xe4: '\u0646',
  0xe5: '\u0647', 0xe6: '\u0648', 0xec: '\u0649', 0xed: '\u064a',
  0xf2: '\u064b', 0xf3: '\u064c', 0xf4: '\u064d', 0xf5: '\u064e',
  0xf6: '\u064f', 0xf7: '\u0650', 0xf8: '\u0651', 0xf9: '\u0652',
  0xb0: '\u0660', 0xb1: '\u0661', 0xb2: '\u0662', 0xb3: '\u0663',
  0xb4: '\u0664', 0xb5: '\u0665', 0xb6: '\u0666', 0xb7: '\u0667',
  0xb8: '\u0668', 0xb9: '\u0669',
  0xac: '\u060c', 0xbb: '\u061b', 0xbf: '\u061f',
  0xe2: '\ufefb',
};

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

  // بايتات عالية = ترميز Windows-1256 (من encodeArabic) وليست UTF-8
  let out = '';
  for (const b of text) {
    out += b < 0x80 ? String.fromCharCode(b) : (WIN1256_REV[b] ?? '?');
  }
  return out.replace(/\r/g, '').split('\n');
}

async function windowsRawFallback(
  bytes: Uint8Array,
  slug?: string | null,
  html?: string,
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
    } else if (html) {
      // مسار الدقة: نفس تنسيق المعاينة عبر Edge ← لقطة PNG ← GDI.
      // عند فشله نتراجع للنص العادي حتى لا تُعطَل طباعة الفاتورة أبداً.
      try {
        await systemPrintersApi.html(target, utf8Base64(html));
      } catch (htmlErr: any) {
        console.warn(
          '[print] html path failed, falling back to plain text:',
          htmlErr?.response?.data?.message ?? htmlErr?.message,
        );
        const lines = escPosToPlainLines(bytes);
        await systemPrintersApi.rawText(target, utf8Base64(lines.join('\n')));
      }
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
  html?: string,
): Promise<ThermalPrintResult> {
  let usbRes: ThermalPrintResult | null = null;

  if (!readPreferWin()) {
    usbRes = await sendBytesToReceiptPrinter(bytes);
    if (usbRes.ok) return usbRes;
  }

  const winRes = await windowsRawFallback(bytes, slug, html);
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
  html?: string,
): Promise<ThermalPrintResult> {
  const bytes = await buildReceiptBytesFromTemplate(template, data, docNumber);
  return sendBytesToPrinterSmart(bytes, slug, html);
}

/** فتح الدرج — WebUSB ثم ويندوز تلقائياً (صامت: لا رسائل خطأ مزعجة). */
export async function openCashDrawerSmart(
  slug?: string | null,
): Promise<ThermalPrintResult> {
  return sendBytesToPrinterSmart(KICK_DRAWER_PIN2, slug);
}
