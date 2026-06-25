// resources/js/pos/hooks/usePOSStore.ts
import { create }       from 'zustand';
import { nanoid }       from 'nanoid';
import { useCartStore } from '../utils/useCartStore';
import type { HeldCart, CartItem, CartTotals, Party } from '@/types';

interface POSState {
  heldCarts:          HeldCart[];
  searchQuery:        string;
  selectedCategory:   number | null;
  paymentModalOpen:   boolean;
  invoiceDiscountPct: number;

  holdCart:   (params: {
    items:     CartItem[];
    totals:    CartTotals;
    client:    Party | null;
    label?:    string;
    clearCart: () => void;
  }) => void;
  restoreCart:           (id: string) => void;
  deleteHeldCart:        (id: string) => void;
  setSearch:             (q: string) => void;
  setCategory:           (id: number | null) => void;
  openPayment:           () => void;
  closePayment:          () => void;
  setInvoiceDiscountPct: (pct: number) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  heldCarts:          [],
  searchQuery:        '',
  selectedCategory:   null,
  paymentModalOpen:   false,
  invoiceDiscountPct: 0,

  holdCart: ({ items, totals, client, label, clearCart }) => {
    if (!items.length) return;

    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals,
      client:     client ?? null,
      created_at: new Date().toISOString(),
    };

    set(s => ({ heldCarts: [...s.heldCarts, held] }));
    clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find(c => c.id === id);
    if (!held) return;
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) })),

  setSearch:   (q)   => set({ searchQuery: q }),
  setCategory: (id)  => set({ selectedCategory: id }),
  openPayment: ()    => set({ paymentModalOpen: true }),
  closePayment: ()   => set({ paymentModalOpen: false }),

  setInvoiceDiscountPct: (pct) =>
    set({ invoiceDiscountPct: Math.max(0, Math.min(100, pct)) }),
}));
