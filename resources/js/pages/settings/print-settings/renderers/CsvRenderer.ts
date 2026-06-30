import type { IRenderer, RenderContext, RenderResult } from './IRenderer';
import type { DocumentLine } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function lineToRow(line: DocumentLine): string[] {
  return [
    String(line.rowNumber),
    line.ref ?? '',
    line.name,
    line.unit ?? '',
    String(line.quantity),
    String(line.unitPriceHt),
    String(line.tvaPct),
    String(line.discountPct),
    String(line.totalHt),
    String(line.totalTtc),
  ];
}

function headerRow(fields: string[]): string {
  return fields.map(escapeCsv).join(',');
}

export class CsvRenderer implements IRenderer<string> {
  readonly outputType = 'csv' as const;

  async render(ctx: RenderContext): Promise<RenderResult<string>> {
    const { data, template, currencySymbol } = ctx;
    const cur = currencySymbol ?? data.currency?.symbol ?? '';

    const lines: string[] = [];

    // ── Company info ──
    lines.push(`# ${escapeCsv(data.company.name)}`);
    if (data.company.address) lines.push(`# ${escapeCsv(data.company.address)}`);
    lines.push(`# NIF: ${escapeCsv(data.company.nif ?? '')}  RC: ${escapeCsv(data.company.rc ?? '')}`);
    lines.push('');

    // ── Document info ──
    lines.push(`${escapeCsv(data.doc.typeName ?? '')},${escapeCsv(data.doc.number)},${escapeCsv(data.doc.date)}`);
    if (data.party) {
      lines.push(`عميل,${escapeCsv(data.party.name)},NIF: ${escapeCsv(data.party.nif ?? '')}`);
    }
    lines.push('');

    // ── Items ──
    if (data.lines.length > 0) {
      lines.push(headerRow(['#', 'مرجع', 'المنتج', 'الوحدة', 'الكمية', 'سعر الوحدة HT', 'TVA%', 'الخصم%', 'الإجمالي HT', 'الإجمالي TTC']));
      for (const line of data.lines) {
        lines.push(lineToRow(line).map(escapeCsv).join(','));
      }
      lines.push('');
    }

    // ── Totals ──
    const t = data.totals;
    lines.push(`الإجمالي HT,${t.totalHt} ${cur}`);
    lines.push(`TVA,${t.totalTva} ${cur}`);
    lines.push(`الطابع,${t.fiscalStamp} ${cur}`);
    lines.push(`الخصم,${t.totalDiscount} ${cur}`);
    lines.push(`الإجمالي TTC,${t.totalTtc} ${cur}`);
    lines.push(`المدفوع,${t.paid} ${cur}`);
    if (t.remaining > 0) lines.push(`المتبقي,${t.remaining} ${cur}`);
    lines.push('');

    // ── Payments ──
    if (data.payments.length > 0) {
      lines.push(headerRow(['وسيلة الدفع', 'المبلغ']));
      for (const p of data.payments) {
        lines.push(`${escapeCsv(p.mode)},${p.amount}`);
      }
      lines.push('');
    }

    // ── Report summary ──
    if (data.report) {
      const r = data.report;
      lines.push('═ تقرير الجلسة ═');
      lines.push(`المبيعات الصافية,${r.netSales} ${cur}`);
      lines.push(`إجمالي المبيعات,${r.grossSales} ${cur}`);
      lines.push(`المرتجعات,${r.returnsTotal} ${cur} (${r.returnsCount})`);
      lines.push(`عدد الفواتير,${r.invoicesCount}`);
      lines.push(`أعلى فاتورة,${r.highestInvoice} ${cur}`);
      lines.push(`متوسط الفاتورة,${r.avgInvoice} ${cur}`);
      lines.push(`TVA,${r.totalTva} ${cur}`);
      lines.push(`الخصومات,${r.totalDiscount} ${cur}`);
      lines.push(`الطابع,${r.totalFiscalStamp} ${cur}`);
      lines.push(`رصيد الافتتاح,${r.openingCash} ${cur}`);
      lines.push(`المتوقع بالدرج,${r.closingCashExpected} ${cur}`);
      lines.push(`المعدود بالدرج,${r.closingCashCounted} ${cur}`);
      lines.push(`فرق الخزينة,${r.cashDifference} ${cur}`);
      lines.push('');

      if (r.paymentBreakdown.length > 0) {
        lines.push(headerRow(['وسيلة الدفع', 'عدد', 'المبلغ']));
        for (const p of r.paymentBreakdown) {
          lines.push(`${escapeCsv(p.mode)},${p.count},${p.amount}`);
        }
        lines.push('');
      }

      if (r.topProducts.length > 0) {
        lines.push(headerRow(['المنتج', 'الكمية', 'الإجمالي HT', 'الإجمالي TTC']));
        for (const p of r.topProducts) {
          lines.push(`${escapeCsv(p.name)},${p.quantity},${p.totalHt},${p.totalTtc}`);
        }
        lines.push('');
      }
    }

    const csv = '\uFEFF' + lines.join('\r\n');

    return {
      type: 'csv',
      payload: csv,
      mimeType: 'text/csv;charset=utf-8',
      filename: `${data.doc.typeName ?? 'export'}_${data.doc.number ?? 'unknown'}.csv`,
    };
  }

  supports(): boolean {
    return true;
  }
}

export const csvRenderer = new CsvRenderer();
