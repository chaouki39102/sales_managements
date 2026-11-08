// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosLayout.ts
//
// POSPage layout state: view / grid size (persisted to POS settings), mobile
// tab, fullscreen, and the drag-resizable cart panel width.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ViewMode, GridSize } from '@/pos/utils/posHelpers';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';

export function usePosLayout(params: {
  settings: POSSettings;
  setSettings: (patch: Partial<POSSettings>) => void;
}) {
  const { settings, setSettings } = params;

  const [view,       setView]       = useState<ViewMode>(settings.defaultView);
  const [gridSize,   setGridSize]   = useState<GridSize>(settings.defaultGridSize);
  useEffect(() => { setSettings({ defaultView: view }); }, [view, setSettings]);
  useEffect(() => { setSettings({ defaultGridSize: gridSize }); }, [gridSize, setSettings]);
  const [mobTab,     setMobTab]     = useState<'products' | 'cart'>('products');
  const [fullscreen, setFullscreen] = useState(false);
  const [cartWidth, setCartWidth]   = useState(settings.cartWidth);
  const cartWidthRef = useRef(cartWidth);
  cartWidthRef.current = cartWidth;
  const isDragging   = useRef(false);
  const posLayoutRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (posLayoutRef.current) {
      const max = posLayoutRef.current.getBoundingClientRect().width * 0.88;
      const clamped = Math.max(280, Math.min(cartWidth, max));
      if (clamped !== cartWidth) setCartWidth(clamped);
      posLayoutRef.current.style.setProperty('--cart-width', `${clamped}px`);
    }
  }, [cartWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !posLayoutRef.current) return;
      const rect = posLayoutRef.current.getBoundingClientRect();
      const dir = getComputedStyle(posLayoutRef.current).direction;
      const width = dir === 'rtl' ? e.clientX - rect.left : rect.right - e.clientX;
      const max = rect.width * 0.88;
      const clamped = Math.max(280, Math.min(max, width));
      setCartWidth(clamped);
    };
    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSettings({ cartWidth: cartWidthRef.current });
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSettings]);

  // ── Fullscreen (native API for true fullscreen + CSS fallback) ──────────────
  // ESC exits native fullscreen (browser behavior, can't prevent).
  // CSS .pos-fullscreen keeps the visual fullscreen (no scrollbar/gap) after ESC.
  const toggleFullscreen = useCallback(() => {
    setFullscreen(prev => {
      if (!prev) {
        // Enter: native fullscreen + CSS class
        containerRef.current?.requestFullscreen?.().catch(() => {});
        return true;
      } else {
        // Exit: native fullscreen + remove CSS class
        document.exitFullscreen?.().catch(() => {});
        return false;
      }
    });
  }, []);

  return {
    view, setView, gridSize, setGridSize,
    mobTab, setMobTab, fullscreen,
    posLayoutRef, containerRef,
    handleResizerMouseDown, toggleFullscreen,
  };
}
