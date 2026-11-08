// DataTable/hooks/useColumnDragReorder.ts

import { useState, useEffect, useCallback, useRef } from 'react';

export function useColumnDragReorder(
  initialOrder: string[],
  onOrderChange?: (order: string[]) => void,
) {
  const [columnOrder, setColumnOrder] = useState<string[]>(initialOrder);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const draggingKey = useRef<string | null>(null);
  // ✅ إصلاح: useRef للمقارنة العميقة بدلاً من JSON.stringify في dependency array
  const initialOrderRef = useRef<string[]>(initialOrder);
  useEffect(() => {
    const prev = initialOrderRef.current;
    const hasChanged =
      prev.length !== initialOrder.length ||
      prev.some((k, i) => k !== initialOrder[i]);
    if (!hasChanged) return;
    initialOrderRef.current = initialOrder;
    setColumnOrder(current => {
      const existing = new Set(current);
      const newKeys = initialOrder.filter(k => !existing.has(k));
      const removed = new Set(initialOrder);
      const filtered = current.filter(k => removed.has(k));
      return [...filtered, ...newKeys];
    });
  }, [initialOrder]);
  const onDragStart = useCallback((key: string, e: React.DragEvent) => {
    draggingKey.current = key;
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.textContent = key;
    ghost.style.cssText = 'position:fixed;top:-99px;left:-99px;background:var(--em,#0a8a5c);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }, []);
  const onDragOver = useCallback((key: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (key !== draggingKey.current) setDragOverKey(key);
  }, []);
  const onDrop = useCallback((targetKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const from = draggingKey.current;
    if (!from || from === targetKey) { setDragOverKey(null); return; }
    setColumnOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(targetKey);
      if (fi < 0 || ti < 0) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      onOrderChange?.(next);
      return next;
    });
    setDragOverKey(null);
  }, [onOrderChange]);
  const onDragEnd = useCallback(() => {
    draggingKey.current = null;
    setDragOverKey(null);
  }, []);
  return {
    columnOrder, setColumnOrder, dragOverKey,
    dragHandlers: { onDragStart, onDragOver, onDrop, onDragEnd },
  };
}
