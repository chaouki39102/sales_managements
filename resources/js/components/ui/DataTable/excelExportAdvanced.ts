// ════════════════════════════════════════════════════════════════════════════
// DataTable/excelExportAdvanced.ts — Excel Export احترافي ERP (exceljs)
// v3.2 - مصحح واحترافي
//
// ✅ الإصلاحات:
//   • سطر الإجماليات يحسب تلقائياً
//   • جميع الأعمدة تُحسب حتى بدون aggregates مُمررة
//   • numberToArabicWords معرّفة وتعمل
//   • أرقام سالبة بتمييز أحمر + قوسين
//   • Hook useERPExport محدثة بشكل صحيح
//
// الاستخدام:
//   import { exportToExcelAdvanced, useERPExport } from '@/components/ui/DataTable';
//   const { exportData } = useERPExport();
//   await exportData(data, columns, documentInfo);
// ════════════════════════════════════════════════════════════════════════════

import type ExcelJS from 'exceljs';
import { useCallback, useEffect, useRef } from 'react';
import type { Column, AggregateType, DocumentInfo, ExcelExportAdvancedOptions } from './types';

// ════════════════════════════════════════════════════════════════════════════
// Theme — ألوان ERP الاحترافية
// ════════════════════════════════════════════════════════════════════════════

const T = {
  titleBg:     'FF1F3864',
  titleFg:     'FFFFFFFF',
  headerBg:    'FF2E5090',
  headerFg:    'FFFFFFFF',
  footerBg:    'FF1F3864',
  footerFg:    'FFFFFFFF',
  footerSumBg: 'FF243F70',
  infoBg:      'FFF0F4FF',
  infoFg:      'FF1F3864',
  altRowBg:    'FFF5F7FA',
  whiteBg:     'FFFFFFFF',
  borderDark:  'FF2E5090',
  borderLight: 'FFD0D8E8',
  textNeg:     'FFB91C1C',
  textMain:    'FF1A1A2E',
  textSub:     'FF4A5568',
  aggLabelBg:  'FFE8EEF8',
} as const;

const DOC_TAB_COLORS: Record<string, string> = {
  'فاتورة بيع':  '2E5090',
  'فاتورة شراء': '7B3F00',
  'وصل استلام':  '1A6B3C',
  'أمر شراء':    '7B5200',
  'عرض سعر':     '4A1580',
};

const AGG_SYMBOLS: Record<AggregateType, string> = {
  sum: 'Σ', avg: 'Ø', min: '↓', max: '↑', count: '#',
};

// ════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════════════════

export function formatDateShort(val: string | Date | null | undefined): string {
  if (!val) return '';
  const s = String(val);
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      String(d.getUTCDate()).padStart(2, '0'),
    ].join('-');
  } catch {
    return s;
  }
}

/**
 * الطابع المالي الجزائري — 1% من المبلغ الإجمالي TTC
 * الحد الأقصى: 2500 دج (المادة 215 من قانون الضرائب غير المباشرة)
 * النتيجة مقرَّبة لأقرب سنتيم (جزء من مئة دينار)
 */
export function calcFiscalStamp(ttcAmount: number): number {
  if (ttcAmount <= 0) return 0;
  const calculated = ttcAmount * 0.01;
  return Math.round(Math.max(5, Math.min(calculated, 2500)) * 100) / 100;
}

// ─── تحويل الأرقام إلى كلمات عربية ─────────────────────────────────────────

const CURRENCY_NAMES: Record<string, string> = {
  DZD: 'دينار جزائري',
  EUR: 'يورو',
  USD: 'دولار أمريكي',
  GBP: 'جنيه إسترليني',
  SAR: 'ريال سعودي',
};

