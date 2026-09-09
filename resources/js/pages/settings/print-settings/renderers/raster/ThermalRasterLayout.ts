// ════════════════════════════════════════════════════════════════════════════
// renderers/raster/ThermalRasterLayout.ts
//
// Pure receipt-layout builder for the RASTER thermal printer path.
//
// The text path (ESCPOSRenderer, CP1256) cannot shape Arabic correctly on many
// printers, so the raster path paints the whole receipt to a monochrome bitmap
// with the browser text shaper (correct shaping/bidi) and prints it as image
// bytes. THIS module builds the visual "plan" (ordered lines: text, rows,
// dividers) that the painter rasterizes. It is 100% DOM-free and therefore
// unit-testable in vitest. Every pushed value is passed through
// `cleanRasterText` so mojibake (double-encoded CP1256/GDK) never reaches the
// bitmap.
// ════════════════════════════════════════════════════════════════════════════

import { fmt } from '../EscPosBuilder';
import { COLUMN_DEFAULTS } from '../../services/SettingsRegistry';
import { printFieldResolver } from '../../services/PrintFieldResolver';
import type { PrintTemplate, ColumnKey } from '../../types';
import type { CompanyInfo, DocumentTotals, UniversalDocumentData } from '../../types/data';

// ─── Plan types ───────────────────────────────────────────────────────────────

export type RasterAlign = 'left' | 'center' | 'right';

export interface RasterCell {
  text: string;
  align?: RasterAlign;
  /** Flex weight for proportionally-sized cells inside a table row. */
  flex?: number;
  bold?: boolean;
}

export type RasterPlanLine =
  | { kind: 'text'; text: string; align?: RasterAlign; bold?: boolean; size?: number }
  | { kind: 'divider'; char: string }
  | { kind: 'space'; height?: number }
  | { kind: 'table'; cols: RasterCell[]; size?: number };

export interface ThermalRasterPlan {
  lines: RasterPlanLine[];
  widthDots: number;
}

// ─── Arabic helpers ───────────────────────────────────────────────────────────

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function hasArabicText(text: string): boolean {
  return ARABIC_RE.test(String(text ?? ''));
}

/** Decode the double-encoded mojibake strings that historical CP1256/GDK
 *  exports stored (e.g. «ظ†ط¸ط§ظ… ط§ظ„ظ…ط¨ظٹط¹ط§طھ» = «نظام المبيعات»). */
const MOJIBAKE_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['ظ†ط¸ط§ظ… ط§ظ„ظ…ط¨ظٹط¹ط§طھ', 'نظام المبيعات'],
  ['ظ†ط¸ط§ظ… ERP ط§ظ„ط¬ط²ط§ط¦ط± â€”', 'نظام ERP الجزائر —'],
  ['ظپط§طھظˆط±ط©', 'فاتورة'],
  ['ط®طھظ…', 'ختم'],
  ['ط¯ط¬', 'دج'],
  ['â€”', '—'],
];

