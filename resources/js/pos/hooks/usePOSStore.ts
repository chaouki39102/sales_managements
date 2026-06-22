// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOSStore.ts
//
// حالة نقطة البيع الكاملة
//
// ✅ useUIStore مُحذف من هنا — موجود في lib/store/uiStore.ts
// ✅ holdCart تستقبل items, totals, client, clearCart كمعاملات
//    (بدلاً من الاتصال المباشر بـ useCartStore.getState())
// ════════════════════════════════════════════════════════════════════════════

import { create }        from 'zustand';
import { nanoid }        from 'nanoid';
import { useCartStore }  from '../utils/useCartStore';
import type { HeldCart, CartItem, CartTotals, Party } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface POSState {
  sessionStarted:   boolean;
  sessionInvoices:  number;
  sessionSales:     number;
  heldCarts:        HeldCart[];
  activeTab:        'products' | 'clients' | 'held';
  searchQuery:      string;
  selectedCategory: number | null;
  paymentModalOpen: boolean;

  startSession:     () => void;
  endSession:       () => void;
  incrementSession: (amount: number) => void;

  holdCart:         (params: { items: CartItem[]; totals: CartTotals; client: Party | null; label?: string; clearCart: () => void }) => void;
  restoreCart:      (id: string) => void;
  deleteHeldCart:   (id: string) => void;

  setTab:           (tab: POSState['activeTab']) => void;
  setSearch:        (q: string) => void;
  setCategory:      (id: number | null) => void;
  openPayment:      () => void;
  closePayment:     () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () =>
    set({ sessionStarted: true, sessionInvoices: 0, sessionSales: 0 }),

  endSession: () => set({ sessionStarted: false }),

  incrementSession: (amount) =>
    set((s) => ({
      sessionInvoices: s.sessionInvoices + 1,
      sessionSales:    s.sessionSales + amount,
    })),

  holdCart: ({ items, totals, client, label, clearCart }) => {
    if (items.length === 0) return;

    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals,
      client:     client ?? null,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ heldCarts: [...s.heldCarts, held] }));
    clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find((c) => c.id === id);
    if (!held) return;
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set((s) => ({ heldCarts: s.heldCarts.filter((c) => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set((s) => ({ heldCarts: s.heldCarts.filter((c) => c.id !== id) })),

  setTab:       (tab) => set({ activeTab: tab }),
  setSearch:    (q)   => set({ searchQuery: q }),
  setCategory:  (id)  => set({ selectedCategory: id }),
  openPayment:  ()    => set({ paymentModalOpen: true }),
  closePayment: ()    => set({ paymentModalOpen: false }),
}));