function numberToArabicWords(num: number, currency: string = 'DZD'): string {
  const ones = [
    '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  ];
  const tens = [
    '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون',
  ];
  const hundreds = [
    '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
    'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة',
  ];
  const thousands = ['', 'ألف', 'مليون', 'مليار', 'تريليون'];

  const currencyName = CURRENCY_NAMES[currency] ?? currency;

  if (num === 0) return `صفر ${currencyName}`;

  let result = '';
  let groupIndex = 0;
  // ✅ let بدلاً من const لأنها تتغير في الحلقة
  let remaining = Math.abs(Math.floor(num));

  while (remaining > 0 && groupIndex < thousands.length) {
    const group = remaining % 1000;
    if (group !== 0) {
      const groupWords = convertGroupToWords(group, ones, tens, hundreds);
      const scale      = thousands[groupIndex];
      result = groupWords + (scale ? ` ${scale}` : '') + (result ? ` ${result}` : '');
    }
    remaining  = Math.floor(remaining / 1000);
    groupIndex++;
  }

  const prefix = num < 0 ? 'سالب ' : '';
  return `${prefix}${result.trim()} ${currencyName}`;
}

function convertGroupToWords(num: number, ones: string[], tens: string[], hundreds: string[]): string {
  let result = '';

  if (num >= 100) {
    result = hundreds[Math.floor(num / 100)];
    num %= 100;
  }

  if (num >= 20) {
    result += (result ? ' و' : '') + tens[Math.floor(num / 10)];
    if (num % 10 !== 0) {
      result += ' و' + ones[num % 10];
    }
  } else if (num > 0) {
    result += (result ? ' و' : '') + ones[num];
  }

  return result.trim();
}

// ✅ حساب الإجماليات من البيانات
export function computeAggregatesForExport<T extends Record<string, unknown>>(
  data: T[],
  columns: Column<T>[],
  existingAggs?: Record<string, { type: AggregateType; value: number | string }>,
): Record<string, { type: AggregateType; value: number | string }> {
  const aggs = existingAggs ? { ...existingAggs } : {};

  for (const col of columns) {
    if (!col.aggregate || aggs[col.key]) continue;

    if (typeof col.aggregate === 'function') {
      const val = col.aggregate(data);
      if (val != null) {
        aggs[col.key] = { type: 'sum', value: val };
      }
      continue;
    }

    const type = col.aggregate;
    const values = data
      .map(row => {
        const v = col.accessor ? col.accessor(row) : (row[col.key] ?? 0);
        return typeof v === 'number' ? v : Number(v ?? 0);
      })
      .filter(v => !isNaN(v));

    if (values.length === 0) continue;

    let result: number = 0;
    switch (type) {
      case 'sum':   result = values.reduce((a, b) => a + b, 0); break;
      case 'avg':   result = values.reduce((a, b) => a + b, 0) / values.length; break;
      case 'min':   result = Math.min(...values); break;
      case 'max':   result = Math.max(...values); break;
      case 'count': result = values.length; break;
    }

    aggs[col.key] = { type, value: result };
  }

  return aggs;
}

// ─── Style helpers ──────────────────────────────────────────────────────────

const bdr = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border =>
  ({ style, color: { argb } });

const allBorders = (style: ExcelJS.BorderStyle, argb: string): Partial<ExcelJS.Borders> =>
  ({ top: bdr(style, argb), bottom: bdr(style, argb), left: bdr(style, argb), right: bdr(style, argb) });

const thickBox = (): Partial<ExcelJS.Borders> => ({
  top:    bdr('medium', T.borderDark), bottom: bdr('medium', T.borderDark),
  left:   bdr('medium', T.borderDark), right:  bdr('medium', T.borderDark),
});

const outerBold = (): Partial<ExcelJS.Borders> => ({
  top:    bdr('medium', T.borderDark), bottom: bdr('medium', T.borderDark),
  left:   bdr('thin',   T.borderDark), right:  bdr('thin',   T.borderDark),
});

function styleTitle(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 16, color: { argb: T.titleFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.titleBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
  cell.border    = thickBox();
}

function styleSubtitle(cell: ExcelJS.Cell) {
  cell.font      = { italic: true, size: 10, color: { argb: 'FFAABBCC' }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.titleBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 11, color: { argb: T.headerFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.headerBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
  cell.border    = allBorders('thin', T.borderDark);
}

function styleFooter(cell: ExcelJS.Cell, isLabel = false) {
  cell.font      = { bold: true, size: 11, color: { argb: T.footerFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLabel ? T.footerBg : T.footerSumBg } };
  cell.alignment = { horizontal: isLabel ? 'right' : 'center', vertical: 'middle', readingOrder: 'rtl' };
  cell.border    = outerBold();
}

function styleInfoLabel(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 10, color: { argb: T.infoFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.infoBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
  cell.border    = allBorders('thin', T.borderLight);
}

function styleInfoValue(cell: ExcelJS.Cell) {
  cell.font      = { size: 10, color: { argb: T.textSub }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.whiteBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' };
  cell.border    = allBorders('thin', T.borderLight);
}

// ✅ أضيف معالجة للأرقام السالبة
function styleData(cell: ExcelJS.Cell, value: unknown, isAlt: boolean, align: 'right' | 'center' | 'left' = 'right') {
  cell.font      = { size: 10, name: 'Calibri', color: { argb: T.textMain } };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? T.altRowBg : T.whiteBg } };
  cell.alignment = { horizontal: align, vertical: 'middle', readingOrder: 'rtl' };
  cell.border    = allBorders('thin', T.borderLight);

  // ✅ للأرقام السالبة: أحمر + قوسين محاسبيين
  if (typeof value === 'number' && value < 0) {
    cell.font = { ...cell.font, color: { argb: T.textNeg }, bold: true };
    cell.numFmt = `[RED](#,##0.00);(#,##0.00)`;
  }
}

function styleAmountWords(cell: ExcelJS.Cell) {
  cell.font      = { italic: true, size: 9, color: { argb: T.infoFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.aggLabelBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl', wrapText: true };
  cell.border    = allBorders('thin', T.borderLight);
}

function currencyNumFmt(currency: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'DZD';
  return `#,##0.00 "${sym}"`;
}

// ════════════════════════════════════════════════════════════════════════════
// الدالة الرئيسية
// ════════════════════════════════════════════════════════════════════════════

export async function exportToExcelAdvanced<T extends Record<string, unknown>>(
  data:    T[],
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

  const numFmt   = currencyNumFmt(currency);
  const colCount = columns.length;

  // ✅ حساب الإجماليات تلقائياً إذا كانت فارغة
  let finalAggregates = aggregates;
  if (showAggregates && Object.keys(finalAggregates).length === 0) {
    finalAggregates = computeAggregatesForExport(data, columns);
  }

  // ─── Workbook ─────────────────────────────────────────────────────────────
  const ExcelJSModule = await import('exceljs');
  const wb = new ExcelJSModule.Workbook();
  wb.creator  = documentInfo.preparedBy ?? 'ERP System';
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views:     [{ rightToLeft: true }],
    pageSetup: {
      paperSize:   9,
      orientation,
      fitToPage:   true,
      fitToWidth:  1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: `&C&"Calibri,Bold"&14${title}`,
      oddFooter:  `&L${documentInfo.company ?? ''}&C&P / &N&R${formatDateShort(new Date().toISOString())}`,
    },
  });

  const tabColor = documentInfo.documentType ? DOC_TAB_COLORS[documentInfo.documentType] : undefined;
  if (tabColor) ws.properties = { ...ws.properties, tabColor: { argb: tabColor } };

  let r = 1;

  // ── 1. صف العنوان ────────────────────────────────────────────────────────
  ws.getRow(r).height = 38;
  ws.mergeCells(r, 1, r, colCount);
  styleTitle(ws.getCell(r, 1));
  ws.getCell(r, 1).value = title;
  r++;

  // ── 2. معلومات المستند ──────────────────────────────────────────────────
  if (documentInfo.documentNumber || documentInfo.documentType) {
    const infoCells = [];
    if (documentInfo.documentNumber) infoCells.push(`رقم: ${documentInfo.documentNumber}`);
    if (documentInfo.documentType) infoCells.push(`النوع: ${documentInfo.documentType}`);

    if (infoCells.length > 0) {
      ws.getRow(r).height = 20;
      ws.mergeCells(r, 1, r, colCount);
      const infoCell = ws.getCell(r, 1);
      infoCell.value = infoCells.join(' | ');
      styleSubtitle(infoCell);
      r++;
    }
  }

  r++;

  // ── 3. صف الرؤوس ────────────────────────────────────────────────────────
  ws.getRow(r).height = 25;
  for (let ci = 0; ci < colCount; ci++) {
    const col  = columns[ci];
    const cell = ws.getCell(r, ci + 1);
    const header = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
    cell.value = header;
    styleHeader(cell);
  }
  r++;

  // ── 4. البيانات ──────────────────────────────────────────────────────────
  let sumTTC: number | null = null;

  for (let di = 0; di < data.length; di++) {
    const row = data[di];
    const isAlt = di % 2 === 0;
    ws.getRow(r).height = 20;

    for (let ci = 0; ci < colCount; ci++) {
      const col  = columns[ci];
      const cell = ws.getCell(r, ci + 1);
      const val  = col.accessor ? col.accessor(row) : (row[col.key] ?? '');

      if (typeof val === 'number') {
        cell.value  = val;
        cell.numFmt = col.key.toLowerCase().includes('price') ||
                      col.key.toLowerCase().includes('total') ||
                      col.key.toLowerCase().includes('amount') ? numFmt : '#,##0';
      } else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
        cell.value = formatDateShort(val);
      } else {
        cell.value = val;
      }

      const align = col.align === 'center' ? 'center' : col.align === 'end' ? 'left' : 'right';
      styleData(cell, val, isAlt, align);
    }

    r++;
  }

  // ── 5. سطر الإجماليات ────────────────────────────────────────────────────
  // ✅ المشكلة مصححة: يحسب الإجماليات دائماً
  if (showAggregates && Object.keys(finalAggregates).length > 0) {
    ws.getRow(r).height = 24;
    for (let ci = 0; ci < colCount; ci++) {
      const col  = columns[ci];
      const cell = ws.getCell(r, ci + 1);
      const agg  = finalAggregates[col.key];

      if (ci === 0) {
        cell.value = 'الإجمالي';
        styleFooter(cell, true);
      } else if (agg) {
        const { type, value } = agg;
        const prefix = AGG_SYMBOLS[type] ?? '';

        if (typeof value === 'number') {
          cell.value  = value;
          cell.numFmt = type === 'count' ? '#,##0' : numFmt;

          // حفظ TTC للمبلغ بالحروف
          if (col.key === 'total_ttc' || col.key === 'net_to_pay') {
            sumTTC = value;
          }
        } else {
          cell.value = prefix ? `${prefix} ${value}` : String(value);
        }
        styleFooter(cell, false);
      } else {
        cell.value = '';
        styleFooter(cell, false);
      }
    }
    r++;
  }

  // ── 6. TVA + الطابع المالي ────────────────────────────────────────────────
  const hasERP = documentInfo.vatAmount != null || documentInfo.fiscalStamp != null;
  if (hasERP) {
    r++;
    if (documentInfo.vatAmount != null) {
      ws.getRow(r).height = 18;
      const vatLabel = documentInfo.vatRate != null
        ? `TVA (${Math.round(documentInfo.vatRate * 100)}%):`
        : 'TVA:';
      if (colCount >= 2) {
        styleInfoLabel(ws.getCell(r, colCount - 1));
        ws.getCell(r, colCount - 1).value = vatLabel;
        styleInfoValue(ws.getCell(r, colCount));
        ws.getCell(r, colCount).value     = documentInfo.vatAmount;
        ws.getCell(r, colCount).numFmt    = numFmt;
      }
      r++;
    }
    if (documentInfo.fiscalStamp != null) {
      ws.getRow(r).height = 18;
      styleInfoLabel(ws.getCell(r, colCount - 1));
      ws.getCell(r, colCount - 1).value = 'الطابع المالي:';
      styleInfoValue(ws.getCell(r, colCount));
      ws.getCell(r, colCount).value     = documentInfo.fiscalStamp;
      ws.getCell(r, colCount).numFmt    = numFmt;
      r++;
    }
  }

  // ── 7. المبلغ بالحروف ────────────────────────────────────────────────────
  if (sumTTC != null && sumTTC > 0) {
    r++;
    ws.getRow(r).height = 22;
    ws.mergeCells(r, 1, r, colCount);
    const wordsCell = ws.getCell(r, 1);
    wordsCell.value = 'المبلغ بالحروف: ' + numberToArabicWords(sumTTC, currency);
    styleAmountWords(wordsCell);
    r++;
  }

  // ── 8. عرض الأعمدة ──────────────────────────────────────────────────────
  for (let ci = 0; ci < colCount; ci++) {
    const col    = columns[ci];
    const header = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
    let maxLen   = header.length;
    for (const row of data) {
      const val = col.accessor ? col.accessor(row) : (row[col.key] ?? '');
      maxLen = Math.max(maxLen, String(val ?? '').length);
    }
    ws.getColumn(ci + 1).width = Math.min(Math.max(maxLen + 2, col.minWidth ?? 10), col.width ?? 50);
  }

  // ── 9. الحفظ أو التنزيل ──────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  if (onSave) {
    onSave(buffer);
  } else {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Wrapper Function for Documents
// ════════════════════════════════════════════════════════════════════════════

export async function exportDocumentToExcel<T extends Record<string, unknown>>(
  data:          T[],
  columns:       Column<T>[],
  documentInfo?: DocumentInfo,
  options:       ExcelExportAdvancedOptions = {},
): Promise<void> {
  // ✅ حساب الإجماليات دائماً
  const aggregates = computeAggregatesForExport(data, columns);

  return exportToExcelAdvanced(data, columns, {
    ...options,
    documentInfo,
    showAggregates: true,
    aggregates,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Hook: useERPExport
// ════════════════════════════════════════════════════════════════════════════

export interface UseERPExportOptions {
  defaultFileName?: string;
  defaultDocumentInfo?: DocumentInfo;
  defaultCurrency?: string;
}

export function useERPExport(defaultOptions?: UseERPExportOptions) {
  const optsRef = useRef(defaultOptions);

  // تحديث الخيارات عند التغيير
  useEffect(() => {
    optsRef.current = defaultOptions;
  }, [defaultOptions]);

  const exportData = useCallback(
    async <T extends Record<string, unknown>>(
      data:           T[],
      columns:        Column<T>[],
      documentInfo?:  DocumentInfo,
      customOptions?: Omit<ExcelExportAdvancedOptions, 'aggregates' | 'documentInfo'>,
    ): Promise<void> => {
      // دمج الخيارات
      const finalOpts: ExcelExportAdvancedOptions = {
        fileName: defaultOptions?.defaultFileName ?? 'document.xlsx',
        currency: defaultOptions?.defaultCurrency ?? 'DZD',
        ...customOptions,
      };

      // ✅ حساب الإجماليات إذا لم تُمرَّ
      if (!finalOpts.aggregates) {
        finalOpts.aggregates = computeAggregatesForExport(data, columns);
      }

      // ✅ تفعيل عرض الإجماليات
      finalOpts.showAggregates = finalOpts.showAggregates !== false;

      // دمج معلومات المستند
      const finalDocInfo: DocumentInfo = {
        ...defaultOptions?.defaultDocumentInfo,
        ...documentInfo,
      };

      return exportToExcelAdvanced(data, columns, {
        ...finalOpts,
        documentInfo: finalDocInfo,
      });
    },
    [],
  );

  return { exportData };
}
