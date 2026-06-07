// ════════════════════════════════════════════════════════════════════════════
// DataTable/utils.ts  —  v10.0
//
// ✅ كل دوال v9 بدون تغيير
// 🆕 applyConditionalFormat  — تطبيق التنسيق الشرطي على خلية
// ════════════════════════════════════════════════════════════════════════════

import type {
  Column, SortState, MultiSortState, FilterMap, AggregateType, RangeFilter,
  ConditionalFormat,
} from './types';

// ─── Raw value extraction ─────────────────────────────────────────────────────

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

// ─── Range encode/decode ─────────────────────────────────────────────────────

export function encodeRange(min: string, max: string): string { return `${min}|${max}`; }

export function decodeRange(val: string): RangeFilter {
  const idx = val.indexOf('|');
  if (idx === -1) return { min: val, max: '' };
  return { min: val.slice(0, idx), max: val.slice(idx + 1) };
}

// ─── Date comparison ─────────────────────────────────────────────────────────

function compareDates(d1Str: string, d2Str: string, op: 'lt' | 'gt'): boolean {
  if (!d1Str || !d2Str) return true;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return op === 'lt' ? d1 < d2 : d1 > d2;
}

// ─── Client-side filter ───────────────────────────────────────────────────────

export function applyClientFilter<T>(data: T[], filters: FilterMap, columns: Column<T>[]): T[] {
  const active = Object.entries(filters).filter(([, v]) => v !== '');
  if (!active.length) return data;
  return data.filter(row =>
    active.every(([key, rawVal]) => {
      const col = columns.find(c => c.key === key);
      if (!col?.filter) return true;
      const { type } = col.filter;
      const rv = getStringValue(row, col);
      if (type === 'select') return rv === rawVal.toLowerCase();
      if (type === 'multiselect' || type === 'dynamic-multiselect') {
        const selected = rawVal.split(',').filter(Boolean);
        return !selected.length || selected.includes(rv);
      }
      if (type === 'number') {
        const { min, max } = decodeRange(rawVal);
        const numRv = parseFloat(rv);
        if (min && !isNaN(parseFloat(min)) && numRv < parseFloat(min)) return false;
        if (max && !isNaN(parseFloat(max)) && numRv > parseFloat(max)) return false;
        return true;
      }
      if (type === 'date') {
        const { min, max } = decodeRange(rawVal);
        if (min && !compareDates(rv, min, 'lt')) return false;
        if (max && !compareDates(rv, max, 'gt')) return false;
        return true;
      }
      return rv.includes(rawVal.toLowerCase());
    }),
  );
}

// ─── Global search ────────────────────────────────────────────────────────────

export function applyGlobalSearch<T>(data: T[], query: string, columns: Column<T>[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const cols = columns.filter(c => c.searchable !== false);
  return data.filter(row => cols.some(col => String(getRawValue(row, col) ?? '').toLowerCase().includes(q)));
}

// ─── Client-side sort (v8 — عمود واحد) ───────────────────────────────────────

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

// ─── applyMultiSort (v9) ──────────────────────────────────────────────────────

export function applyMultiSort<T>(
  data:    T[],
  sorts:   MultiSortState,
  columns: Column<T>[],
): T[] {
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

// ─── 🆕 applyConditionalFormat (v10) ─────────────────────────────────────────
//
// يُطبّق التنسيق الشرطي على خلية ويُعيد { style, className } المناسبَين

export function applyConditionalFormat<T>(
  value:    unknown,
  row:      T,
  colKey:   string,
  formats:  ConditionalFormat<T>[],
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

// ─── Aggregate ────────────────────────────────────────────────────────────────

export function computeAggregate<T>(rows: T[], col: Column<T>, type: AggregateType): number | null {
  const nums = rows
    .map(r => { const v = getRawValue(r, col); return typeof v === 'number' ? v : parseFloat(String(v ?? '')); })
    .filter(n => !isNaN(n));
  if (!nums.length) return null;
  switch (type) {
    case 'sum':   return nums.reduce((a, b) => a + b, 0);
    case 'avg':   return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min':   return Math.min(...nums);
    case 'max':   return Math.max(...nums);
    case 'count': return nums.length;
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportToCSV<T>(data: T[], columns: Column<T>[], name: string): void {
  const cols = columns.filter(c => typeof (c.exportHeader ?? c.header) === 'string');
  const hdr  = cols.map(c => `"${(c.exportHeader ?? c.header as string)}"`).join(',');
  const rows = data.map(r =>
    cols.map(c => `"${String(getRawValue(r, c) ?? '').replace(/"/g, '""')}"`).join(','),
  );
  const blob = new Blob(['\ufeff' + [hdr, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── CSS alignment (RTL-aware) ────────────────────────────────────────────────

export function getTextAlign(align?: Column['align']): React.CSSProperties['textAlign'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'left';
  return 'right';
}

import type React from 'react';
