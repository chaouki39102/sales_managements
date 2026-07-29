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

export async function sendBytesToReceiptPrinter(bytes: Uint8Array): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb;
  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح' };
  }
  try {
    const devices: any[] = await usb.getDevices();
    if (!devices.length) {
      return { ok: false, method: 'none', message: 'لم يتم العثور على طابعة حرارية' };
    }

    const device = devices[0];
    await device.open();

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    const config = device.configuration;
    let ifaceNum = 0;
    let epNum = 2;
    for (let i = 0; i < (config?.interfaces?.length ?? 0); i++) {
      const iface = config.interfaces[i];
      const alt = iface.alternates?.[0];
      if (!alt || alt.interfaceClass === 0x02) continue;
      const ep = alt.endpoints?.find(
        (e: any) => e.direction === 'out' && (e.type === 'bulk' || e.type === 'interrupt'),
      );
      if (ep) { ifaceNum = iface.interfaceNumber; epNum = ep.endpointNumber; break; }
    }

    await device.claimInterface(ifaceNum);
    const result = await device.transferOut(epNum, bytes);
    await device.releaseInterface(ifaceNum);
    try { await device.close(); } catch {}

    if (result.status !== 'ok') {
      return { ok: false, method: 'webusb', message: `فشل الإرسال: ${result.status}` };
    }
    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };
  } catch (err: any) {
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة' };
  }
}

export async function openCashDrawerViaWebUSB(): Promise<ThermalPrintResult> {
  const KICK_DRAWER_PIN2 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
  return sendBytesToReceiptPrinter(KICK_DRAWER_PIN2);
}
