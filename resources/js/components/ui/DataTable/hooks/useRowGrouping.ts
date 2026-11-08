// DataTable/hooks/useRowGrouping.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RowGroupConfig, RowGroup, Column } from '../types';
import { getRawValue } from '../utils';

export function useRowGrouping<T>(
  data: T[],
  config: RowGroupConfig | undefined,
  columns: Column<T>[],
): {
  groups: RowGroup<T>[] | null;
  toggleGroup: (value: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  collapsedGroups: Set<string>;
  groupSubTotals: Record<string, Record<string, unknown>>;
} {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!config) { setCollapsedGroups(new Set()); return; }
    if (config.defaultCollapsed) {
      const col = columns.find(c => c.key === config.key);
      if (!col) return;
      const values = [...new Set(data.map(r => String(getRawValue(r, col) ?? '')))];
      setCollapsedGroups(new Set(values));
    } else {
      setCollapsedGroups(new Set());
    }
  }, [config?.key]);
  const groups = useMemo((): RowGroup<T>[] | null => {
    if (!config) return null;
    const col = columns.find(c => c.key === config.key);
    if (!col) return null;
    const groupMap = new Map<string, T[]>();
    data.forEach(row => {
      const val = String(getRawValue(row, col) ?? '');
      if (!groupMap.has(val)) groupMap.set(val, []);
      groupMap.get(val)!.push(row);
    });
    const entries = [...groupMap.entries()];
    if (config.sortGroups === 'asc') entries.sort(([a], [b]) => a.localeCompare(b, 'ar-DZ'));
    if (config.sortGroups === 'desc') entries.sort(([a], [b]) => b.localeCompare(a, 'ar-DZ'));
    // ✅ إصلاح: الصفوف المطوية تُحذف من الـ render فعلياً (تُخرج من DOM)
    // rowCount يحفظ العدد الحقيقي للعرض في group header
    return entries.map(([value, allRows]) => {
      const collapsed = collapsedGroups.has(value);
      return {
        value,
        label: value || '(فارغ)',
        rows: collapsed ? [] : allRows,   // ← DOM cleanup للمجموعات المطوية
        rowCount: allRows.length,          // ← العدد الحقيقي دائماً
        collapsed,
      };
    });
  }, [data, config, columns, collapsedGroups]);

  // ✅ حساب Sub-totals للمجموعات (يعمل فقط عند showSubTotals: true)
  const { computeAggregate: _computeAgg } = (() => {
    // استيراد lazy لتجنب circular dependency
    const computeAggregate = (rows: T[], col: Column<T>, type: import('../types').AggregateType): number | null => {
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
    };
    return { computeAggregate };
  })();

  const groupSubTotals = useMemo(() => {
    if (!config?.showSubTotals || !groups) return {} as Record<string, Record<string, unknown>>;
    const aggCols = columns.filter(c => c.aggregate);
    if (!aggCols.length) return {} as Record<string, Record<string, unknown>>;
    // نحتاج البيانات الكاملة (قبل الطي) — نُعيد تجميعها
    const col = columns.find(c => c.key === config.key);
    if (!col) return {} as Record<string, Record<string, unknown>>;
    const fullGroupMap = new Map<string, T[]>();
    data.forEach(row => {
      const val = String(getRawValue(row, col) ?? '');
      if (!fullGroupMap.has(val)) fullGroupMap.set(val, []);
      fullGroupMap.get(val)!.push(row);
    });
    return Object.fromEntries(
      [...fullGroupMap.entries()].map(([value, rows]) => [
        value,
        Object.fromEntries(
          aggCols.map(c => {
            const type = typeof c.aggregate === 'string' ? c.aggregate : 'sum';
            const val = typeof c.aggregate === 'function'
              ? c.aggregate(rows)
              : _computeAgg(rows, c, type as import('../types').AggregateType);
            return [c.key, { value: val, type }];
          })
        ),
      ])
    );
  }, [groups, columns, config?.showSubTotals, data, config?.key, _computeAgg]);

  const toggleGroup = useCallback((value: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }, []);
  const expandAll = useCallback(() => setCollapsedGroups(new Set()), []);
  const collapseAll = useCallback(() => {
    if (!groups) return;
    setCollapsedGroups(new Set(groups.map(g => String(g.value))));
  }, [groups]);
  return { groups, toggleGroup, expandAll, collapseAll, collapsedGroups, groupSubTotals };
}
