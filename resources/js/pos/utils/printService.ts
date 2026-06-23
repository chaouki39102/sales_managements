import type { CartItem, CartTotals, Party } from '@/types';

/* ─── ESC/POS command constants ─── */
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

/* ─── Windows-1256 encoding for Arabic ─── */
const win1256Map: Record<number, number> = {
  0x060C: 0xAC, 0x061B: 0xBB, 0x061F: 0xBF, 0x0621: 0xC1, 0x0622: 0xC2,
  0x0623: 0xC3, 0x0624: 0xC4, 0x0625: 0xC5, 0x0626: 0xC6, 0x0627: 0xC7,
  0x0628: 0xC8, 0x0629: 0xC9, 0x062A: 0xCA, 0x062B: 0xCB, 0x062C: 0xCC,
  0x062D: 0xCD, 0x062E: 0xCE, 0x062F: 0xCF, 0x0630: 0xD0, 0x0631: 0xD1,
  0x0632: 0xD2, 0x0633: 0xD3, 0x0634: 0xD4, 0x0635: 0xD5, 0x0636: 0xD6,
  0x0637: 0xD7, 0x0638: 0xD8, 0x0639: 0xD9, 0x063A: 0xDA, 0x0640: 0xE0,
  0x0641: 0xE1, 0x0642: 0xE2, 0x0643: 0xE3, 0x0644: 0xE4, 0x0645: 0xE5,
  0x0646: 0xE6, 0x0647: 0xE7, 0x0648: 0xE8, 0x0649: 0xE9, 0x064A: 0xEA,
  0x064B: 0xEB, 0x064C: 0xEC, 0x064D: 0xED, 0x064E: 0xEE, 0x064F: 0xEF,
  0x0650: 0xF0, 0x0651: 0xF1, 0x0652: 0xF2, 0x067E: 0xB8, 0x0686: 0xB0,
  0x0698: 0xBA, 0x06A9: 0xC0, 0x06AF: 0xFE, 0x06CC: 0xD3, 0x06F0: 0xB2,
  0x0660: 0xB0, 0x0661: 0xB1, 0x0662: 0xB2, 0x0663: 0xB3, 0x0664: 0xB4,
  0x0665: 0xB5, 0x0666: 0xB6, 0x0667: 0xB7, 0x0668: 0xB8, 0x0669: 0xB9,
  0xFDFC: 0xCC, 0x200E: 0xFE, 0x200F: 0xFF,
};

function encodeWin1256(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const cp = s.charCodeAt(i);
    if (cp < 128) { out.push(cp); continue; }
    const mapped = win1256Map[cp];
    if (mapped !== undefined) { out.push(mapped); continue; }
    out.push(0x3F);
  }
  return out;
}

/* ─── ESC/POS builder ─── */
class EscPosBuilder {
  private buf: number[] = [];

  init()              { this.buf.push(ESC, 0x40); return this; }
  lineFeed(n = 1)     { this.buf.push(...new Array(n).fill(LF)); return this; }
  setBold(on: boolean) { this.buf.push(ESC, 0x45, on ? 1 : 0); return this; }
  setAlign(n: 0 | 1 | 2) { this.buf.push(ESC, 0x61, n); return this; }
  setFontSize(w: number, h: number) {
    this.buf.push(GS, 0x21, (Math.max(1, Math.min(8, h)) - 1) * 16 + (Math.max(1, Math.min(8, w)) - 1));
    return this;
  }
  resetFontSize()    { this.buf.push(GS, 0x21, 0); return this; }
  text(s: string)    { this.buf.push(...encodeWin1256(s)); return this; }
  center(s: string)  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string)   { return this.setAlign(2).text(s).lineFeed(); }
  divider(c = '-', len = 42) { return this.text(c.repeat(len)).lineFeed(); }
  cut()              { this.buf.push(GS, 0x56, 0); return this; }
  feedAndCut()       { return this.lineFeed(5).cut(); }

  /* ─── QR Code (ESC/POS standard) ─── */
  qrCode(data: string) {
    const enc = encodeWin1256(data);
    const len = enc.length;

    const send = (pL: number, pH: number, fn: number, payload: number[]) => {
      this.buf.push(GS, 0x28, 0x6B, pL, pH, 0x31, fn, ...payload);
    };

    send(4, 0, 0x43, [4, 0]);
    send(3, 0, 0x43, [3, 6]);
    send(3, 0, 0x45, [0, 0x33]);
    const dLen = len + 3;
    send(dLen & 0xFF, (dLen >> 8) & 0xFF, 0x50, [0x30, len & 0xFF, (len >> 8) & 0xFF, ...enc]);
    send(3, 0, 0x51, [0x30, 0x00]);
    return this;
  }

  escposBytes(): Uint8Array { return new Uint8Array(this.buf); }
}

