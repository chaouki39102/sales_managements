// DataTable/hooks/useContextMenu.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ContextMenuItem, ContextMenuContext, ContextMenuState } from '../types';

// ─── useContextMenu (قائمة السياق) ──────────────────────────────────────────

export function useContextMenu<T = Record<string, unknown>>(
  _menuItems: (context: ContextMenuContext) => ContextMenuItem[],
  containerRef: React.RefObject<HTMLElement>,
  // ✅ إصلاح: data مطلوبة لملء context.row الذي كان فارغاً دائماً
  data: T[] = [],
  selectedKeys?: ReadonlySet<string | number>,
) {
  const [state, setState] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, context: null });

  // نحفظ data في ref لتجنب إعادة تسجيل الـ event listener عند كل تغيير
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // نستخدم DOM MouseEvent مباشرةً لأن الـ listener مسجَّل عبر addEventListener
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    let context: ContextMenuContext | null = null;

    const cellEl = target.closest('.dt-td') as HTMLElement | null;
    const rowEl  = target.closest('.dt-row') as HTMLElement | null;
    const thEl   = target.closest('th')     as HTMLElement | null;

    // نحوّل DOM MouseEvent إلى React.MouseEvent للتوافق مع النوع
    const reactEvent = e as unknown as React.MouseEvent;

    if (cellEl) {
      const rowIndexStr = cellEl.getAttribute('data-row-index');
      const colKey      = cellEl.getAttribute('data-col-key');
      if (rowIndexStr !== null && colKey) {
        const rowIndex = parseInt(rowIndexStr, 10);
        // ✅ نملأ row data فعلياً من مصفوفة data
        const row = (dataRef.current[rowIndex] ?? null) as Record<string, unknown> | undefined;
        context = { type: 'cell', rowIndex, colKey, row, selectedKeys, originalEvent: reactEvent };
      }
    } else if (rowEl) {
      const rowIndexStr = rowEl.getAttribute('data-row-index');
      if (rowIndexStr !== null) {
        const rowIndex = parseInt(rowIndexStr, 10);
        const row = (dataRef.current[rowIndex] ?? null) as Record<string, unknown> | undefined;
        context = { type: 'row', rowIndex, row, selectedKeys, originalEvent: reactEvent };
      }
    } else if (thEl) {
      const colKey = thEl.getAttribute('data-col-key');
      if (colKey) {
        context = { type: 'header', colKey, selectedKeys, originalEvent: reactEvent };
      }
    }

    if (!context) return;
    setState({ visible: true, x: e.clientX, y: e.clientY, context });
  }, []);

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  // ref لضمان قراءة أحدث قيمة لـ closeMenu بدون إعادة تسجيل
  const closeMenuRef = useRef(closeMenu);
  useEffect(() => { closeMenuRef.current = closeMenu; }, [closeMenu]);

  useEffect(() => {
    const handler = () => closeMenuRef.current();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [containerRef, handleContextMenu]);

  return { menuState: state, closeMenu, setContext: setState };
}
