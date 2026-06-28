import type { IRenderer, RenderContext, RenderResult } from './IRenderer';
import type { UniversalDocumentData } from '../data/UniversalDocumentData';

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cell(value: unknown, type: 'String' | 'Number' = 'String'): string {
  if (type === 'Number') return `<Cell><Data ss:Type="Number">${value ?? 0}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${escXml(String(value ?? ''))}</Data></Cell>`;
}

function headingRow(label: string): string {
  return `<Row><Cell ss:StyleID="heading"><Data ss:Type="String">${escXml(label)}</Data></Cell></Row>`;
}

function dataCell(val: unknown, isNum = false): string {
  return isNum ? cell(val, 'Number') : cell(val);
}

function stylesXml(): string {
  return `
<Styles>
  <Style ss:ID="Default" ss:Name="Normal">
    <Font ss:FontName="Tajawal" ss:Size="10" />
    <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
  </Style>
  <Style ss:ID="heading">
    <Font ss:FontName="Tajawal" ss:Size="12" ss:Bold="1" />
    <Interior ss:Color="#1e3a5f" ss:Pattern="Solid" />
    <Font ss:Color="#ffffff" />
  </Style>
  <Style ss:ID="section">
    <Font ss:FontName="Tajawal" ss:Size="11" ss:Bold="1" />
    <Interior ss:Color="#e8eef5" ss:Pattern="Solid" />
  </Style>
  <Style ss:ID="total">
    <Font ss:FontName="Tajawal" ss:Size="10" ss:Bold="1" />
    <Interior ss:Color="#f0f4f8" ss:Pattern="Solid" />
  </Style>
  <Style ss:ID="number">
    <NumberFormat ss:Format="#,##0.00" />
  </Style>
</Styles>`;
}

function buildSheet(data: UniversalDocumentData): string {
  const cur = data.currency?.symbol ?? 'د.ج';
  const rows: string[] = [];

  // Company header
  rows.push(headingRow(data.company.name));
  if (data.company.address) rows.push(`<Row>${cell(data.company.address)}</Row>`);
  rows.push(`<Row>${cell(`NIF: ${data.company.nif ?? '—'}  RC: ${data.company.rc ?? '—'}`)}</Row>`);
  rows.push('<Row></Row>');

  // Document info
  rows.push(`<Row>${cell(`${data.doc.typeName ?? ''} : ${data.doc.number}`)}<Cell>${cell(data.doc.date)}</Cell></Row>`);
  if (data.party) {
    rows.push(`<Row>${cell(`العميل: ${data.party.name}`)}<Cell>${cell(`NIF: ${data.party.nif ?? ''}`)}</Cell></Row>`);
  }
  rows.push('<Row></Row>');

  // Items
  if (data.lines.length > 0) {
    rows.push(`<Row ss:StyleID="section">${['#', 'المنتج', 'الكمية', 'سعر الوحدة', 'TVA%', 'الإجمالي HT', 'الإجمالي TTC'].map(h => cell(h)).join('')}</Row>`);
    for (const line of data.lines) {
      rows.push(`<Row>${[
        dataCell(line.rowNumber),
        dataCell(line.name),
        dataCell(line.quantity, true),
        dataCell(line.unitPriceHt, true),
        dataCell(line.tvaPct, true),
        dataCell(line.totalHt, true),
        dataCell(line.totalTtc, true),
      ].join('')}</Row>`);
    }
    rows.push('<Row></Row>');
  }

  // Totals
  const t = data.totals;
  rows.push(`<Row ss:StyleID="total">${cell('الإجمالي HT')}${cell(t.totalHt, 'Number')}</Row>`);
  rows.push(`<Row>${cell('TVA')}${cell(t.totalTva, 'Number')}</Row>`);
  rows.push(`<Row>${cell('الطابع الجبائي')}${cell(t.fiscalStamp, 'Number')}</Row>`);
  rows.push(`<Row>${cell('الخصم')}${cell(t.totalDiscount, 'Number')}</Row>`);
  rows.push(`<Row ss:StyleID="total">${cell('الإجمالي TTC')}${cell(t.totalTtc, 'Number')}</Row>`);
  rows.push(`<Row>${cell('المدفوع')}${cell(t.paid, 'Number')}</Row>`);
  if (t.remaining > 0) rows.push(`<Row>${cell('المتبقي')}${cell(t.remaining, 'Number')}</Row>`);
  rows.push('<Row></Row>');

  // Payments
  if (data.payments.length > 0) {
    rows.push(`<Row ss:StyleID="section">${['وسيلة الدفع', 'المبلغ'].map(h => cell(h)).join('')}</Row>`);
    for (const p of data.payments) {
      rows.push(`<Row>${cell(p.mode)}${cell(p.amount, 'Number')}</Row>`);
    }
    rows.push('<Row></Row>');
  }

  // Report
  if (data.report) {
    const r = data.report;
    rows.push(headingRow('تقرير الجلسة'));
    [
      ['المبيعات الصافية', r.netSales, true],
      ['إجمالي المبيعات', r.grossSales, true],
      ['المرتجعات', r.returnsTotal, true],
      ['عدد الفواتير', r.invoicesCount, true],
      ['أعلى فاتورة', r.highestInvoice, true],
      ['متوسط الفاتورة', r.avgInvoice, true],
      ['TVA الإجمالية', r.totalTva, true],
      ['الخصومات', r.totalDiscount, true],
      ['الطابع الجبائي', r.totalFiscalStamp, true],
      ['رصيد الافتتاح', r.openingCash, true],
      ['المتوقع بالدرج', r.closingCashExpected, true],
      ['المعدود بالدرج', r.closingCashCounted, true],
      ['فرق الخزينة', r.cashDifference, true],
    ].forEach(([label, val, isNum]) => {
      rows.push(`<Row>${cell(label as string)}${cell(val as number, isNum ? 'Number' : 'String')}</Row>`);
    });
    rows.push('<Row></Row>');

    // Payment breakdown
    if (r.paymentBreakdown.length > 0) {
      rows.push(`<Row ss:StyleID="section">${['وسيلة الدفع', 'عدد', 'المبلغ'].map(h => cell(h)).join('')}</Row>`);
      for (const p of r.paymentBreakdown) {
        rows.push(`<Row>${cell(p.mode)}${cell(p.count, 'Number')}${cell(p.amount, 'Number')}</Row>`);
      }
      rows.push('<Row></Row>');
    }

    // Top products
    if (r.topProducts.length > 0) {
      rows.push(`<Row ss:StyleID="section">${['المنتج', 'الكمية', 'الإجمالي HT', 'الإجمالي TTC'].map(h => cell(h)).join('')}</Row>`);
      for (const p of r.topProducts) {
        rows.push(`<Row>${cell(p.name)}${cell(p.quantity, 'Number')}${cell(p.totalHt, 'Number')}${cell(p.totalTtc, 'Number')}</Row>`);
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
${stylesXml()}
<Worksheet ss:Name="Report">
  <Table ss:DefaultColumnWidth="120">
    ${rows.join('\n    ')}
  </Table>
</Worksheet>
</Workbook>`;
}

export class ExcelRenderer implements IRenderer<string> {
  readonly outputType = 'xlsx' as const;

  async render(ctx: RenderContext): Promise<RenderResult<string>> {
    const xml = buildSheet(ctx.data);

    return {
      type: 'xlsx',
      payload: xml,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${ctx.data.doc.typeName ?? 'export'}_${ctx.data.doc.number ?? 'unknown'}.xlsx`,
    };
  }

  supports(): boolean {
    return true;
  }
}

export const excelRenderer = new ExcelRenderer();
