import type { CartItem, CartTotals, Party } from '@/types';

/* ─── ESC/POS command constants ─── */
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

/* ─── ESC/POS builder ─── */
class EscPosBuilder {
  private buf: number[] = [];

  init()           { this.buf.push(ESC, 0x40); return this; }
  lineFeed(n = 1)  { const lf = LF; this.buf.push(...new Array(n).fill(lf)); return this; }
  setBold(on: boolean)     { this.buf.push(ESC, 0x45, on ? 1 : 0); return this; }
  setAlign(n: 0 | 1 | 2)  { this.buf.push(ESC, 0x61, n); return this; }
  setFontSize(w: number, h: number) {
    this.buf.push(GS, 0x21, (Math.max(1, Math.min(8, h)) - 1) * 16 + (Math.max(1, Math.min(8, w)) - 1));
    return this;
  }
  resetFontSize()  { this.buf.push(GS, 0x21, 0); return this; }
  text(s: string)  { this.buf.push(...new TextEncoder().encode(s)); return this; }
  center(s: string)  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string)   { return this.setAlign(2).text(s).lineFeed(); }
  divider(c = '-', len = 42) { return this.center(c.repeat(len)); }
  cut()            { this.buf.push(GS, 0x56, 0); return this; }
  feedAndCut()     { return this.lineFeed(5).cut(); }

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

export async function printThermalViaWebUSB(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): Promise<ThermalPrintResult> {
  const usb = (navigator as Navigator & { usb?: { requestDevice: (opts: { filters: unknown[] }) => Promise<{ claimInterface: (n: number) => Promise<void>; transferOut: (ep: number, data: ArrayBuffer) => Promise<{ status: string }> }> } }).usb;
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
