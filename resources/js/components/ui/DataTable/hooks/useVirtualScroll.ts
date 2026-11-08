// DataTable/hooks/useVirtualScroll.ts

import { useState, useEffect, useRef } from 'react';
import { DEFAULT_ROW_HEIGHT, DEFAULT_CONTAINER_HEIGHT, DEFAULT_OVERSCAN } from '../types';

export function useVirtualScroll({
  rowCount,
  rowHeight = DEFAULT_ROW_HEIGHT,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}: {
  rowCount: number;
  rowHeight?: number;
  containerHeight?: number;
  overscan?: number;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);
  const totalHeight = rowCount * rowHeight;
  const rawStart = Math.floor(scrollTop / rowHeight);
  const start = Math.max(0, rawStart - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const end = Math.min(rowCount - 1, rawStart + visibleCount + overscan);
  const offsetY = start * rowHeight;
  return {
    scrollContainerRef, totalHeight, offsetY,
    visibleRange: { start, end },
    containerHeight, rowHeight,
  };
}
