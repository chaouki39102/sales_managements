// ════════════════════════════════════════════════════════════════════════════
// DataTable/excelExportAdvanced.ts — Excel Export احترافي ERP (exceljs)
// v2.0
//
// ✅ Styling حقيقي بالكامل (ليس مجرد metadata)
// ✅ تنسيق التاريخ: 2026-06-07T23:00:00.000000Z → 2026-06-07
// ✅ عنوان مدمج (Merged) مع لون داكن
// ✅ بلوك معلومات المستند (Company Info, Document Info) بعمودين
// ✅ Header row بلون داكن + تثبيت (Freeze Panes)
// ✅ سطر المجموع في الأسفل بلون داكن
// ✅ Zebra rows (تلوين متناوب للصفوف)
// ✅ Auto-width للأعمدة مع مراعاة العربية
// ✅ Landscape + A4 + Print Area
// ✅ TVA + الطابع المالي الجزائري كسطور مستقلة
// ✅ RTL (rightToLeft) للعربية
// ✅ hook useERPExport للاستخدام في React
//
// التثبيت: npm install exceljs
// ════════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { useCallback, useState } from 'react';
import type { Column, AggregateType, DocumentInfo, ExcelExportAdvancedOptions } from './types';

// ════════════════════════════════════════════════════════════════════════════
// Theme — ألوان ERP الاحترافية
// ════════════════════════════════════════════════════════════════════════════

const T = {
  titleBg:     'FF1F3864',  // أزرق غامق جداً
  titleFg:     'FFFFFFFF',
  headerBg:    'FF2E5090',  // أزرق غامق احترافي
  headerFg:    'FFFFFFFF',
  footerBg:    'FF1F3864',
  footerFg:    'FFFFFFFF',
  infoBg:      'FFF0F4FF',  // أزرق فاتح جداً
  infoFg:      'FF1F3864',
  altRowBg:    'FFF5F7FA',  // رمادي فاتح للـ Zebra rows
  borderDark:  'FF000000',
  borderLight: 'FFD3D3D3',
  textNeg:     'FFB91C1C',  // أحمر للأرقام السالبة
  textMain:    'FF2D2D2D',
} as const;

// ════════════════════════════════════════════════════════════════════════════
// تنسيق التاريخ
// ════════════════════════════════════════════════════════════════════════════

/**
 * يحوّل أي صيغة تاريخ إلى YYYY-MM-DD
 *
 * "2026-06-07T23:00:00.000000Z"  →  "2026-06-07"
 * "2026-06-07 14:30:00"          →  "2026-06-07"
 * new Date()                     →  "2026-06-09"
 * null / undefined               →  ""
 */
