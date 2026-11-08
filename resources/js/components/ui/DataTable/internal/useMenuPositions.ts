// DataTable/internal/useMenuPositions.ts — viewport-fixed positions for toolbar dropdown menus
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useCallback, useLayoutEffect } from 'react';
import type { ColumnVisibilityState } from './useColumnVisibilityState';
import type { SavedViewsState } from './useSavedViewsState';
import type { NavigationAndClipboardState } from './useNavigationAndClipboard';

type Params<T> =
  Pick<ColumnVisibilityState<T>, 'colMenuRef' | 'colMenuOpen' | 'exportMenuRef' | 'exportMenuOpen'>
  & Pick<SavedViewsState<T>, 'viewsMenuRef' | 'viewsMenuOpen'>
  & Pick<NavigationAndClipboardState<T>, 'toolbarRef'>;

export function useMenuPositions<T>(p: Params<T>) {
  const {
    colMenuRef, colMenuOpen, exportMenuRef, exportMenuOpen, viewsMenuRef, viewsMenuOpen,
    toolbarRef,
  } = p;

  // ── Dropdown position state (viewport-fixed for scrollable toolbar) ─────
  type MenuPos = { top: number; left: number; menuW: number } | null;
  const [viewsMenuPos, setViewsMenuPos]   = useState<MenuPos>(null);
  const [colMenuPos,   setColMenuPos]     = useState<MenuPos>(null);
  const [exportMenuPos, setExportMenuPos] = useState<MenuPos>(null);

  const computeMenuPos = useCallback((anchor: HTMLElement, menuW: number): MenuPos => {
    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    let left = rect.left;
    if (left + menuW > window.innerWidth - 8)  left = window.innerWidth - menuW - 8;
    if (left < 8) left = 8;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow >= 200 ? rect.bottom + 4 : Math.max(8, rect.top - 300 - 4);
    return { top, left, menuW };
  }, []);

  // ── Menu positioning: fixed viewport-anchored for scrollable toolbar ─────
  const bindMenuPos = useCallback((anchorRef: React.RefObject<HTMLElement | null>, open: boolean, menuW: number, setter: (p: MenuPos) => void) => {
    if (!open || !anchorRef.current) { setter(null); return; }
    const anchor = anchorRef.current;
    const update = () => { setter(computeMenuPos(anchor, menuW)); };
    update();
    const t = setTimeout(update, 16);
    const onMove = () => update();
    window.addEventListener('scroll',  onMove, true);
    window.addEventListener('resize', onMove);
    const tb = toolbarRef.current;
    tb?.addEventListener('scroll', onMove);
    return () => { clearTimeout(t); window.removeEventListener('scroll', onMove, true); window.removeEventListener('resize', onMove); tb?.removeEventListener('scroll', onMove); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  }, [computeMenuPos]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  useLayoutEffect(() => bindMenuPos(viewsMenuRef, viewsMenuOpen, 220, setViewsMenuPos), [viewsMenuOpen, bindMenuPos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  useLayoutEffect(() => bindMenuPos(colMenuRef,   colMenuOpen,   260, setColMenuPos),   [colMenuOpen,   bindMenuPos]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  useLayoutEffect(() => bindMenuPos(exportMenuRef, exportMenuOpen, 180, setExportMenuPos), [exportMenuOpen, bindMenuPos]);

  return { viewsMenuPos, colMenuPos, exportMenuPos };
}

export type MenuPositionsState<T> = ReturnType<typeof useMenuPositions<T>>;
