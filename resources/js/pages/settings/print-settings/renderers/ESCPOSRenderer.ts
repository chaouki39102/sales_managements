import type { IRenderer, RenderContext, RenderResult } from './IRenderer';
import type { ColumnKey, PrintTemplate } from '../types';
import type { UniversalDocumentData, DocumentLine } from '../types/data';
import { printFieldResolver } from '../services/PrintFieldResolver';
import { COLUMN_DEFAULTS } from '../services/SettingsRegistry';
import { EscPosBuilder, fmt, lineRow, mapFontSizeToEscPos, mapInfoFontSizeToEscPos, mapAlignToEscPos } from './EscPosBuilder';

type EscPosAlign = 0 | 1 | 2;

function getVisibleCols(tpl: PrintTemplate): ColumnKey[] {
  return tpl.col_order.filter(k => tpl.col_show[k] !== false);
}

function colWidth(tpl: PrintTemplate, col: ColumnKey): number {
  return tpl.col_widths[col] ?? COLUMN_DEFAULTS[col]?.width ?? 20;
}

function colAlignEscPos(tpl: PrintTemplate, col: ColumnKey): EscPosAlign {
  const a = tpl.col_aligns[col] ?? COLUMN_DEFAULTS[col]?.align ?? 'right';
  return mapAlignToEscPos(a);
}

function resolveField(fieldId: string, fallback: string, data: UniversalDocumentData, template: PrintTemplate): string {
  return String(printFieldResolver.resolve(fieldId, data, template) ?? fallback);
}

function buildThermalHeader(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_header_section) return;

  const co = data.company ?? {};

  const companyName    = resolveField('company.name', co.name ?? 'نظام المبيعات', data, template);
  const companyAddress = resolveField('company.address', co.address ?? '', data, template);
  const companyPhone   = resolveField('company.phone', co.phone ?? '', data, template);
  const companyNIF     = resolveField('company.nif', co.nif ?? '', data, template);
  const companyRC      = resolveField('company.rc', co.rc ?? '', data, template);
  const companyNIS     = resolveField('company.nis', co.nis ?? '', data, template);
  const companyArticle = resolveField('company.article', co.article ?? '', data, template);
  const companyMobile  = resolveField('company.mobile', co.mobile ?? '', data, template);
  const companyEmail   = resolveField('company.email', co.email ?? '', data, template);

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

  const infoAlign = mapAlignToEscPos(template.company_info_align);
  const [iw, ih]  = mapInfoFontSizeToEscPos(template.company_info_size ?? 9);

  const infoField = (show: boolean | undefined, val: string, prefix = '') => {
    if (show !== false && val) {
      b.setFontSize(iw, ih).setAlign(infoAlign).text(prefix + val).lineFeed().resetFontSize();
    }
  };

  infoField(template.show_address,         companyAddress);
  infoField(template.show_phone,           companyPhone);
  infoField(template.show_mobile,          companyMobile);
  infoField(template.show_email,           companyEmail);
  infoField(template.show_tax_id,          companyNIF,   'NIF: ');
  infoField(template.show_rc,              companyRC,    'RC: ');
  infoField(template.show_nis,             companyNIS,   'NIS: ');
  infoField(template.show_article,         companyArticle, 'Article: ');

  if (template.header_separator && template.header_separator !== 'none') {
    b.divider('=', 42);
  }
}

function buildThermalTitle(b: EscPosBuilder, template: PrintTemplate): void {
  const title = template.title_text || 'فاتورة';
  const titleAlign = mapAlignToEscPos(template.title_align);
  const titleBold  = template.title_bold !== false;
  const [tw, th]   = mapFontSizeToEscPos(template.title_size ?? 13);

  b.setFontSize(tw, th);
  if (titleBold) b.setBold(true);
  b.setAlign(titleAlign).text(title).lineFeed();
  if (titleBold) b.setBold(false);
  b.resetFontSize();
}

function buildThermalDocInfo(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_doc_info_section) return;

  buildThermalTitle(b, template);

  const now = new Date();
  b.setAlign(0);

  const doc = data.doc ?? {};
  const party = data.party;

  if (template.show_doc_number !== false && doc.number) {
    b.setBold(true).text(template.label_doc_number || 'رقم الفاتورة: ').ascii(doc.number).lineFeed().setBold(false);
  }

  if (template.show_date !== false && doc.date) {
    b.text(template.label_date || 'التاريخ: ').ascii(doc.date.slice(0, 10)).lineFeed();
  }

  if (template.show_time !== false) {
    b.text(template.label_time || 'الوقت: ').ascii(doc.time || now.toLocaleTimeString('fr-DZ')).lineFeed();
  }

  if (template.show_due_date !== false && doc.dueDate) {
    b.text(template.label_due_date || 'تاريخ الاستحقاق: ').ascii(doc.dueDate.slice(0, 10)).lineFeed();
  }

  if (party) {
    if (template.show_client !== false) {
      b.text(template.label_client || 'الزبون: ').text(party.name).lineFeed();
    }
    if (template.show_client_phone && party.phone) {
      b.text(template.label_client_phone || 'الهاتف: ').ascii(party.phone).lineFeed();
    }
    if (template.show_client_nif && party.nif) {
      b.text(template.label_client_nif || 'NIF: ').ascii(party.nif).lineFeed();
    }
    if (template.show_client_address && party.address) {
      b.text(template.label_client_address || 'العنوان: ').ascii(party.address).lineFeed();
    }
  }

  if (template.show_cashier !== false && data.cashier) {
    b.text(template.label_cashier || 'الكاشير: ').text(data.cashier).lineFeed();
  }

  if (template.show_session && data.sessionLabel) {
    b.text(template.label_session || 'الجلسة: ').text(data.sessionLabel).lineFeed();
  }

  if (template.show_payment_term && data.paymentTerm) {
    b.text(template.label_payment_term || 'شروط الدفع: ').text(data.paymentTerm).lineFeed();
  }

  b.divider('-', 42);
}

