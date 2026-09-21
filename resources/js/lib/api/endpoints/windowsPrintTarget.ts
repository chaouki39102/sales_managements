// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/windowsPrintTarget.ts — اختيار طابعة ويندوز الهدف
// ════════════════════════════════════════════════════════════════════════════
// المنطق المشترك للطباعة الصامتة على ويندوز: يستعمله POS (pos/utils/thermalPrint)
// وطباعة مستندات A4/A5 (print-settings/runtime/silentPrint). هذا الملف خالٍ من
// محرك ESC/POS والخصم الحرارية حتى لا يُسحب Webbus/refr إلى حزم الطباعة العادية.
//
// الاختيار التلقائي بدون أي إعداد: المحفوظ ← طابعة النظام المسجّلة ←
// حرارية-الاسم من كشف ويندوز ← الطابعة الافتراضية لويندوز ← أي طابعة.
// ════════════════════════════════════════════════════════════════════════════

import { systemPrintersApi } from '@/lib/api/endpoints/systemPrinters';
import { deviceGetPrinters } from '@/pos/store/printStore';

// ─── Base64 ──────────────────────────────────────────────────────────────────

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function utf8Base64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

// ─── اختيار الهدف ──────────────────────────────────────────────────────────

/** أنماط أسماء الطابعات الحرارية/الخاصة بالإيصالات (تقبل ESC/POS الخام). */
export const THERMAL_RE =
  /pos|thermal|receipt|xprinter|epson|gprinter|tm-\d|rp\d+|58mm|80mm/i;

const PREFER_WIN_KEY = 'print:prefer-windows';
const winTargetKey = (slug: string) => `print:win-target:${slug}`;

export function readPreferWin(): boolean {
  try {
    return localStorage.getItem(PREFER_WIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function writePreferWin(): void {
  try {
    localStorage.setItem(PREFER_WIN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function readRememberedTarget(slug?: string | null): string | null {
  if (!slug) return null;
  try {
    return localStorage.getItem(winTargetKey(slug));
  } catch {
    return null;
  }
}

export function writeRememberedTarget(
  slug: string | null | undefined,
  name: string,
): void {
  if (!slug) return;
  try {
    localStorage.setItem(winTargetKey(slug), name);
  } catch {
    /* ignore */
  }
}

export function clearRememberedTarget(slug?: string | null): void {
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

export interface WinPrinterLite {
  name: string;
  is_default: boolean;
}

/**
 * اختيار طابعة ويندوز تلقائياً: الاسم المحفوظ ← طابعة نظام مسجّلة ←
 * حرارية-الاسم من الكشف المباشر ← الافتراضية ← أول طابعة.
 */
export async function resolveWindowsTarget(
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