// DataTable/utils.ts  —  v10.0 (كامل مع جميع الدوال)

import type {
  Column, SortState, MultiSortState, FilterMap, AggregateType, RangeFilter,
  ConditionalFormat, ExcelExportOptions,
} from './types';

// ════════════════════════════════════════════════════════════════════════════
// دوال أساسية (موجودة سابقاً)
// ════════════════════════════════════════════════════════════════════════════

export function getRawValue<T>(row: T, col: Column<T>): unknown {
  if (col.accessor) return col.accessor(row);
  if (col.key.includes('.')) {
    const parts = col.key.split('.');
    let val: unknown = row;
    for (const part of parts) {
      if (val == null || typeof val !== 'object') return undefined;
      val = (val as Record<string, unknown>)[part];
    }
    return val;
  }
  return (row as Record<string, unknown>)[col.key];
}

export function getStringValue<T>(row: T, col: Column<T>): string {
  const v = getRawValue(row, col);
  return v == null ? '' : String(v).toLowerCase();
}

export function encodeRange(min: string, max: string): string {
  return `${min}|${max}`;
}

export function decodeRange(val: string): RangeFilter {
  const idx = val.indexOf('|');
  if (idx === -1) return { min: val, max: '' };
  return { min: val.slice(0, idx), max: val.slice(idx + 1) };
}

function compareDates(d1Str: string, d2Str: string, op: 'lt' | 'gt'): boolean {
  if (!d1Str || !d2Str) return true;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return op === 'lt' ? d1 < d2 : d1 > d2;
}

// ─── تحليل قيمة فلتر SmartFilter (operator:value) ──────────────────────────
//
// SmartFilter يُنتج قيماً بصيغة "gt:30" أو "contains:أحمد" أو "30|60" (range)
// هذه الدالة تُحوّلها لمقارنة رقمية/نصية صحيحة.
// إذا لم تكن بصيغة operator:value → تُعامَل كفلتر نصي عادي.
//
function applySmartOperator(rv: string, rawVal: string): boolean {
  const colonIdx = rawVal.indexOf(':');
  if (colonIdx === -1) return rv.includes(rawVal.toLowerCase());

  const op  = rawVal.slice(0, colonIdx);
  const val = rawVal.slice(colonIdx + 1);

  switch (op) {
    case 'eq':       return rv === val.toLowerCase();
    case 'neq':      return rv !== val.toLowerCase();
    case 'contains': return rv.includes(val.toLowerCase());
    case 'starts':   return rv.startsWith(val.toLowerCase());
    case 'ends':     return rv.endsWith(val.toLowerCase());
    case 'gt':  { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n > v; }
    case 'gte': { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n >= v; }
    case 'lt':  { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n < v; }
    case 'lte': { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n <= v; }
    default:         return rv.includes(rawVal.toLowerCase());
  }
}

export function applyClientFilter<T>(data: T[], filters: FilterMap, columns: Column<T>[]): T[] {
  const active = Object.entries(filters).filter(([, v]) => v !== '');
  if (!active.length) return data;

  return data.filter(row =>
    active.every(([key, rawVal]) => {
      // ── فلاتر SmartFilter بدون عمود مطابق (مثل 'overdue_days', 'party.name')
      // نبحث عن العمود أولاً وإذا لم نجده نطبق البحث على الحقل المباشر
      const col = columns.find(c => c.key === key);

      // إذا لا يوجد عمود → محاولة dot-notation على الكائن مباشرة
      if (!col) {
        const parts = key.split('.');
        let val: unknown = row;
        for (const part of parts) {
          if (val == null || typeof val !== 'object') { val = undefined; break; }
          val = (val as Record<string, unknown>)[part];
        }
        const rv = val == null ? '' : String(val).toLowerCase();
        return applySmartOperator(rv, rawVal);
      }

      const { type } = col.filter ?? { type: 'text' };
      const rv = getStringValue(row, col);

      if (type === 'select') return rv === rawVal.toLowerCase();
      if (type === 'multiselect' || type === 'dynamic-multiselect') {
        const selected = rawVal.split(',').filter(Boolean).map(s => s.toLowerCase());
        return !selected.length || selected.includes(rv);
      }
      if (type === 'number') {
        // range عادي (min|max)
        if (rawVal.includes('|') && !rawVal.includes(':')) {
          const { min, max } = decodeRange(rawVal);
          const numRv = parseFloat(rv);
          if (min && !isNaN(parseFloat(min)) && numRv < parseFloat(min)) return false;
          if (max && !isNaN(parseFloat(max)) && numRv > parseFloat(max)) return false;
          return true;
        }
        // SmartFilter operator
        return applySmartOperator(rv, rawVal);
      }
      if (type === 'date') {
        // ✅ إصلاح: استبعاد الصف خارج النطاق فقط — الصف يبقى إذا كان ضمن [min, max]
        const { min, max } = decodeRange(rawVal);
        if (min && compareDates(rv, min, 'lt')) return false;
        if (max && compareDates(rv, max, 'gt')) return false;
        return true;
      }
      // text / fallback — يدعم SmartFilter operators أيضاً
      return applySmartOperator(rv, rawVal);
    }),
  );
}