export function formatDateShort(val: string | Date | null | undefined): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  } catch {
    return String(val);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers داخلية
// ════════════════════════════════════════════════════════════════════════════

function getRawValue(row: Record<string, unknown>, col: Column): unknown {
  if (col.accessor) return col.accessor(row);
  if (!col.key.includes('.')) return row[col.key];
  let val: unknown = row;
  for (const part of col.key.split('.')) {
    val = (val as Record<string, unknown>)?.[part];
    if (val == null) return undefined;
  }
  return val;
}

function getCellValue(row: Record<string, unknown>, col: Column): string | number | null {
  const val = getRawValue(row, col);
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return formatDateShort(val);
  return String(val);
}

// ─── Style helpers ──────────────────────────────────────────────────────────

const border = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({
  style, color: { argb },
});

const allBorders = (style: ExcelJS.BorderStyle, argb: string): Partial<ExcelJS.Borders> => ({
  top: border(style, argb), bottom: border(style, argb),
  left: border(style, argb), right: border(style, argb),
});

const thickBorders = (): Partial<ExcelJS.Borders> => ({
  top:    border('medium', T.borderDark), bottom: border('medium', T.borderDark),
  left:   border('thin',   T.borderDark), right:  border('thin',   T.borderDark),
});

function styleTitle(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 16, color: { argb: T.titleFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.titleBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rightToLeft' };
  cell.border    = thickBorders();
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 11, color: { argb: T.headerFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.headerBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderDark);
}

function styleFooter(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 11, color: { argb: T.footerFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.footerBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = thickBorders();
}

function styleInfoLabel(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 10, color: { argb: T.infoFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.infoBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderLight);
}

function styleInfoValue(cell: ExcelJS.Cell) {
  cell.font      = { size: 10, color: { argb: 'FF333333' }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderLight);
}

function styleData(cell: ExcelJS.Cell, isAlt: boolean, alignRight = true) {
  cell.font      = { size: 10, name: 'Calibri', color: { argb: T.textMain } };
  cell.fill      = isAlt
    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: T.altRowBg } }
    : { type: 'pattern', pattern: 'none' } as ExcelJS.FillPattern;
  cell.alignment = {
    horizontal:   alignRight ? 'right' : 'center',
    vertical:     'middle',
    readingOrder: 'rightToLeft',
  };
  cell.border    = allBorders('thin', T.borderLight);
}

// ════════════════════════════════════════════════════════════════════════════
// الدالة الرئيسية
// ════════════════════════════════════════════════════════════════════════════

export async function exportToExcelAdvanced<T extends Record<string, unknown>>(
  data: T[],
  columns: Column<T>[],
  options: ExcelExportAdvancedOptions = {},
): Promise<void> {
  const {
    fileName       = 'document.xlsx',
    title          = 'تقرير',
    documentInfo   = {} as DocumentInfo,
    showAggregates = true,
    aggregates     = {},
    currency       = documentInfo.currency ?? 'DZD',
    orientation    = 'landscape',
    sheetName      = 'البيانات',
    onSave,
  } = options;

  const colCount = columns.length;

  // ─── Workbook ─────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = documentInfo.preparedBy ?? 'ERP System';
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views:     [{ rightToLeft: true }],
    pageSetup: {
      paperSize:   9,          // A4
      orientation,
      fitToPage:   true,
      fitToWidth:  1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: `&C&"Calibri,Bold"&14${title}`,
      oddFooter: `&L${documentInfo.company ?? ''}&C&P / &N&R${formatDateShort(new Date().toISOString())}`,
    },
  });

  let r = 1;

  // ── 1. صف العنوان المدمج ────────────────────────────────────────────────
  ws.getRow(r).height = 36;
  ws.mergeCells(r, 1, r, colCount);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = title;
  styleTitle(titleCell);
  r += 2;

  // ── 2. بلوك معلومات المستند (عمودان) ───────────────────────────────────
  const infoFields: [string, string][] = (([
    ['الشركة',       documentInfo.company],
    ['العنوان',      documentInfo.companyAddress],
    ['الهاتف',       documentInfo.companyPhone],
    ['رقم TF / RC',  documentInfo.companyTaxId],
    ['NIF',          documentInfo.companyNIF],
    ['NIS',          documentInfo.companyNIS],
    ['رقم المستند',  documentInfo.documentNumber],
    ['نوع المستند',  documentInfo.documentType],
    ['القسم',        documentInfo.department],
    ['من تاريخ',     documentInfo.dateFrom ? formatDateShort(documentInfo.dateFrom) : undefined],
    ['إلى تاريخ',    documentInfo.dateTo   ? formatDateShort(documentInfo.dateTo)   : undefined],
    ['أعد بواسطة',   documentInfo.preparedBy],
    ['وافق',         documentInfo.approvedBy],
    ['ملاحظات',      documentInfo.notes],
  ] as [string, string | undefined][]).filter((f): f is [string, string] => Boolean(f[1])));

  if (infoFields.length > 0) {
    const half  = Math.ceil(infoFields.length / 2);
    const left  = infoFields.slice(0, half);
    const right = infoFields.slice(half);
    const maxR  = Math.max(left.length, right.length);

    for (let i = 0; i < maxR; i++) {
      ws.getRow(r).height = 18;
      if (left[i]) {
        styleInfoLabel(ws.getCell(r, 1));
        ws.getCell(r, 1).value = left[i][0] + ':';
        styleInfoValue(ws.getCell(r, 2));
        ws.getCell(r, 2).value = left[i][1];
      }
      if (right[i] && colCount >= 4) {
        styleInfoLabel(ws.getCell(r, 3));
        ws.getCell(r, 3).value = right[i][0] + ':';
        styleInfoValue(ws.getCell(r, 4));
        ws.getCell(r, 4).value = right[i][1];
      }
      r++;
    }
    r++;
  }

  // ── 3. صف الـ Headers ───────────────────────────────────────────────────
  const headerRow = r;
  ws.getRow(r).height = 24;
  for (let ci = 0; ci < colCount; ci++) {
    const col  = columns[ci];
    const cell = ws.getCell(r, ci + 1);
    cell.value = col.exportHeader ?? (typeof col.header === 'string' ? col.header : String(col.key));
    styleHeader(cell);
  }
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: r, rightToLeft: true }];
  r++;

  // ── 4. صفوف البيانات ─────────────────────────────────────────────────────
  for (let ri = 0; ri < data.length; ri++) {
    const rowData = data[ri] as Record<string, unknown>;
    ws.getRow(r).height = 18;
    const isAlt = ri % 2 === 1;

    for (let ci = 0; ci < colCount; ci++) {
      const col   = columns[ci];
      const cell  = ws.getCell(r, ci + 1);
      const value = getCellValue(rowData, col);

      if (value === null) {
        cell.value = '';
      } else if (typeof value === 'number') {
        cell.value  = value;
        if (col.filter?.type === 'number') cell.numFmt = '#,##0.00';
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // تاريخ كـ string — numFmt = '@' يمنع Excel من تحويله لـ serial number
        cell.value  = value;
        cell.numFmt = '@';
      } else {
        cell.value = value;
      }

      const alignRight = col.align !== 'center' && col.align !== 'end';
      styleData(cell, isAlt, alignRight);
      if (typeof value === 'number' && value < 0) {
        cell.font = { size: 10, name: 'Calibri', color: { argb: T.textNeg } };
      }
    }
    r++;
  }

  // ── 5. سطر المجموع ──────────────────────────────────────────────────────
  if (showAggregates && Object.keys(aggregates).length > 0) {
    ws.getRow(r).height = 22;
    for (let ci = 0; ci < colCount; ci++) {
      const col  = columns[ci];
      const cell = ws.getCell(r, ci + 1);
      const agg  = aggregates[col.key];
      if (agg) {
        const { type, value } = agg;
        if (typeof value === 'number') {
          cell.value  = value;
          cell.numFmt = type === 'count' ? '#,##0' : '#,##0.00';
        } else {
          cell.value = String(value);
        }
      } else if (ci === 0) {
        cell.value = 'الإجمالي';
      } else {
        cell.value = '';
      }
      styleFooter(cell);
    }
    r++;
  }

  // ── 6. TVA + الطابع المالي (ERP الجزائري) ───────────────────────────────
  const hasERP = documentInfo.vatAmount != null || documentInfo.fiscalStamp != null;
  if (hasERP) {
    r++;
    if (documentInfo.vatAmount != null) {
      ws.getRow(r).height = 18;
      const vatLabel = documentInfo.vatRate != null
        ? `TVA (${Math.round(documentInfo.vatRate * 100)}%):`
        : 'TVA:';
      ws.getCell(r, colCount - 1).value = vatLabel;
      ws.getCell(r, colCount).value     = documentInfo.vatAmount;
      ws.getCell(r, colCount).numFmt    = '#,##0.00';
      styleInfoLabel(ws.getCell(r, colCount - 1));
      styleInfoValue(ws.getCell(r, colCount));
      r++;
    }
    if (documentInfo.fiscalStamp != null) {
      ws.getRow(r).height = 18;
      ws.getCell(r, colCount - 1).value = 'الطابع المالي:';
      ws.getCell(r, colCount).value     = documentInfo.fiscalStamp;
      ws.getCell(r, colCount).numFmt    = '#,##0.00';
      styleInfoLabel(ws.getCell(r, colCount - 1));
      styleInfoValue(ws.getCell(r, colCount));
      r++;
    }
  }

  // ── 7. عرض الأعمدة (Auto-width مع مراعاة العربية) ──────────────────────
  for (let ci = 0; ci < colCount; ci++) {
    const col    = columns[ci];
    const header = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
    let maxLen   = header.length;
    for (const row of data) {
      const val = getCellValue(row as Record<string, unknown>, col);
      maxLen = Math.max(maxLen, String(val ?? '').length);
    }
    const boost = /[\u0600-\u06FF]/.test(header) ? 1.7 : 1.2;
    const w     = Math.min(Math.ceil(maxLen * boost) + 2, 55);
    ws.getColumn(ci + 1).width = Math.max(w, col.width ? Math.round(col.width / 7) : 12);
  }

  // ── 8. نطاق الطباعة + تكرار الـ Headers في كل صفحة ──────────────────────
  const lastCol = ws.getColumn(colCount).letter;
  ws.pageSetup.printArea         = `A1:${lastCol}${r - 1}`;
  ws.pageSetup.rowsToRepeatAtTop = `${headerRow}:${headerRow}`;

  // ── 9. حفظ أو تنزيل ─────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer() as ArrayBuffer;

  if (onSave) {
    onSave(buffer);
    return;
  }

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════════════════════
// exportDocumentToExcel — واجهة مبسطة للمستندات الفردية
// ════════════════════════════════════════════════════════════════════════════

