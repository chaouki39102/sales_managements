// ════════════════════════════════════════════════════════════════════════════
// pos/utils/printService.ts
//
// Canonical ESC/POS thermal print pipeline.
// Delegates to ESCPOSRenderer (IRenderer<Uint8Array>) for actual byte
// construction. This file provides convenience wrappers and WebUSB delivery.
// ════════════════════════════════════════════════════════════════════════════

import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import { escposRenderer } from '@/pages/settings/print-settings/renderers/ESCPOSRenderer';

export interface ThermalPrintResult {
  ok:      boolean;
  method:  'webusb' | 'blob' | 'none';
  message: string;
}

// ─── Capability check ─────────────────────────────────────────────────────────

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * اكتشاف طابعات متصلة سابقاً (بدون dialog)
 * مفيد لـ auto-print بعد البيع
 */
export async function getConnectedPrinters(): Promise<any[]> {
  const usb = (navigator as any).usb;
  if (!usb) return [];
  try {
    return await usb.getDevices();
  } catch {
    return [];
  }
}

// ─── Thermal auto-print preference (localStorage) ────────────────────────────

const THERMAL_AUTO_PRINT_KEY = 'thermal_auto_print';

export function getThermalAutoPrint(): boolean {
  try {
    return localStorage.getItem(THERMAL_AUTO_PRINT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setThermalAutoPrint(enabled: boolean): void {
  try {
    localStorage.setItem(THERMAL_AUTO_PRINT_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}



/**
 * Build ESC/POS bytes from the universal data contract + template.
 * Delegates to ESCPOSRenderer for actual byte construction.
 */
export async function buildReceiptBytesFromTemplate(
  template:  PrintTemplate,
  data:      UniversalDocumentData,
  _docNumber?: string,
): Promise<Uint8Array> {
  const result = await escposRenderer.render({
    data,
    template,
  });
  return result.payload;
}

/**
 * Print thermal receipt from the universal data contract + template.
 * This is the canonical entry point for thermal printing — same data and
 * visibility controls as the visual preview (UniversalPreview).
 */
export async function printThermalViaWebUSBFromTemplate(
  template:  PrintTemplate,
  data:      UniversalDocumentData,
  docNumber?: string,
): Promise<ThermalPrintResult> {
  const bytes = await buildReceiptBytesFromTemplate(template, data, docNumber);
  return sendBytesToReceiptPrinter(bytes);
}

// ─── WebUSB lifecycle helpers ─────────────────────────────────────────────────

/** رسائل عربية واضحة بدل DOMException الإنجليزية الخام. */
export function describeUsbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/claim/i.test(msg)) {
    return 'الطابعة مشغولة من برنامج آخر أو من نافذة متصفح أخرى — أغلق ما يستخدم الطابعة وأعد المحاولة، وإن استمر الخطأ افصل كابل الطابعة وأعد توصيله';
  }
  if (/open|already open/i.test(msg)) {
    return 'تعذر فتح الاتصال بالطابعة — افصل كابل الطابعة وأعد توصيله ثم أعد المحاولة';
  }
  if (/transfer|stall/i.test(msg)) {
    return 'انقطع الاتصال بالطابعة أثناء الطباعة — تحقق من الكابل وأعد المحاولة';
  }
  return msg || 'فشلت الطباعة';
}

function findThermalOutEndpoint(config: any): { ifaceNum: number; epNum: number } {
  for (let i = 0; i < (config?.interfaces?.length ?? 0); i++) {
    const iface = config.interfaces[i];
    const alt = iface.alternates?.[0];
    if (!alt || alt.interfaceClass === 0x02) continue;
    const ep = alt.endpoints?.find(
      (e: any) => e.direction === 'out' && (e.type === 'bulk' || e.type === 'interrupt'),
    );
    if (ep) return { ifaceNum: iface.interfaceNumber, epNum: ep.endpointNumber };
  }
  return { ifaceNum: 0, epNum: 2 };
}

async function ensureOpenConfigured(device: any): Promise<void> {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
}

/**
 * دورة WebUSB كاملة لجهاز واحد: open → claim (مع إعادة محاولة واحدة تعيد
 * تدوير المقبض) → transfer → release → close.
 *
 * يغلق الجهاز دائماً حتى عند فشل claim/transfer — تسريب مقبض مفتوح هو ما
 * يجعل كل محاولة طباعة لاحقة تفشل بـ "Unable to claim interface" حتى إعادة
 * تحميل الصفحة.
 */
export async function sendBytesToUsbDevice(
  device: any,
  bytes: Uint8Array,
): Promise<ThermalPrintResult> {
  let ifaceNum: number | null = null;
  try {
    await ensureOpenConfigured(device);
    const ep = findThermalOutEndpoint(device.configuration);

    try {
      await device.claimInterface(ep.ifaceNum);
    } catch {
      // مقبض قديم أو مشغول لحظياً: أغلقه وانتظر ثم أعد الفتح والمحاولة مرة
      // واحدة — ينجح في معظم الحالات العابرة (spooler مشغول للتو، نافذة ثانية).
      try { await device.close(); } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 400));
      await ensureOpenConfigured(device);
      await device.claimInterface(ep.ifaceNum);
    }
    ifaceNum = ep.ifaceNum;

    const result = await device.transferOut(ep.epNum, bytes);
    if (result.status !== 'ok') {
      return { ok: false, method: 'webusb', message: `فشل الإرسال: ${result.status}` };
    }
    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };
  } catch (err) {
    return { ok: false, method: 'webusb', message: describeUsbError(err) };
  } finally {
    if (ifaceNum !== null) {
      try { await device.releaseInterface(ifaceNum); } catch { /* ignore */ }
    }
    try { await device.close(); } catch { /* ignore */ }
  }
}

const WEBUSB_TEST_BYTES = new Uint8Array([
  0x1b, 0x40, 0x1b, 0x61, 0x01,
  ...new TextEncoder().encode('--- TEST ---\nPrinter OK\n'),
  0x1d, 0x56, 0x00,
]);

/** صفحة اختبار عبر جهاز USB محدد (يُستخدم في تبويب الطابعات بالإعدادات). */
export async function printTestPageViaUsbDevice(device: any): Promise<ThermalPrintResult> {
  return sendBytesToUsbDevice(device, WEBUSB_TEST_BYTES);
}

export async function sendBytesToReceiptPrinter(bytes: Uint8Array): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb;
  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح' };
  }

  const devices: any[] = await usb.getDevices();
  if (!devices.length) {
    return { ok: false, method: 'none', message: 'لم يتم العثور على طابعة حرارية' };
  }

  return sendBytesToUsbDevice(devices[0], bytes);
}

export async function openCashDrawerViaWebUSB(): Promise<ThermalPrintResult> {
  const KICK_DRAWER_PIN2 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
  return sendBytesToReceiptPrinter(KICK_DRAWER_PIN2);
}
