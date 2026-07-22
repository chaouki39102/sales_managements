// ════════════════════════════════════════════════════════════════════════════
// pos/utils/printService.ts
//
// Canonical ESC/POS thermal print pipeline.
// All section builders consume UniversalDocumentData directly — no bridge
// types, no CartItem/CartTotals/Party dependencies.
// ════════════════════════════════════════════════════════════════════════════

import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import { printFieldResolver } from '@/pages/settings/print-settings/services/PrintFieldResolver';

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

/** Map company_name_size (8-30 pts) to ESC/POS font multiplier */
function mapFontSizeToEscPos(points: number): [number, number] {
  if (points <= 10) return [1, 1];
  if (points <= 15) return [2, 2];
  if (points <= 22) return [3, 3];
  return [4, 4];
}

/** Map company_info_size (6-16 pts) to ESC/POS font multiplier (info text stays small) */
function mapInfoFontSizeToEscPos(points: number): [number, number] {
  if (points <= 10) return [1, 1];
  if (points <= 13) return [2, 1];
  return [2, 2];
}

/** Map RTL-aware align string ('left'|'center'|'right') to ESC/POS n (0|1|2) */
function mapAlignToEscPos(align: string | undefined | null): 0 | 1 | 2 {
  if (align === 'left')   return 0;
  if (align === 'center') return 1;
  if (align === 'right')  return 2;
  return 1; // default center
}

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



// ── Section sub-functions (Stage 1: Section Visibility Gates) ────────────────

function buildThermalHeader(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_header_section) return;

  const co = data.company ?? {};
  const resolve = (fieldId: string, fallback: string) =>
    String(printFieldResolver.resolve(fieldId, data, template) ?? fallback);

  const companyName    = resolve('company.name', co.name ?? 'نظام المبيعات');
  const companyAddress = resolve('company.address', co.address ?? '');
  const companyPhone   = resolve('company.phone', co.phone ?? '');
  const companyNIF     = resolve('company.nif', co.nif ?? '');
  const companyRC      = resolve('company.rc', co.rc ?? '');
  const companyNIS     = resolve('company.nis', co.nis ?? '');
  const companyArticle = resolve('company.article', co.article ?? '');

  // ── Company name (gated, with size/bold/align) ──────────────────────────
  if (template.show_company_name !== false) {
    const nameAlign = mapAlignToEscPos(template.company_name_align);
    const nameBold  = template.company_name_bold !== false;
    const [nw, nh]  = mapFontSizeToEscPos(template.company_name_size ?? 15);
    b.setFontSize(nw, nh);
    if (nameBold) b.setBold(true);
    b.setAlign(nameAlign).text(companyName).lineFeed();
    if (nameBold) b.setBold(false);
    b.resetFontSize();
  }

  // ── Company info fields (each gated, with shared align/size) ────────────
  const infoAlign = mapAlignToEscPos(template.company_info_align);
  const [iw, ih]  = mapInfoFontSizeToEscPos(template.company_info_size ?? 9);

  const infoField = (show: boolean | undefined, val: string, prefix = '') => {
    if (show !== false && val) {
      b.setFontSize(iw, ih).setAlign(infoAlign).text(prefix + val).lineFeed().resetFontSize();
    }
  };

  infoField(template.show_address,  companyAddress);
  infoField(template.show_phone,    companyPhone);
  infoField(template.show_tax_id,   companyNIF,   'NIF: ');
  infoField(template.show_rc,       companyRC,    'RC: ');
  infoField(template.show_nis,      companyNIS,   'NIS: ');
  infoField(template.show_article,  companyArticle, 'Article: ');

  b.divider('=', 42);
}

function buildThermalDocInfo(
  b:          EscPosBuilder,
  docNumber:  string | undefined,
  data:       UniversalDocumentData,
  template:   PrintTemplate,
): void {
  if (!template.show_doc_info_section) return;
  const now = new Date();
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
  if (data.party) {
    b.text('الزبون:  ').text(data.party.name).lineFeed();
    if (data.party.phone) b.text('الهاتف:  ').ascii(data.party.phone).lineFeed();
  }
  b.divider('-', 42);
}

