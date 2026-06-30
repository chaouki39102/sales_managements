// ════════════════════════════════════════════════════════════════════════════
// pos/utils/printService.ts
//
// ✅ الإصلاحات عن النسخة السابقة:
//
//   1. Arabic encoding — Windows-1256 بدل UTF-8
//      معظم الطابعات الحرارية الرخيصة (Epson TM-T20، XP-58) لا تدعم UTF-8.
//      نستخدم codepage 1256 (ESC t 16) + جدول تحويل ASCII←→Win1256 للحروف العربية.
//
//   2. WebUSB flow صحيح:
//      - device.open() قبل selectConfiguration
//      - configuration check قبل selectConfiguration
//      - claimInterface برقم صحيح (0 أو من descriptor)
//      - transferOut على endpoint الأول bulk-out
//
//   3. QR Code (ESC/POS Native QR):
//      - يطبع QR يحتوي رقم الفاتورة
//      - يُستخدم GS ( k model 49 (QR Code Model 2)
//
//   4. buildReceiptBytes مُصلَح:
//      - خصم الفاتورة يظهر في الإيصال
//      - تنسيق أفضل للأرقام (اتجاه LTR)
// ════════════════════════════════════════════════════════════════════════════
import type { CartItem, CartTotals, Party } from '@/types';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData, DocumentLine } from '@/pages/settings/print-settings/types/data';
import { printFieldResolver } from '@/pages/settings/print-settings/services';

// ─── ESC/POS Constants ────────────────────────────────────────────────────────

const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

// ─── Windows-1256 Arabic encoder ─────────────────────────────────────────────
//
// الطابعات الحرارية الجزائرية الشائعة تستخدم codepage 1256 (Arabic Windows).
// ESC t 16 يُفعّل هذا الـ codepage على Epson-compatible printers.
// الجدول أدناه يحوّل unicode code points للحروف العربية إلى Win-1256 bytes.

const ARABIC_WIN1256: Record<number, number> = {
  // الحروف الأساسية
  0x0621: 0xC1, // ء
  0x0622: 0xC2, // آ
  0x0623: 0xC3, // أ
  0x0624: 0xC4, // ؤ
  0x0625: 0xC5, // إ
  0x0626: 0xC6, // ئ
  0x0627: 0xC7, // ا
  0x0628: 0xC8, // ب
  0x0629: 0xC9, // ة
  0x062A: 0xCA, // ت
  0x062B: 0xCB, // ث
  0x062C: 0xCC, // ج
  0x062D: 0xCD, // ح
  0x062E: 0xCE, // خ
  0x062F: 0xCF, // د
  0x0630: 0xD0, // ذ
  0x0631: 0xD1, // ر
  0x0632: 0xD2, // ز
  0x0633: 0xD3, // س
  0x0634: 0xD4, // ش
  0x0635: 0xD5, // ص
  0x0636: 0xD6, // ض
  0x0637: 0xD8, // ط
  0x0638: 0xD9, // ظ
  0x0639: 0xDA, // ع
  0x063A: 0xDB, // غ
  0x0641: 0xDD, // ف
  0x0642: 0xDE, // ق
  0x0643: 0xDF, // ك
  0x0644: 0xE1, // ل
  0x0645: 0xE3, // م
  0x0646: 0xE4, // ن
  0x0647: 0xE5, // ه
  0x0648: 0xE6, // و
  0x0649: 0xEC, // ى
  0x064A: 0xED, // ي
  0x064B: 0xF2, // ً
  0x064C: 0xF3, // ٌ
  0x064D: 0xF4, // ٍ
  0x064E: 0xF5, // َ
  0x064F: 0xF6, // ُ
  0x0650: 0xF7, // ِ
  0x0651: 0xF8, // ّ
  0x0652: 0xF9, // ْ
  // أرقام عربية
  0x0660: 0xB0, // ٠
  0x0661: 0xB1, // ١
  0x0662: 0xB2, // ٢
  0x0663: 0xB3, // ٣
  0x0664: 0xB4, // ٤
  0x0665: 0xB5, // ٥
  0x0666: 0xB6, // ٦
  0x0667: 0xB7, // ٧
  0x0668: 0xB8, // ٨
  0x0669: 0xB9, // ٩
  // علامات ترقيم عربية
  0x060C: 0xAC, // ،
  0x061B: 0xBB, // ؛
  0x061F: 0xBF, // ؟
  // لام ألف
  0xFEFB: 0xE2, // لا
  0xFEFC: 0xE2, // لا (شكل)
};

