// DataTable/hooks/useColumnGroups.ts

import { useState, useCallback, useMemo } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// ─── useColumnGroups — رؤوس أعمدة متعددة المستويات (Column Groups) ─────────
//
// يدعم تجميع الأعمدة تحت header مشترك مع collapse/expand للمجموعة
// ════════════════════════════════════════════════════════════════════════════

export interface ColumnGroupDef {
  key: string;
  header: import('react').ReactNode;
  children: string[];   // مفاتيح الأعمدة المضمَّنة
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface ResolvedColumnGroup {
  group: ColumnGroupDef;
  collapsed: boolean;
  visibleChildren: string[];
  colspan: number;
}

export function useColumnGroups(
  groups: ColumnGroupDef[] | undefined,
  visibleColKeys: string[]
): {
  resolvedGroups: ResolvedColumnGroup[];
  toggleGroupCollapse: (key: string) => void;
  isGrouped: boolean;
} {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    if (!groups) return new Set();
    return new Set(
      groups.filter(g => g.defaultCollapsed && g.collapsible).map(g => g.key)
    );
  });

  const resolvedGroups = useMemo<ResolvedColumnGroup[]>(() => {
    if (!groups) return [];
    return groups.map(group => {
      const collapsed = group.collapsible ? collapsedGroups.has(group.key) : false;
      // إذا مطوية: فقط أول عمود يظهر كـ placeholder
      const visibleChildren = collapsed
        ? [group.children[0]].filter(Boolean)
        : group.children.filter(k => visibleColKeys.includes(k));
      return {
        group,
        collapsed,
        visibleChildren,
        colspan: visibleChildren.length,
      };
    });
  }, [groups, collapsedGroups, visibleColKeys]);

  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  return {
    resolvedGroups,
    toggleGroupCollapse,
    isGrouped: !!groups?.length,
  };
}
