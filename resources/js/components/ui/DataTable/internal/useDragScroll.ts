// DataTable/internal/useDragScroll.ts — desktop drag-to-scroll
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useCallback, useRef } from 'react';
import type { NavigationAndClipboardState } from './useNavigationAndClipboard';

type Params<T> =
  Pick<NavigationAndClipboardState<T>, 'tableWrapRef'>;

export function useDragScroll<T>(p: Params<T>) {
  const { tableWrapRef } = p;

  // ── Drag scroll (desktop) ─────────────────────────────────────────────────
  const dragState = useRef<{ startX: number; scrollLeft: number } | null>(null);

  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button, input, select, a, label, [role="button"], [draggable]',
        )
      )
        return;
      const el = tableWrapRef.current;
      if (!el) return;
      dragState.current = {
        startX: e.pageX - el.getBoundingClientRect().left,
        scrollLeft: el.scrollLeft,
      };
      el.classList.add('dt-dragging');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
    [],
  );

  const handleDragMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      e.preventDefault();
      const el = tableWrapRef.current;
      if (!el) return;
      const x = e.pageX - el.getBoundingClientRect().left;
      const walk = (x - dragState.current.startX) * 1.3;
      el.scrollLeft = dragState.current.scrollLeft - walk;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
    [],
  );

  const handleDragEnd = useCallback(() => {
    if (!dragState.current) return;
    dragState.current = null;
    tableWrapRef.current?.classList.remove('dt-dragging');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  }, []);

  return { handleDragMouseDown, handleDragMouseMove, handleDragEnd };
}

export type DragScrollState<T> = ReturnType<typeof useDragScroll<T>>;