/**
 * يحوّل نص Unicode إلى bytes بترميز Windows-1256.
 * الأحرف غير المعروفة تُستبدَل بـ '?' (0x3F).
 */
function encodeArabic(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0x3F;
    if (cp < 0x80) {
      bytes.push(cp);                               // ASCII — مباشرة
    } else if (ARABIC_WIN1256[cp] !== undefined) {
      bytes.push(ARABIC_WIN1256[cp]);               // عربي — Win-1256
    } else {
      bytes.push(0x3F);                             // غير معروف → '?'
    }
  }
  return bytes;
}

// ─── ESC/POS Builder ─────────────────────────────────────────────────────────

class EscPosBuilder {
  private buf: number[] = [];

  /** تهيئة الطابعة + تفعيل codepage Windows-1256 */
  init(): this {
    this.buf.push(ESC, 0x40);           // ESC @ — initialize
    this.buf.push(ESC, 0x74, 0x10);     // ESC t 16 — select codepage Windows-1256 (Arabic)
    return this;
  }

  lineFeed(n = 1): this {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  setBold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  setAlign(n: 0 | 1 | 2): this {
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  setFontSize(w: number, h: number): this {
    const ww = Math.max(1, Math.min(8, w));
    const hh = Math.max(1, Math.min(8, h));
    this.buf.push(GS, 0x21, (hh - 1) * 16 + (ww - 1));
    return this;
  }

  resetFontSize(): this {
    this.buf.push(GS, 0x21, 0);
    return this;
  }

  /** نص مُشفَّر بـ Windows-1256 */
  text(s: string): this {
    this.buf.push(...encodeArabic(s));
    return this;
  }

  /** نص ASCII فقط (أرقام، رموز) — بدون تحويل */
  ascii(s: string): this {
    for (const c of s) this.buf.push(c.charCodeAt(0) & 0xFF);
    return this;
  }

  center(s: string): this  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string): this   { return this.setAlign(2).text(s).lineFeed(); }
  left(s: string): this    { return this.setAlign(0).text(s).lineFeed(); }

  divider(c = '-', len = 42): this {
    return this.setAlign(1).ascii(c.repeat(len)).lineFeed();
  }

  cut(): this { this.buf.push(GS, 0x56, 0x00); return this; }
  feedAndCut(): this { return this.lineFeed(4).cut(); }

  /**
   * QR Code — ESC/POS Native (GS ( k)
   * يطبع QR يحتوي النص المعطى (رقم الفاتورة / رابط URL)
   */
  qrCode(data: string, size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4): this {
    const bytes = [...new TextEncoder().encode(data)];  // QR data — UTF-8 مقبول هنا
    const len   = bytes.length + 3;
    const pL    = len & 0xFF;
    const pH    = (len >> 8) & 0xFF;

    this.setAlign(1);

    // 1. Select model (Model 2)
    this.buf.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // 2. Set size
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);

    // 3. Set error correction (M = 0x32)
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x32);

    // 4. Store data
    this.buf.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...bytes);

    // 5. Print
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

    this.lineFeed(2);
    return this;
  }

  escposBytes(): Uint8Array { return new Uint8Array(this.buf); }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/** تنسيق رقم — LTR دائماً (أرقام لاتينية مناسبة للطابعة) */
function fmt(n: number): string {
  return n.toLocaleString('fr-DZ', {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  });
}

/** سطر منسَّق: تسمية يمين + قيمة يسار بعرض ثابت 42 حرف */
function lineRow(label: string, value: string, width = 42): string {
  const totalLen = width;
  // نستخدم ASCII spaces لأن الطابعة لا تفهم unicode spaces جيداً
  const gap = Math.max(1, totalLen - label.length - value.length);
  return label + ' '.repeat(gap) + value;
}

// ─── Receipt Builder ──────────────────────────────────────────────────────────