export function cleanRasterText(text: unknown): string {
  let out = String(text ?? '');
  for (const [bad, good] of MOJIBAKE_REPLACEMENTS) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Template label helper — a non-empty stored value wins, else the Arabic fallback.
 *  Mirrors ESCPOSRenderer.lbl: `key` is a template TEXT key looked up on the raw
 *  config object (label_* entries are runtime template strings, not TS fields). */
export function lbl(template: unknown, key: string, fallback: string): string {
  const v = (template as Record<string, unknown> | null | undefined)?.[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

export function toRasterAlign(value: unknown, fallback: RasterAlign): RasterAlign {
  return value === 'center' || value === 'right' || value === 'left' ? value : fallback;
}

export function planHasArabic(plan: ThermalRasterPlan): boolean {
  return plan.lines.some((line) => {
    if (line.kind === 'text') return hasArabicText(line.text);
    if (line.kind === 'table') return line.cols.some((c) => hasArabicText(c.text));
    return false;
  });
}

// ─── PlanWriter ───────────────────────────────────────────────────────────────

export class PlanWriter {
  readonly lines: RasterPlanLine[] = [];

  divider(char = '-'): this {
    this.lines.push({ kind: 'divider', char: cleanRasterText(char) });
    return this;
  }

  space(height = 1): this {
    this.lines.push({ kind: 'space', height: Math.max(1, height) });
    return this;
  }

  text(text: unknown, opts: { align?: RasterAlign; bold?: boolean; size?: number } = {}): this {
    const clean = cleanRasterText(text);
    if (!clean) return this;
    this.lines.push({ kind: 'text', text: clean, align: opts.align, bold: opts.bold, size: opts.size });
    return this;
  }

  row(label: string, value: unknown, opts: { bold?: boolean; size?: number } = {}): this {
    const clean = cleanRasterText(value);
    if (!clean) return this;
    this.lines.push({
      kind: 'table',
      cols: [
        { text: cleanRasterText(label), align: 'left', flex: 3 },
        { text: clean, align: 'right', flex: 2, bold: opts.bold },
      ],
      size: opts.size,
    });
    return this;
  }

  table(cols: RasterCell[], opts: { size?: number } = {}): this {
    const clean = cols.map((c) => ({ ...c, text: cleanRasterText(c.text) }));
    if (clean.every((c) => !c.text)) return this;
    this.lines.push({ kind: 'table', cols: clean, size: opts.size });
    return this;
  }
}

// ─── Section builders ─────────────────────────────────────────────────────────

type Tpl = PrintTemplate | null;

function resolveField(template: Tpl, data: UniversalDocumentData, id: string, fallback: string): string {
  const v = printFieldResolver.resolve(id, data, template);
  if (v === undefined || v === null || v === '') return fallback;
  return String(v);
}

function on(template: Tpl, key: keyof PrintTemplate, defaults = true): boolean {
  return (template?.[key] ?? defaults) === true || (template?.[key] ?? defaults) === undefined ? !!defaults : Boolean(template?.[key]);
}

function buildRasterHeader(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  if (template?.show_header_section === false) return;
  const co = (data.company ?? {}) as CompanyInfo;
  const name = resolveField(template, data, 'company.name', co.name ?? 'نظام المبيعات');
  w.text(name, {
    align: toRasterAlign(template?.company_name_align, 'center'),
    bold: (template?.company_name_bold ?? true) !== false,
    size: template?.company_name_size ?? 15,
  });

  const rawInfoSize = template?.company_info_size;
  const infoSize = Number(rawInfoSize) > 0 ? Number(rawInfoSize) : 9;
  const infoAlign = toRasterAlign(template?.company_info_align, 'center');
  const infoField = (show: boolean | undefined, value: string, prefix = ''): void => {
    if (show !== false && value) w.text(prefix + value, { align: infoAlign, size: infoSize });
  };
  infoField(template?.show_address, resolveField(template, data, 'company.address', ''));
  infoField(template?.show_phone, resolveField(template, data, 'company.phone', ''));
  infoField(template?.show_mobile, resolveField(template, data, 'company.mobile', ''));
  infoField(template?.show_email, resolveField(template, data, 'company.email', ''));
  infoField(template?.show_tax_id, resolveField(template, data, 'company.nif', ''), 'NIF: ');
  infoField(template?.show_rc, resolveField(template, data, 'company.rc', ''), 'RC: ');
  infoField(template?.show_nis, resolveField(template, data, 'company.nis', ''), 'NIS: ');
  infoField(template?.show_article, resolveField(template, data, 'company.article', ''), 'Article: ');
}

function buildRasterTitle(_data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const title = lbl(template, 'title_text', 'فاتورة');
  w.text(title, {
    align: toRasterAlign(template?.title_align, 'center'),
    bold: (template?.title_bold ?? true) !== false,
    size: template?.title_size ?? 13,
  });
}

function buildRasterDocInfo(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const d = data.doc ?? {};
  const now = new Date();
  const infoSize = 9;
  const info = (label: string, value: unknown): void => {
    const clean = cleanRasterText(value);
    if (clean) w.row(label, clean, { size: infoSize });
  };

  if (on(template, 'show_doc_number')) info('رقم الفاتورة: ', d.number ?? '');
  if (on(template, 'show_date')) info('التاريخ: ', String(d.date ?? '').slice(0, 10));
  if (template?.show_time) info('الوقت: ', d.time || now.toLocaleTimeString('fr-DZ'));
  if (template?.show_due_date && d.dueDate) info('تاريخ الاستحقاق: ', String(d.dueDate).slice(0, 10));

  if (on(template, 'show_client') && data.party) {
    info('الزبون: ', data.party.name ?? '');
    if (data.party.phone) info('الهاتف: ', data.party.phone);
    if (data.party.nif) info('NIF: ', data.party.nif);
    if (data.party.address) info('العنوان: ', data.party.address);
  }

  const extras = data as UniversalDocumentData & Record<string, unknown>;
  if (template?.show_cashier && extras.cashier) info('الكاشير: ', String(extras.cashier));
  if (template?.show_session) {
    const sessionLabel = String(extras.sessionLabel ?? data.session?.code ?? '');
    if (sessionLabel) info('الجلسة: ', sessionLabel);
  }
  if (template?.show_payment_term && extras.paymentTerm) info('شروط الدفع: ', String(extras.paymentTerm));
}

const DEFAULT_COL_ORDER: ColumnKey[] = ['rowNumber', 'name', 'quantity', 'price', 'total'];

function getVisibleCols(template: Tpl): ColumnKey[] {
  const order = Array.isArray(template?.col_order) && template.col_order.length > 0 ? (template.col_order as ColumnKey[]) : DEFAULT_COL_ORDER;
  return order.filter((c) => template?.col_show?.[c] !== false);
}

function buildRasterItems(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const cols = getVisibleCols(template);
  const onlyName = cols.length === 0 || (cols.length === 1 && cols[0] === 'name');
  const rawItemSize = template?.items_font_size;
  const nameSize = Number(rawItemSize) > 0 ? Number(rawItemSize) : 10;

  if (!onlyName) {
    const headers = cols.map((c) => template?.col_headers?.[c] ?? COLUMN_DEFAULTS[c]?.header ?? String(c));
    w.text(headers.join('  '), { bold: true, size: 9 });
  }

  for (const line of data.lines ?? []) {
    if (onlyName) {
      let detail = `${line.name}   ${fmt(line.quantity ?? 0)} x ${fmt(line.unitPriceHt ?? 0)}`;
      if (line.discountPct && line.discountPct > 0) detail += ` (-${fmt(line.discountPct)}%)`;
      w.table([
        { text: detail, align: 'left', flex: 3 },
        { text: `${fmt(line.totalTtc ?? 0)} دج`, align: 'right', flex: 2 },
      ], { size: nameSize });
      continue;
    }

    if (cols.includes('name')) w.text(line.name, { size: nameSize });

    const cells: RasterCell[] = [];
    const push = (_col: ColumnKey, text: string, align: RasterAlign, flex: number): void => {
      if (text) cells.push({ text, align, flex });
    };
    for (const col of cols) {
      if (col === 'rowNumber') push(col, String(line.rowNumber ?? ''), 'center', 1);
      else if (col === 'unit') push(col, line.unit ?? '', 'center', 1);
      else if (col === 'quantity') push(col, `${fmt(line.quantity ?? 0)}${line.unit ? ' ' + line.unit : ''}`, 'center', 1);
      else if (col === 'price') push(col, fmt(line.unitPriceHt ?? 0), 'right', 2);
      else if (col === 'discount') {
        if (line.discountPct && line.discountPct > 0) push(col, `${line.discountPct.toFixed(1)}%`, 'center', 1);
      } else if (col === 'tva') {
        if (line.tvaRate !== undefined && line.tvaRate !== null) push(col, `${Math.round(line.tvaRate * 100)}%`, 'center', 1);
      } else if (col === 'total') push(col, fmt(line.totalTtc ?? 0), 'right', 2);
    }
    if (cells.length > 0) w.table(cells, { size: nameSize });
  }
}

function buildRasterTotals(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const t = (data.totals ?? {}) as DocumentTotals;
  const size = 10;
  const totalVal = (t.totalTtc ?? 0) + (t.fiscalStamp ?? 0);

  if (on(template, 'show_total_ht')) w.row('المجموع HT:', fmt(t.totalHt ?? 0), { size });
  if (on(template, 'show_discount_total') && (t.totalDiscount ?? 0) > 0) w.row('الخصم:', `-${fmt(t.totalDiscount ?? 0)}`, { size });
  if (on(template, 'show_total_tva')) {
    if ((data.taxBreakdown ?? []).length > 0) {
      for (const br of data.taxBreakdown) w.row(`  TVA ${br.rate}%:`, fmt(br.tva ?? 0), { size });
    } else if ((t.totalTva ?? 0) > 0) {
      w.row('TVA:', fmt(t.totalTva ?? 0), { size });
    }
  }
  if (on(template, 'show_fiscal_stamp') && (t.fiscalStamp ?? 0) > 0) {
    w.row('الطابع المالي:', fmt(t.fiscalStamp ?? 0), { size });
  }

  w.divider('=');
  w.text('الإجمالي شامل الضريبة', { align: 'center', size });
  w.text(`${fmt(totalVal)} دج`, { align: 'right', bold: true, size });

  if (on(template, 'show_paid_amount') && (t.paid ?? 0) > 0) w.row('المدفوع:', fmt(t.paid ?? 0), { size });
  if (on(template, 'show_change') && (t.change ?? 0) > 0) w.row('الباقي:', fmt(t.change ?? 0), { size });
  if (on(template, 'show_remaining') && (t.remaining ?? 0) > 0) w.row('المتبقي:', fmt(t.remaining ?? 0), { bold: true, size });
}

function buildRasterPayments(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  if (template?.show_payments_section === false) return;
  const payments = data.payments ?? [];
  if (payments.length === 0) return;
  const size = 9;

  if (payments.length === 1) {
    const p = payments[0];
    w.row('الدفع:', `${p.mode}  ${fmt(p.amount ?? 0)} دج`, { size });
  } else {
    const align = toRasterAlign(template?.payments_align, 'right');
    w.text('الدفعات', { align, bold: true, size });
    for (const p of payments) w.text(`${p.mode}  ${fmt(p.amount ?? 0)} دج`, { align, size });
  }
}

function buildRasterBalance(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const b = data.balance;
  if (!b) return;
  const size = 9;
  if (on(template, 'show_prev_balance')) w.row('الرصيد السابق:', fmt(b.previous ?? 0), { size });
  if (on(template, 'show_new_balance')) w.row('الرصيد الجديد:', fmt(b.current ?? 0), { bold: true, size });
}

function buildRasterBarcode(data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  if (template?.show_barcode === false) return;
  const docNumber = data.doc?.number;
  if (!docNumber || String(docNumber).trim() === '') return;
  w.space();
  w.text(docNumber, { align: 'center', size: 9 });
}

function buildRasterSignatures(_data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const showCash = (template?.show_cashier_signature ?? true) !== false;
  const showClient = (template?.show_client_signature ?? true) !== false;
  const showStamp = (template?.show_stamp ?? true) !== false;
  if (!showCash && !showClient && !showStamp) return;
  const size = 9;

  w.space(2);
  const cashLine = showCash ? '___________________' : '';
  const clientLine = showClient ? '___________________' : '';
  if (cashLine || clientLine) w.text(`${cashLine}    ${clientLine}`, { align: 'center', size });

  if (showCash || showClient) {
    const cashLabel = showCash ? lbl(template, 'label_cashier_signature', 'توقيع الكاشير') : '';
    const clientLabel = showClient ? lbl(template, 'label_client_signature', 'توقيع الزبون') : '';
    w.text(`${cashLabel}    ${clientLabel}`, { align: 'center', size });
  }

  if (showStamp) w.text(lbl(template, 'label_stamp', '[ ختم ]'), { align: 'center', size });
  w.space();
}

function buildRasterFooter(_data: UniversalDocumentData, template: Tpl, w: PlanWriter): void {
  const now = new Date();
  if (template?.footer_separator && template.footer_separator !== 'none') w.divider('-');
  if (template?.show_thank_you !== false) {
    const thankYou = String(template?.thank_you_text ?? '').trim();
    if (thankYou) w.text(thankYou, { align: 'center', size: 9 });
  }
  w.text(`نظام ERP الجزائر — ${now.getFullYear()}`, { align: 'center', size: 9 });
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export function buildThermalRasterPlan(
  data: UniversalDocumentData,
  template: PrintTemplate | null,
  widthDots: number,
): ThermalRasterPlan {
  const w = new PlanWriter();

  buildRasterHeader(data, template, w);
  if (template?.header_separator && template.header_separator !== 'none') w.divider('=');
  buildRasterTitle(data, template, w);
  buildRasterDocInfo(data, template, w);
  buildRasterItems(data, template, w);
  w.divider('=');
  buildRasterTotals(data, template, w);
  buildRasterBalance(data, template, w);
  buildRasterPayments(data, template, w);
  buildRasterBarcode(data, template, w);
  buildRasterSignatures(data, template, w);
  buildRasterFooter(data, template, w);

  return { lines: w.lines, widthDots };
}