// DataTable/internal/useShortcutsOverlay.ts — keyboard shortcuts overlay (? key)
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useEffect } from 'react';

export function useShortcutsOverlay() {
  // ── Keyboard Shortcuts Overlay (? key) ──────────────────────────────────
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcutsOpen]);

  return { shortcutsOpen, setShortcutsOpen };
}

export type ShortcutsOverlayState = ReturnType<typeof useShortcutsOverlay>;
