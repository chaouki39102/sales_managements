// pos/hooks/usePOSStore.ts

import { create }        from 'zustand';
import { nanoid }        from 'nanoid';
import { useCartStore }  from '../utils/useCartStore';
import type { HeldCart, CartItem, CartTotals, Party } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionPayment {
  paymentModeId: number;
  amount:        number;
}

export interface SessionProduct {
  name:  string;
  qty:   number;
  total: number;
}

interface POSState {
  sessionStarted:   boolean;
  sessionInvoices:  number;
  sessionSales:     number;
  highestInvoice:   number;
  invoiceTotals:    number[];
  paymentsBreakdown: SessionPayment[];
  productsSold:     Record<string, SessionProduct>;
  heldCarts:        HeldCart[];
  activeTab:        'products' | 'clients' | 'held';
  searchQuery:      string;
  selectedCategory: number | null;
  paymentModalOpen: boolean;

  startSession:     () => void;
  endSession:       () => void;
  incrementSession: (data: {
    amount:   number;
    payments?: SessionPayment[];
    items?:   CartItem[];
  }) => void;

  holdCart:         (params: { items: CartItem[]; totals: CartTotals; client: Party | null; label?: string; clearCart: () => void }) => void;
  restoreCart:      (id: string) => void;
  deleteHeldCart:   (id: string) => void;

  setTab:           (tab: POSState['activeTab']) => void;
  setSearch:        (q: string) => void;
  setCategory:      (id: number | null) => void;
  openPayment:      () => void;
  closePayment:     () => void;
}

function mergeProducts(existing: Record<string, SessionProduct>, items: CartItem[]) {
  const copy = { ...existing };
  items.forEach(i => {
    const key = String(i.variant_id);
    if (copy[key]) {
      copy[key] = {
        name:  copy[key].name,
        qty:   copy[key].qty + i.quantity,
        total: copy[key].total + i.total_ttc,
      };
    } else {
      copy[key] = {
        name:  i.product_name,
        qty:   i.quantity,
        total: i.total_ttc,
      };
    }
  });
  return copy;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  highestInvoice:   0,
  invoiceTotals:    [],
  paymentsBreakdown: [],
  productsSold:     {},
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () =>
    set({
      sessionStarted: true,
      sessionInvoices: 0,
      sessionSales: 0,
      highestInvoice: 0,
      invoiceTotals: [],
      paymentsBreakdown: [],
      productsSold: {},
    }),

  endSession: () => set({ sessionStarted: false }),

  incrementSession: (data) =>
    set((s) => ({
      sessionInvoices: s.sessionInvoices + 1,
      sessionSales:    s.sessionSales + data.amount,
      highestInvoice:  Math.max(s.highestInvoice, data.amount),
      invoiceTotals:   [...s.invoiceTotals, data.amount],
      paymentsBreakdown: data.payments
        ? [...s.paymentsBreakdown, ...data.payments]
        : s.paymentsBreakdown,
      productsSold:    data.items
        ? mergeProducts(s.productsSold, data.items)
        : s.productsSold,
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