function buildThermalItems(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_items_section) return;
  const lines = data.lines ?? [];
  if (lines.length === 0) return;

  const visibleCols = getVisibleCols(template);
  const printWidth = template.paper_width_mm === 58 ? 32 : 42;

  if (template.show_col_header !== false && visibleCols.length > 0) {
    const header = visibleCols.map(col => {
      const h = template.col_headers[col] || COLUMN_DEFAULTS[col]?.header || col;
      return h;
    }).join(' | ');
    b.setBold(true).setAlign(0).text(header).lineFeed().setBold(false);
  }

  for (const line of lines) {
    const name = line.name ?? '';

    if (visibleCols.length === 0 || visibleCols.length === visibleCols.filter(c => c === 'name').length) {
      b.text(name).lineFeed();
      const detail = `  ${fmt(line.quantity)} x ${fmt(line.unitPriceHt)}` +
        (line.discountPct > 0 ? ` (-${line.discountPct.toFixed(0)}%)` : '');
      const totalStr = `${fmt(line.totalTtc)} دج`;
      b.setAlign(0).ascii(detail);
      b.setAlign(2).ascii(totalStr).lineFeed();
    } else {
      if (line.discountPct > 0) {
        b.text(name).lineFeed();
      }
      const parts: string[] = [];
      for (const col of visibleCols) {
        if (col === 'name') continue;
        let val = '';
        switch (col) {
          case 'rowNumber': val = String(line.rowNumber); break;
          case 'quantity':  val = `${fmt(line.quantity)} ${line.unit || ''}`; break;
          case 'price':     val = fmt(line.unitPriceHt); break;
          case 'discount':  val = line.discountPct > 0 ? `${line.discountPct.toFixed(1)}%` : ''; break;
          case 'tva':       val = line.tvaRate != null ? `${(line.tvaRate * 100).toFixed(0)}%` : ''; break;
          case 'total':     val = `${fmt(line.totalTtc)}`; break;
        }
        if (val) parts.push(val);
      }
      const detail = parts.join(' | ');
      b.setAlign(0).text(name);
      b.ascii(`  ${detail}`).lineFeed();
    }
  }

  b.divider('-', printWidth);
}

function buildThermalTotals(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_totals_section) return;
  const t = data.totals;
  if (!t) return;

  const printWidth = template.paper_width_mm === 58 ? 32 : 42;

  b.setAlign(0);
  if (template.show_total_ht !== false) {
    b.ascii(lineRow(template.label_total_ht || 'المجموع HT:', `${fmt(t.totalHt)} دج`, printWidth)).lineFeed();
  }
  if (template.show_discount_total !== false && t.totalDiscount > 0) {
    b.ascii(lineRow(template.label_discount_total || 'الخصم:', `-${fmt(t.totalDiscount)} دج`, printWidth)).lineFeed();
  }
  if (template.show_total_tva !== false) {
    b.ascii(lineRow(template.label_total_tva || 'TVA:', `${fmt(t.totalTva)} دج`, printWidth)).lineFeed();
  }
  if (template.show_tva_breakdown && data.taxBreakdown && data.taxBreakdown.length > 0) {
    for (const br of data.taxBreakdown) {
      b.ascii(lineRow(`  TVA ${(br.rate * 100).toFixed(0)}%:`, `${fmt(br.tva)} دج`, printWidth)).lineFeed();
    }
  }
  if (template.show_fiscal_stamp !== false && t.fiscalStamp > 0) {
    b.ascii(lineRow(template.label_fiscal_stamp || 'الطابع المالي:', `${fmt(t.fiscalStamp)} دج`, printWidth)).lineFeed();
  }
  b.divider('=', printWidth);

  const totalTtcFinal = t.totalTtc + t.fiscalStamp;
  b.setFontSize(2, 2).setBold(true).setAlign(2).ascii(`${fmt(totalTtcFinal)} دج`).lineFeed()
   .setBold(false).resetFontSize();

  const totalLabel = template.label_total_ttc || 'الإجمالي شامل الضريبة';
  b.setAlign(1).text(totalLabel).lineFeed();
  b.divider('=', printWidth);

  if (template.show_paid_amount !== false) {
    b.setAlign(0).ascii(lineRow(template.label_paid_amount || 'المدفوع:', `${fmt(t.paid)} دج`, printWidth)).lineFeed();
  }
  if (template.show_change !== false && t.change > 0) {
    b.ascii(lineRow(template.label_change || 'الباقي:', `${fmt(t.change)} دج`, printWidth)).lineFeed();
  }
  if (template.show_remaining !== false && t.remaining > 0) {
    b.setBold(true);
    b.ascii(lineRow(template.label_remaining || 'المتبقي:', `${fmt(t.remaining)} دج`, printWidth)).lineFeed();
    b.setBold(false);
  }
}