export async function exportDocumentToExcel<T extends Record<string, unknown>>(
  data:         T[],
  columns:      Column<T>[],
  documentInfo: DocumentInfo,
  aggregates?:  Record<string, { type: AggregateType; value: number | string }>,
  options?:     Partial<ExcelExportAdvancedOptions>,
): Promise<void> {
  await exportToExcelAdvanced(data, columns, {
    fileName:       `${documentInfo.documentNumber ?? 'document'}.xlsx`,
    title:          documentInfo.documentType ?? 'تقرير',
    documentInfo,
    showAggregates: true,
    aggregates:     aggregates ?? {},
    ...options,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// computeAggregatesForExport — حساب المجاميع من البيانات تلقائياً
//
// ملاحظة: نسخة مستقلة مخصصة للتصدير — لا تستورد من utils لتجنب
// الـ circular dependency بين excelExportAdvanced ↔ utils
// ════════════════════════════════════════════════════════════════════════════

export function computeAggregatesForExport<T extends Record<string, unknown>>(
  data:    T[],
  columns: Column<T>[],
): Record<string, { type: AggregateType; value: number | string }> {
  const result: Record<string, { type: AggregateType; value: number | string }> = {};

  for (const col of columns) {
    if (!col.aggregate) continue;

    if (typeof col.aggregate === 'function') {
      const val = col.aggregate(data);
      if (val != null) result[col.key] = { type: 'sum', value: val as string | number };
      continue;
    }

    const type   = col.aggregate;
    const values = data
      .map(row => getRawValue(row as Record<string, unknown>, col))
      .filter((v): v is number => typeof v === 'number');

    if (!values.length) continue;

    let value: number;
    switch (type) {
      case 'sum':   value = values.reduce((a, b) => a + b, 0);                  break;
      case 'avg':   value = values.reduce((a, b) => a + b, 0) / values.length;  break;
      case 'min':   value = Math.min(...values);                                 break;
      case 'max':   value = Math.max(...values);                                 break;
      case 'count': value = data.length;                                         break;
      default:      continue;
    }

    result[col.key] = { type, value };
  }

  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// calcFiscalStamp — الطابع المالي الجزائري
// 1% من TTC، حد أقصى 2500 دج (مقرَّب لأقرب سنتيم)
// ════════════════════════════════════════════════════════════════════════════

export function calcFiscalStamp(ttcAmount: number): number {
  return Math.min(Math.round(ttcAmount * 0.01 * 100) / 100, 2500);
}

// ════════════════════════════════════════════════════════════════════════════
// useERPExport — React Hook للاستخدام مع DataTable
//
// const { exportData, exporting } = useERPExport({ columns, documentInfo });
//
// <button onClick={() => exportData(data, 'فواتير البيع')} disabled={exporting}>
//   {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
// </button>
// ════════════════════════════════════════════════════════════════════════════

export interface UseERPExportOptions<T> {
  columns:       Column<T>[];
  documentInfo?: DocumentInfo;
  currency?:     string;
}

export function useERPExport<T extends Record<string, unknown>>(
  opts: UseERPExportOptions<T>,
) {
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(
    async (
      data:       T[],
      title:      string,
      fileName?:  string,
      extraInfo?: Partial<DocumentInfo>,
    ) => {
      setExporting(true);
      try {
        const aggregates = computeAggregatesForExport(data, opts.columns);
        const mergedInfo = { ...opts.documentInfo, ...extraInfo };

        // حساب الطابع المالي تلقائياً إذا لم يُمرَّر
        if (!mergedInfo.fiscalStamp && aggregates['total_ttc']) {
          const ttc = aggregates['total_ttc'].value;
          if (typeof ttc === 'number') {
            mergedInfo.fiscalStamp = calcFiscalStamp(ttc);
          }
        }

        await exportToExcelAdvanced(data, opts.columns, {
          fileName:       fileName ?? `${title}.xlsx`,
          title,
          documentInfo:   mergedInfo,
          showAggregates: true,
          aggregates,
          currency:       opts.currency ?? mergedInfo.currency ?? 'DZD',
        });
      } finally {
        setExporting(false);
      }
    },
    [opts],
  );

  return { exportData, exporting };
}