function fmt(n: number): string {
  return n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildReceiptBytes(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): Uint8Array {
  const b = new EscPosBuilder().init();
  const now = new Date();

  b.setFontSize(2, 2).setBold(true).center('نظام المبيعات').setBold(false).resetFontSize();
  b.center('نظام ERP المتكامل');
  b.divider();

  b.right(`التاريخ: ${now.toLocaleDateString('ar-DZ')}`);
  b.right(`الوقت: ${now.toLocaleTimeString('ar-DZ')}`);
  if (docNumber) b.setBold(true).right(`الفاتورة: ${docNumber}`).setBold(false);
  if (client) b.right(`العميل: ${client.name}`);
  b.divider();

  b.setAlign(0).setBold(true);
  b.text('المنتجات');
  b.lineFeed();
  b.setBold(false);
  b.text('─'.repeat(42));
  b.lineFeed();

  items.forEach(item => {
    const total = item.unit_price_ht * item.quantity * (1 + item.tva_rate / 100);
    const disc  = item.discount_percentage;
    b.setBold(false).text(`${item.product_name ?? ''}`);
    b.lineFeed();
    b.text(`  ${item.quantity} × ${fmt(item.unit_price_ht)}`);
    if (disc > 0) b.text(` (خصم ${disc}%)`);
    b.setAlign(2).text(`= ${fmt(total)}`);
    b.setAlign(0);
    b.lineFeed();
  });

  b.divider();
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;

  b.right(`المجموع HT: ${fmt(totals.total_ht)}`);
  if (totals.total_discount > 0) b.right(`الخصم: -${fmt(totals.total_discount)}`);
  b.right(`TVA: ${fmt(totals.total_tva)}`);
  if (totals.fiscal_stamp > 0) b.right(`الطابع المالي: ${fmt(totals.fiscal_stamp)}`);
  b.divider('-', 32);
  b.setFontSize(2, 2).setBold(true).right(`الإجمالي: ${fmt(totalTtcFinal)}`).setBold(false).resetFontSize();
  b.lineFeed(1);

  if (docNumber) {
    b.setAlign(1);
    b.qrCode(docNumber);
    b.lineFeed(1);
  }

  b.lineFeed(2);
  b.center('شكراً على تعاملكم معنا');
  b.center(`نظام ERP — ${now.getFullYear()}`);
  b.lineFeed(3);

  b.feedAndCut();
  return b.escposBytes();
}

/* ─── Thermal print service ─── */
export interface ThermalPrintResult {
  ok: boolean;
  method: 'webusb' | 'blob' | 'none';
  message: string;
}

const THERMAL_AUTO_KEY = 'pos_thermal_auto_print';

export function getThermalAutoPrint(): boolean {
  return localStorage.getItem(THERMAL_AUTO_KEY) === '1';
}

export function setThermalAutoPrint(enabled: boolean): void {
  localStorage.setItem(THERMAL_AUTO_KEY, enabled ? '1' : '0');
}

export async function printThermal(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): Promise<ThermalPrintResult> {
  const usb = (navigator as Navigator & {
    usb?: { requestDevice: (opts: { filters: unknown[] }) => Promise<{
      open: () => Promise<void>;
      configuration: unknown;
      selectConfiguration: (n: number) => Promise<void>;
      claimInterface: (n: number) => Promise<void>;
      transferOut: (ep: number, data: ArrayBuffer) => Promise<{ status: string }>;
      close: () => Promise<void>;
    }> }
  }).usb;
  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح' };
  }

  try {
    const device = await usb.requestDevice({ filters: [] });
    if (!device) {
      return { ok: false, method: 'webusb', message: 'لم يتم اختيار طابعة' };
    }

    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    await device.claimInterface(0);

    const data = buildReceiptBytes(items, totals, client, docNumber);
    await device.transferOut(1, data);

    await device.close();
    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };
  } catch (err: any) {
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة الحرارية' };
  }
}

export { printThermal as printThermalViaWebUSB };

export function printThermalViaBlob(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): ThermalPrintResult {
  try {
    const data = buildReceiptBytes(items, totals, client, docNumber);
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href  = url;
    a.download = `receipt-${docNumber ?? 'temp'}.bin`;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, method: 'blob', message: 'تم تحميل ملف الطباعة' };
  } catch (err: any) {
    return { ok: false, method: 'blob', message: err?.message ?? 'فشل تصدير ملف الطباعة' };
  }
}

export function isWebUsbSupported(): boolean {
  return 'usb' in navigator;
}