export function applyGlobalSearch<T>(data: T[], query: string, columns: Column<T>[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const cols = columns.filter(c => c.searchable !== false);
  return data.filter(row => cols.some(col => String(getRawValue(row, col) ?? '').toLowerCase().includes(q)));
}

export function applyClientSort<T>(data: T[], sort: SortState, columns: Column<T>[]): T[] {
  if (!sort.key || !sort.dir) return data;
  const col = columns.find(c => c.key === sort.key);
  if (!col) return data;
  return [...data].sort((a, b) => {
    const va = getRawValue(a, col);
    const vb = getRawValue(b, col);
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
    return sort.dir === 'desc' ? -cmp : cmp;
  });
}

export function applyMultiSort<T>(data: T[], sorts: MultiSortState, columns: Column<T>[]): T[] {
  if (!sorts.length) return data;
  const colMap = new Map(columns.map(c => [c.key, c]));
  return [...data].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const col = colMap.get(key);
      if (!col) continue;
      const va = getRawValue(a, col);
      const vb = getRawValue(b, col);
      let cmp: number;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

export function applyConditionalFormat<T>(
  value: unknown,
  row: T,
  colKey: string,
  formats: ConditionalFormat<T>[],
): { style: React.CSSProperties; className: string } {
  let style: React.CSSProperties = {};
  const classes: string[] = [];
  for (const fmt of formats) {
    if (fmt.colKey !== '*' && fmt.colKey !== colKey) continue;
    if (fmt.condition(value, row)) {
      style = { ...style, ...fmt.style };
      if (fmt.className) classes.push(fmt.className);
    }
  }
  return { style, className: classes.join(' ') };
}

export function computeAggregate<T>(rows: T[], col: Column<T>, type: AggregateType): number | null {
  const nums = rows
    .map(r => { const v = getRawValue(r, col); return typeof v === 'number' ? v : parseFloat(String(v ?? '')); })
    .filter(n => !isNaN(n));
  if (!nums.length) return null;
  switch (type) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'count': return nums.length;
  }
}

export function exportToCSV<T>(data: T[], columns: Column<T>[], name: string): void {
  const cols = columns.filter(c => typeof (c.exportHeader ?? c.header) === 'string');
  const hdr = cols.map(c => `"${(c.exportHeader ?? c.header as string)}"`).join(',');
  const rows = data.map(r =>
    cols.map(c => `"${String(getRawValue(r, c) ?? '').replace(/"/g, '""')}"`).join(','),
  );
  const blob = new Blob(['\ufeff' + [hdr, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function buildPageNumbers(cur: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  let s = Math.max(2, cur - 1);
  let e = Math.min(last - 1, cur + 1);
  if (cur <= 3) { s = 2; e = 4; }
  if (cur >= last - 2) { s = last - 3; e = last - 1; }
  if (s > 2) pages.push('…');
  for (let p = s; p <= e; p++) pages.push(p);
  if (e < last - 1) pages.push('…');
  if (last !== 1 && pages[pages.length - 1] !== last) pages.push(last);
  return pages;
}

export function getTextAlign(align?: Column['align']): React.CSSProperties['textAlign'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'left';
  return 'right';
}

// ─── formatDateShort ─────────────────────────────────────────────────────────
//
// تحويل أي صيغة تاريخ إلى YYYY-MM-DD للعرض والتصدير
//
// "2026-06-07T23:00:00.000000Z"  →  "2026-06-07"
// "2026-06-07 14:30:00"          →  "2026-06-07"
// null / undefined               →  ""
//
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
// 🆕 دوال جديدة للميزات
// ════════════════════════════════════════════════════════════════════════════

// ─── Excel Export حقيقي (يتطلب xlsx) ─────────────────────────────────────────

// ─── Excel Export — يستخدم excelExportAdvanced (exceljs) مع fallback لـ CSV ───
//
// المسار المفضل: exportToExcelAdvanced من excelExportAdvanced.ts
// هذه الدالة تبقى للـ backward compatibility مع DataTable الداخلي
// (زر Excel في export menu)
//
export async function exportToExcel<T>(
  data:    T[],
  columns: Column<T>[],
  options: ExcelExportOptions & {
    documentInfo?:     import('./types').DocumentInfo;
    includeAggregates?: boolean;
    aggregates?:        Record<string, { type: AggregateType; value: number | string }>;
    // خيارات advanced إضافية
    orientation?:      'landscape' | 'portrait';
    sheetName?:        string;
    onSave?:           (buffer: ArrayBuffer) => void;
  } = {},
): Promise<void> {
  const {
    fileName = 'export', title, documentInfo,
    includeAggregates, aggregates: passedAggregates,
    orientation, sheetName, onSave,
  } = options;

  try {
    // استيراد dynamic لتجنب تحميل exceljs عند عدم الحاجة
    const { exportToExcelAdvanced, computeAggregatesForExport } =
      await import('./excelExportAdvanced');

    // ✅ إذا مُرِّرت aggregates جاهزة من DataTable نستخدمها مباشرة
    // وإلا نحسبها من columns.aggregate (fallback)
    const aggregates = passedAggregates && Object.keys(passedAggregates).length > 0
      ? passedAggregates
      : includeAggregates
        ? computeAggregatesForExport(data as Record<string, unknown>[], columns as Column[])
        : {};

    await exportToExcelAdvanced(
      data as Record<string, unknown>[],
      columns as Column[],
      {
        fileName,
        title:          title ?? fileName,
        documentInfo:   documentInfo ?? {},
        // ✅ showAggregates يتبع includeAggregates أو وجود aggregates جاهزة
        showAggregates: includeAggregates ?? Object.keys(aggregates).length > 0,
        aggregates,
        orientation,
        sheetName,
        onSave,
      },
    );
  } catch (_error) {
    // Fallback: CSV مع إشعار المستخدم
    console.warn(
      'DataTable: مكتبة exceljs غير متوفرة — جارٍ التصدير بصيغة CSV.\n' +
      'لتفعيل تصدير Excel الاحترافي: npm install exceljs',
    );

    const msg = document.createElement('div');
    msg.setAttribute('role', 'alert');
    msg.style.cssText = [
      'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1a1a2e', 'color:#fff', 'padding:10px 20px',
      'border-radius:8px', 'font-size:13px', 'z-index:99999',
      'box-shadow:0 4px 12px rgba(0,0,0,.3)', 'direction:rtl',
    ].join(';');
    msg.textContent = '⚠️ مكتبة exceljs غير مثبتة — تم التصدير بصيغة CSV';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);

    exportToCSV(data, columns, fileName);
  }
}

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportToJSON<T>(
  data: T[],
  columns: Column<T>[],
  options: ExcelExportOptions = {},
): void {
  const { fileName = 'export', includeHiddenColumns = false } = options;
  const visibleCols = columns.filter(c => !c.defaultHidden || includeHiddenColumns);

  const rows = data.map(row => {
    const obj: Record<string, unknown> = {};
    for (const col of visibleCols) {
      const key = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
      obj[key] = getRawValue(row, col) ?? '';
    }
    return obj;
  });

  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Print Export (نافذة طباعة مُنسَّقة) ────────────────────────────────────

export function exportToPrint<T>(
  data: T[],
  columns: Column<T>[],
  options: ExcelExportOptions = {},
): void {
  const { fileName = 'تقرير', title, includeHiddenColumns = false } = options;
  const visibleCols = columns.filter(c => !c.defaultHidden || includeHiddenColumns);
  const headers = visibleCols.map(c => c.exportHeader ?? (typeof c.header === 'string' ? c.header : c.key));

  const rows = data.map(row =>
    visibleCols.map(col => {
      const v = getRawValue(row, col);
      return v == null ? '' : String(v);
    }),
  );

  const tableRows = rows.map(r =>
    `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`,
  ).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${title ?? fileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #111; direction: rtl; padding: 16px; }
    h2 { font-size: 14px; margin-bottom: 12px; color: #222; border-bottom: 2px solid #333; padding-bottom: 6px; }
    .meta { font-size: 10px; color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a1a2e; color: #fff; padding: 6px 8px; text-align: right; font-size: 10px; font-weight: 700; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9f9f9; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  ${title ? `<h2>${title}</h2>` : ''}
  <div class="meta">
    عدد السجلات: ${data.length} &nbsp;|&nbsp;
    تاريخ الطباعة: ${new Date().toLocaleDateString('ar-DZ')}
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  try {
    const win = window.open('', '_blank');
    if (!win) {
      // Popup blocker: fallback — فتح في نافذة جديدة عبر data URL
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try { win.print(); } catch { /* المستخدم أغلق النافذة قبل الطباعة */ }
    }, 300);
  } catch (err) {
    console.warn('[DataTable] exportToPrint: فشل فتح نافذة الطباعة', err);
  }
}

// ─── Paste from Excel (TSV/CSV parsing) ──────────────────────────────────────

export function parseTSV(plainText: string): string[][] {
  const lines = plainText.split(/\r?\n/);
  const result: string[][] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    let cells: string[] = [];
    if (line.includes('\t')) {
      cells = line.split('\t');
    } else {
      const regex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        cells.push(match[1] ? match[1].replace(/""/g, '"') : (match[2] || ''));
      }
    }
    result.push(cells);
  }
  return result;
}