function buildThermalPayments(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_payments_section) return;
  const payments = data.payments ?? [];
  if (payments.length === 0) return;

  const payAlign = mapAlignToEscPos(template.payments_align);
  b.setAlign(payAlign);

  for (const p of payments) {
    const method = p.method || '';
    const amount = p.amount || 0;
    b.text(`${method}: `).ascii(`${fmt(amount)} دج`).lineFeed();
  }

  b.divider('-', 42);
}

function buildThermalBalance(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!data.balance) return;
  if (!template.show_prev_balance && !template.show_new_balance) return;
  const printWidth = template.paper_width_mm === 58 ? 32 : 42;

  b.divider('-', printWidth);
  if (template.show_prev_balance) {
    b.setAlign(0).ascii(lineRow(template.label_prev_balance || 'الرصيد السابق:', `${fmt(data.balance.previous)} دج`, printWidth)).lineFeed();
  }
  if (template.show_new_balance) {
    b.setBold(true).setAlign(0)
     .ascii(lineRow(template.label_new_balance || 'الرصيد الجديد:', `${fmt(data.balance.current)} دج`, printWidth))
     .lineFeed().setBold(false);
  }
}

function buildThermalFooter(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_footer_section) return;
  const now = new Date();
  const footerAlign = mapAlignToEscPos(template.footer_align);

  b.setAlign(footerAlign);
  if (template.footer_separator && template.footer_separator !== 'none') {
    b.divider('-', 42);
  }

  if (template.show_thank_you && template.thank_you_text) {
    b.text(template.thank_you_text).lineFeed();
  }

  if (template.footer_line1) b.text(template.footer_line1).lineFeed();
  if (template.footer_line2) b.text(template.footer_line2).lineFeed();
  if (template.footer_line3) b.text(template.footer_line3).lineFeed();

  if (template.show_returns_policy && template.returns_policy_text) {
    b.text(template.returns_policy_text).lineFeed();
  }

  if (template.footer_legal_text) {
    b.text(template.footer_legal_text).lineFeed();
  }

  b.center(`نظام ERP الجزائر — ${now.getFullYear()}`);
}

function buildThermalBarcode(b: EscPosBuilder, data: UniversalDocumentData, template: PrintTemplate): void {
  if (!template.show_barcode) return;
  const docNumber = data.doc?.number;
  if (!docNumber) return;
  b.lineFeed();
  b.center(docNumber);
}

function buildThermalSignatures(b: EscPosBuilder, template: PrintTemplate): void {
  if (!template.show_cashier_signature && !template.show_client_signature && !template.show_stamp) return;

  b.lineFeed(2);
  if (template.show_cashier_signature) {
    b.setAlign(0).text('___________________').lineFeed();
    b.text(template.label_cashier_signature || 'توقيع الكاشير').lineFeed(2);
  }
  if (template.show_client_signature) {
    b.setAlign(2).text('___________________').lineFeed();
    b.setAlign(2).text(template.label_client_signature || 'توقيع الزبون').lineFeed(2);
  }
  if (template.show_stamp) {
    b.setAlign(1).text('[ ختم ]').lineFeed();
  }
}

export const escposRenderer: IRenderer<Uint8Array> = {
  outputType: 'escpos',

  supports(paperSize: PrintTemplate['paper_size']): boolean {
    return paperSize === '80mm' || paperSize === '58mm';
  },

  async render(ctx: RenderContext): Promise<RenderResult<Uint8Array>> {
    const { data, template } = ctx;
    const docNumber = data.doc?.number;

    const b = new EscPosBuilder().init();

    buildThermalHeader(b, data, template);
    buildThermalDocInfo(b, data, template);
    buildThermalItems(b, data, template);
    buildThermalTotals(b, data, template);
    buildThermalPayments(b, data, template);
    buildThermalBalance(b, data, template);

    if (template.show_qr && docNumber) {
      b.lineFeed();
      b.qrCode(docNumber, 4);
    }

    buildThermalBarcode(b, data, template);
    buildThermalSignatures(b, template);
    buildThermalFooter(b, data, template);

    b.feedAndCut();

    return {
      type: 'escpos',
      payload: b.escposBytes(),
      mimeType: 'application/octet-stream',
      filename: `receipt-${docNumber ?? 'print'}.bin`,
    };
  },
};
