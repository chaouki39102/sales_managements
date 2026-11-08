// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosFocusEffects.ts
//
// Search-field focus rules for POSPage:
//   • auto-focus search + select last cart row on page mount / invoice reopen;
//   • re-focus search whenever any modal closes.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef } from 'react';
import { useCartStore } from '@/pos/utils/useCartStore';
import type { ActiveModal } from '@/pos/utils/posHelpers';

export function usePosFocusEffects(params: {
  sessionId: number | undefined;
  modal: ActiveModal;
  searchRef: React.RefObject<HTMLInputElement>;
  setSelectedCartItemId: (id: string | null) => void;
}) {
  const { sessionId, modal, searchRef, setSelectedCartItemId } = params;

  // ── Auto-focus search + select last cart row on page mount / invoice reopen ──
  useEffect(() => {
    if (!sessionId) return;
    const t = setTimeout(() => {
      searchRef.current?.focus();
      const items = useCartStore.getState().items;
      const last = items[items.length - 1];
      if (last) setSelectedCartItemId(last.id);
    }, 100);
    return () => clearTimeout(t);
  }, [sessionId, searchRef, setSelectedCartItemId]); // refs/setters are stable — listed for lint only

  // ── Focus search whenever any modal closes ──
  const prevModalRef = useRef(modal);
  useEffect(() => {
    if (prevModalRef.current !== 'none' && modal === 'none') {
      const t = setTimeout(() => searchRef.current?.focus(), 100);
      prevModalRef.current = modal;
      return () => clearTimeout(t);
    }
    prevModalRef.current = modal;
  }, [modal, searchRef]);
}