function buildThermalItems(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_items_section) return;
  const lines = data.lines ?? [];
  b.setBold(true).left('المنتج').setBold(false);
  for (const line of lines) {
    const total = line.totalTtc;
    b.text(line.name ?? '');
    b.lineFeed();
    const detail =
      `  ${fmt(line.quantity)} x ${fmt(line.unitPriceHt)}` +
      (line.discountPct > 0 ? ` (-${line.discountPct.toFixed(0)}%)` : '');
    const totalStr = `${fmt(total)} دج`;
    b.setAlign(0).ascii(detail);
    b.setAlign(2).ascii(totalStr).lineFeed();
  }
  b.divider('-', 42);
}

function buildThermalTotals(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_totals_section) return;
  const t = data.totals;
  if (!t) return;
  b.setAlign(0);
  b.ascii(lineRow('المجموع HT:', `${fmt(t.totalHt)} دج`)).lineFeed();
  if (t.totalDiscount > 0) {
    b.ascii(lineRow('الخصم:', `-${fmt(t.totalDiscount)} دج`)).lineFeed();
  }
  b.ascii(lineRow('TVA:', `${fmt(t.totalTva)} دج`)).lineFeed();
  if (t.fiscalStamp > 0) {
    b.ascii(lineRow('الطابع المالي:', `${fmt(t.fiscalStamp)} دج`)).lineFeed();
  }
  b.divider('=', 32);
  const totalTtcFinal = t.totalTtc + t.fiscalStamp;
  b.setFontSize(2, 2)
   .setBold(true)
   .setAlign(2)
   .ascii(`${fmt(totalTtcFinal)} دج`)
   .lineFeed()
   .setBold(false)
   .resetFontSize();
  b.text('الإجمالي شامل الضريبة').lineFeed();
  b.divider('=', 42);

  if (template.show_paid_amount) {
    b.ascii(lineRow('المدفوع:', `${fmt(t.paid)} دج`)).lineFeed();
  }

  if (template.show_change && t.change > 0) {
    b.ascii(lineRow('الباقي:', `${fmt(t.change)} دج`)).lineFeed();
  }

  if (template.show_remaining && t.remaining > 0) {
    b.setBold(true);
    b.ascii(lineRow('المتبقي:', `${fmt(t.remaining)} دج`)).lineFeed();
    b.setBold(false);
  }
}

function buildThermalBalance(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!data.balance) return;
  if (!template.show_prev_balance && !template.show_new_balance) return;
  b.divider('-', 42);
  if (template.show_prev_balance) {
    b.ascii(lineRow('الرصيد السابق:', `${fmt(data.balance.previous)} دج`)).lineFeed();
  }
  if (template.show_new_balance) {
    b.setBold(true)
     .ascii(lineRow('الرصيد الجديد:', `${fmt(data.balance.current)} دج`))
     .lineFeed()
     .setBold(false);
  }
}

function buildThermalFooter(
  b:        EscPosBuilder,
  _data:    UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_footer_section) return;
  const now = new Date();
  const footerText = template.show_thank_you ? template.thank_you_text : '';
  b.divider('-', 42);
  b.center(footerText);
  b.center(`نظام ERP الجزائر — ${now.getFullYear()}`);
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
  const b = new EscPosBuilder().init();

  buildThermalHeader(b, data, template);
  buildThermalDocInfo(b, docNumber, data, template);
  buildThermalItems(b, data, template);
  buildThermalTotals(b, data, template);
  buildThermalBalance(b, data, template);

  if (template.show_qr && docNumber) {
    b.lineFeed();
    b.qrCode(docNumber, 4);
    b.center(docNumber);
  }

  buildThermalFooter(b, data, template);

  b.feedAndCut();
  return b.escposBytes();
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