export interface ReceiptOptions {
  companyName?:    string;
  companyAddress?: string;
  companyPhone?:   string;
  companyNIF?:     string;
  footerText?:     string;
  printQR?:        boolean;
  qrBaseUrl?:      string;    // مثال: https://erp.mycompany.dz/invoices/
}

function buildReceiptBytes(
  items:     CartItem[],
  totals:    CartTotals,
  client:    Party | null,
  docNumber?: string,
  opts:      ReceiptOptions = {},
): Uint8Array {
  const b   = new EscPosBuilder().init();
  const now = new Date();
  const {
    companyName    = 'نظام المبيعات',
    companyAddress = 'الجزائر',
    companyPhone,
    companyNIF,
    footerText     = 'شكراً على تعاملكم معنا',
    printQR        = true,
    qrBaseUrl      = '',
  } = opts;

  // ── رأس الإيصال ──────────────────────────────────────────────────────────
  b.setFontSize(2, 2).setBold(true).center(companyName).setBold(false).resetFontSize();
  b.center(companyAddress);
  if (companyPhone) b.center(companyPhone);
  if (companyNIF)   b.center(`NIF: ${companyNIF}`);
  b.divider('=', 42);

  // معلومات الفاتورة
  b.setAlign(0);
  if (docNumber) {
    b.setBold(true)
     .text('رقم الفاتورة: ')
     .ascii(docNumber)
     .lineFeed()
     .setBold(false);
  }
  b.text('التاريخ: ').ascii(now.toLocaleDateString('fr-DZ')).lineFeed();
  b.text('الوقت:   ').ascii(now.toLocaleTimeString('fr-DZ')).lineFeed();
  if (client) {
    b.text('الزبون:  ').text(client.name).lineFeed();
    if (client.phone) b.text('الهاتف:  ').ascii(client.phone).lineFeed();
  }
  b.divider('-', 42);

  // ── الأصناف ──────────────────────────────────────────────────────────────
  b.setBold(true).left('المنتج').setBold(false);

  for (const item of items) {
    const total = item.total_ttc;

    // اسم المنتج
    b.text(item.product_name ?? '');
    b.lineFeed();

    // التفاصيل: qty × price HT [خصم] = total TTC
    const detail =
      `  ${fmt(item.quantity)} x ${fmt(item.unit_price_ht)}` +
      (item.discount_percentage > 0 ? ` (-${item.discount_percentage.toFixed(0)}%)` : '');
    const totalStr = `${fmt(total)} دج`;

    b.setAlign(0).ascii(detail);
    b.setAlign(2).ascii(totalStr).lineFeed();
  }

  b.divider('-', 42);

  // ── المجاميع ──────────────────────────────────────────────────────────────
  b.setAlign(0);
  b.ascii(lineRow('المجموع HT:', `${fmt(totals.total_ht)} دج`)).lineFeed();

  if (totals.total_discount > 0) {
    b.ascii(lineRow('الخصم:', `-${fmt(totals.total_discount)} دج`)).lineFeed();
  }

  if (totals.invoice_discount_amount && totals.invoice_discount_amount > 0) {
    b.ascii(lineRow('خصم الفاتورة:', `-${fmt(totals.invoice_discount_amount)} دج`)).lineFeed();
  }

  b.ascii(lineRow('TVA:', `${fmt(totals.total_tva)} دج`)).lineFeed();

  if (totals.fiscal_stamp > 0) {
    b.ascii(lineRow('الطابع المالي:', `${fmt(totals.fiscal_stamp)} دج`)).lineFeed();
  }

  b.divider('=', 32);

  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;
  b.setFontSize(2, 2)
   .setBold(true)
   .setAlign(2)
   .ascii(`${fmt(totalTtcFinal)} دج`)
   .lineFeed()
   .setBold(false)
   .resetFontSize();

  b.text('الإجمالي شامل الضريبة').lineFeed();
  b.divider('=', 42);

  // ── QR Code ───────────────────────────────────────────────────────────────
  if (printQR && docNumber) {
    const qrData = qrBaseUrl
      ? `${qrBaseUrl}${docNumber}`
      : docNumber;
    b.lineFeed();
    b.qrCode(qrData, 4);
    b.center(docNumber);   // رقم الفاتورة تحت الـ QR
  }

  // ── ذيل الإيصال ──────────────────────────────────────────────────────────
  b.divider('-', 42);
  b.center(footerText);
  b.center(`نظام ERP الجزائر — ${now.getFullYear()}`);

  b.feedAndCut();
  return b.escposBytes();
}

