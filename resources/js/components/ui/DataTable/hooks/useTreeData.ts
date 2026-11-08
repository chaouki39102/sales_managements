// DataTable/hooks/useTreeData.ts

import { useState, useEffect, useCallback, useMemo } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// ─── useTreeData — بيانات هرمية (مخطط الحسابات، فئات المنتجات...) ─────────
//
// يبني الشجرة من flat array بـ idKey/parentKey
// يُخرج الصفوف المطوية من DOM فعلياً
// يدعم indentPx لكل مستوى
// ════════════════════════════════════════════════════════════════════════════

export interface TreeConfig {
  idKey: string;
  parentKey: string;
  defaultCollapsed?: boolean;
  indentPx?: number;
}

export interface TreeRow<T> {
  row: T;
  level: number;
  hasChildren: boolean;
  collapsed: boolean;
  id: string | number;
  parentId: string | number | null;
}

export function useTreeData<T>(
  data: T[],
  config: TreeConfig | undefined
): {
  treeRows: TreeRow<T>[];
  toggleTreeNode: (id: string | number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isTreeMode: boolean;
} {
  const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());

  // بناء الشجرة الأولية
  const tree = useMemo(() => {
    if (!config) return null;

    const { idKey, parentKey, defaultCollapsed: _defaultCollapsed = false } = config;

    // فهرسة البيانات
    const byId = new Map<string | number, T>();
    const childrenOf = new Map<string | number | null, (string | number)[]>();

    for (const row of data) {
      const id = (row as Record<string, unknown>)[idKey] as string | number;
      const pid = (row as Record<string, unknown>)[parentKey] as string | number | null;
      byId.set(id, row);
      const list = childrenOf.get(pid) ?? [];
      list.push(id);
      childrenOf.set(pid, list);
    }

    // جمع IDs التي لها أبناء
    const parentIds = new Set<string | number>();
    for (const [pid, children] of childrenOf.entries()) {
      if (pid !== null && pid !== undefined && children.length > 0) {
        parentIds.add(pid);
      }
    }

    return { byId, childrenOf, parentIds };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, config?.idKey, config?.parentKey, config?.defaultCollapsed]);

  // ✅ إصلاح خطأ حرج: نقل setCollapsed من useMemo إلى useEffect
  // useMemo يجب أن يكون pure — أي side effect فيه ينتهك قواعد React
  // ويمكن أن يسبب تحديثات غير متوقعة أو حلقات لا نهائية في Strict Mode
  const treeParentIds = tree?.parentIds;
  const defaultCollapsedFlag = config?.defaultCollapsed ?? false;
  useEffect(() => {
    if (!treeParentIds || !defaultCollapsedFlag) return;
    setCollapsed(new Set(treeParentIds));
  }, [treeParentIds, defaultCollapsedFlag]);

  // Flatten الشجرة مع مراعاة الـ collapsed
  const treeRows = useMemo<TreeRow<T>[]>(() => {
    if (!config || !tree) return [];

    const { idKey: _idKey, parentKey: _parentKey } = config;
    const { byId, childrenOf, parentIds } = tree;

    const result: TreeRow<T>[] = [];

    const walk = (parentId: string | number | null, level: number) => {
      const children = childrenOf.get(parentId) ?? [];
      for (const id of children) {
        const row = byId.get(id);
        if (!row) continue;
        const hasChildren = parentIds.has(id);
        const isCollapsed = collapsed.has(id);
        result.push({ row, level, hasChildren, collapsed: isCollapsed, id, parentId });
        if (hasChildren && !isCollapsed) {
          walk(id, level + 1);
        }
      }
    };

    walk(null, 0);
    return result;
  }, [tree, collapsed, config]);

  const toggleTreeNode = useCallback((id: string | number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const collapseAll = useCallback(() => {
    if (!tree) return;
    setCollapsed(new Set(tree.parentIds));
  }, [tree]);

  return {
    treeRows,
    toggleTreeNode,
    expandAll,
    collapseAll,
    isTreeMode: !!config,
  };
}
