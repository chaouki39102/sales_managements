// ════════════════════════════════════════════════════════════════════════════
// DataTable/hooks.ts  —  v8.2
// إصلاح useClickOutside: استخدام ref للـ callback لتجنب إعادة تسجيل الـ listener
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { MIN_COL_WIDTH } from './types';

// ─── useClickOutside (مُحسَّن) ───────────────────────────────────────────────

export function useClickOutside(
  ref:       React.RefObject<HTMLElement>,
  anchorRef: React.RefObject<HTMLElement>,
  onClose:   () => void,
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current     && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onCloseRef.current();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, anchorRef]);
}

// ─── useColumnResize (بدون تغيير) ───────────────────────────────────────────

export function useColumnResize(initialWidths: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const startResize = useCallback((key: string, currentW: number, e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { key, startX: e.clientX, startW: currentW };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { key, startX, startW } = drag.current;
      const delta = startX - e.clientX;
      setWidths(p => ({ ...p, [key]: Math.max(MIN_COL_WIDTH, startW + delta) }));
    };
    const onUp = () => { drag.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const resetWidth = useCallback((key: string) => {
    setWidths(p => { const n = { ...p }; delete n[key]; return n; });
  }, []);

  return { widths, startResize, resetWidth };
}

// ─── useEscapeKey ────────────────────────────────────────────────────────────

export function useEscapeKey(onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

// ─── useDebounce (بدون تغيير) ────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── useIsMobile (بدون تغيير) ────────────────────────────────────────────────

export function useIsMobile(breakpoint = 639): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}