// ─── WebUSB Print ─────────────────────────────────────────────────────────────

export interface ThermalPrintResult {
  ok:      boolean;
  method:  'webusb' | 'blob' | 'none';
  message: string;
}

/**
 * يُرسل بيانات ESC/POS إلى جهاز USB مُعطى (مفتوح وملفوف بالفعل)
 */
async function sendToDevice(
  device:    any,
  items:     CartItem[],
  totals:    CartTotals,
  client:    Party | null,
  docNumber?: string,
  opts?:     ReceiptOptions,
): Promise<ThermalPrintResult> {
  try {
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    const config = device.configuration;
    if (!config?.interfaces?.length) {
      return { ok: false, method: 'webusb', message: 'لا توجد واجهات (interfaces) على الجهاز' };
    }

    let ifaceNum = -1;
    let epNum = -1;

    for (let i = 0; i < config.interfaces.length; i++) {
      const iface = config.interfaces[i];
      const alt = iface.alternates?.[0];
      if (!alt) continue;
      if (alt.interfaceClass === 0x02) continue;
      const ep = alt.endpoints?.find(
        (e: any) => e.direction === 'out' && (e.type === 'bulk' || e.type === 'interrupt'),
      );
      if (ep) {
        ifaceNum = iface.interfaceNumber;
        epNum = ep.endpointNumber;
        break;
      }
    }

    if (ifaceNum === -1) {
      const firstIface = config.interfaces[0];
      ifaceNum = firstIface.interfaceNumber;
      const alt = firstIface.alternates?.[0];
      const ep = alt?.endpoints?.find((e: any) => e.direction === 'out');
      epNum = ep?.endpointNumber ?? 2;
    }

    await device.claimInterface(ifaceNum);
    const data = buildReceiptBytes(items, totals, client, docNumber, opts);
    const result = await device.transferOut(epNum, data);

    if (result.status !== 'ok') {
      await device.releaseInterface(ifaceNum);
      return { ok: false, method: 'webusb', message: `فشل الإرسال: ${result.status}` };
    }

    await device.releaseInterface(ifaceNum);
    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };
  } catch (err: any) {
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة' };
  }
}

/**
 * يطبع عبر WebUSB — يحاول أولاً استخدام الطابعات المقترنة سابقاً (بدون حوار)،
 * وإذا لم يجد يعرض حوار اختيار الطابعة.
 */
export async function printThermalViaWebUSB(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb;
  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح — استخدم Chrome أو Edge' };
  }

  // 1. حاول استخدام طابعة مقترنة سابقاً (بدون حوار)
  try {
    const paired = await usb.getDevices();
    if (paired.length > 0) {
      const dev = paired[0];
      await dev.open();
      const r = await sendToDevice(dev, items, totals, client, docNumber, opts);
      if (r.ok) {
        try { await dev.close(); } catch {}
        return r;
      }
      try { await dev.close(); } catch {}
    }
  } catch { /* fall through — اعرض حوار الاختيار */ }

  // 2. لم يعثر على طابعة — اعرض حوار اختيار الجهاز
  let device: any = null;
  try {
    device = await usb.requestDevice({ filters: [] });
    if (!device) {
      return { ok: false, method: 'webusb', message: 'لم يتم اختيار طابعة' };
    }

    await device.open();
    const r = await sendToDevice(device, items, totals, client, docNumber, opts);
    try { await device.close(); } catch {}
    return r;

  } catch (err: any) {
    try { if (device) await device.close(); } catch {}
    if (err?.name === 'NotFoundError') {
      return { ok: false, method: 'webusb', message: 'تم إلغاء اختيار الطابعة' };
    }
    if (err?.name === 'SecurityError') {
      return { ok: false, method: 'webusb', message: 'لا يسمح المتصفح بالوصول للطابعة — تأكد من HTTPS' };
    }
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة الحرارية' };
  }
}

// ─── Blob Download (fallback) ─────────────────────────────────────────────────

export function printThermalViaBlob(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): ThermalPrintResult {
  try {
    const data = buildReceiptBytes(items, totals, client, docNumber, opts);
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `receipt-${docNumber ?? Date.now()}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, method: 'blob', message: 'تم تحميل ملف الإيصال — أرسله للطابعة' };
  } catch (err: any) {
    return { ok: false, method: 'blob', message: err?.message ?? 'فشل تصدير ملف الإيصال' };
  }
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

/**
 * طباعة تلقائية — يستخدم أول طابعة متصلة بدون dialog
 * إذا لم توجد → يعود لـ Blob download
 */
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
 * High-level print entry point — tries WebUSB first, falls back to blob.
 */
export async function printThermal(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): Promise<ThermalPrintResult> {
  return autoPrint(items, totals, client, docNumber, opts);
}

/**
 * Build ESC/POS bytes from the universal data contract + template.
 * Respects template visibility flags so thermal output matches the
 * visual preview rendered by UniversalPreview.
 */
export function buildReceiptBytesFromTemplate(
  template:  PrintTemplate,
  data:      UniversalDocumentData,
  docNumber?: string,
): Uint8Array {
  const co = data.company ?? {} as any;

  // Convert DocumentLine[] → CartItem[] for the ESC/POS builder
  const items: CartItem[] = (data.lines ?? []).map((line, idx) => ({
    product_name:        line.name,
    ref:                 line.ref  ?? '',
    quantity:            line.quantity,
    unit_price_ht:       line.unitPriceHt,
    unit_symbol:         line.unit  ?? null,
    tva_rate:            line.tvaPct,
    discount_percentage: line.discountPct,
    total_ht:            line.totalHt,
    id:                  String(idx),
    product_id:          0,
    variant_id:          0,
    unit_price_ttc:      0,
    total_ttc:           0,
    tva_id:              null,
    discount_amount:     0,
    max_stock:           null,
    manages_stock:       false,
    selling_price_ttc:   line.unitPriceTtc,
  }));

  const totals: CartTotals = {
    total_ht:       data.totals?.totalHt       ?? 0,
    total_tva:      data.totals?.totalTva      ?? 0,
    total_ttc:      data.totals?.totalTtc      ?? 0,
    total_discount: data.totals?.totalDiscount ?? 0,
    fiscal_stamp:   data.totals?.fiscalStamp   ?? 0,
    items_count:    items.length,
    lines_count:    items.length,
  };

  const client: Party | null = data.party
    ? { ...data.party, name: data.party.name, address: data.party.address ?? null } as any
    : null;

  // Use canonical field resolver for template-aware company overrides
  const opts: ReceiptOptions = {
    companyName:    String(printFieldResolver.resolve('company.name', data, template) ?? co.name ?? ''),
    companyAddress: String(printFieldResolver.resolve('company.address', data, template) ?? co.address ?? ''),
    companyPhone:   String(printFieldResolver.resolve('company.phone', data, template) ?? co.phone ?? ''),
    companyNIF:     String(printFieldResolver.resolve('company.nif', data, template) ?? co.nif ?? ''),
    footerText:     template.show_thank_you ? template.thank_you_text : '',
    printQR:        !!template.show_qr,
  };

  return buildReceiptBytes(items, totals, client, docNumber, opts);
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
  const bytes = buildReceiptBytesFromTemplate(template, data, docNumber);
  return sendBytesToReceiptPrinter(bytes);
}

async function sendBytesToReceiptPrinter(bytes: Uint8Array): Promise<ThermalPrintResult> {
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

export async function autoPrint(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb;
  if (!usb) return printThermalViaBlob(items, totals, client, docNumber, opts);

  try {
    const devices: any[] = await usb.getDevices();
    if (!devices.length) {
      return printThermalViaBlob(items, totals, client, docNumber, opts);
    }

    const device = devices[0];
    await device.open();
    const r = await sendToDevice(device, items, totals, client, docNumber, opts);
    try { await device.close(); } catch {}
    if (r.ok) return r;

    // فشلت الطباعة عبر webusb — fallback إلى blob
    return printThermalViaBlob(items, totals, client, docNumber, opts);

  } catch {
    return printThermalViaBlob(items, totals, client, docNumber, opts);
  }
}
