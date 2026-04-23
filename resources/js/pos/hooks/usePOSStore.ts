// ════════════════════════════════════════════════
// store/usePOSStore.ts — حالة نقطة البيع الكاملة
// ════════════════════════════════════════════════
import { create } from 'zustand';
import type { HeldCart } from '@/types';
import { nanoid } from 'nanoid';
import { useCartStore } from '../utils/useCartStore';

interface POSState {
  // Session
  sessionStarted:    boolean;
  sessionInvoices:   number;
  sessionSales:      number;

  // Held carts
  heldCarts:         HeldCart[];

  // UI state
  activeTab:         'products' | 'clients' | 'held';
  searchQuery:       string;
  selectedCategory:  number | null;
  paymentModalOpen:  boolean;

  // Actions
  startSession:      () => void;
  endSession:        () => void;
  incrementSession:  (amount: number) => void;

  holdCart:          (label?: string) => void;
  restoreCart:       (id: string) => void;
  deleteHeldCart:    (id: string) => void;

  setTab:            (tab: POSState['activeTab']) => void;
  setSearch:         (q: string) => void;
  setCategory:       (id: number | null) => void;
  openPayment:       () => void;
  closePayment:      () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () => set({ sessionStarted: true, sessionInvoices: 0, sessionSales: 0 }),
  endSession:   () => set({ sessionStarted: false }),

  incrementSession: (amount) =>
    set(s => ({ sessionInvoices: s.sessionInvoices + 1, sessionSales: s.sessionSales + amount })),

  holdCart: (label) => {
    const cart  = useCartStore.getState();
    const items = cart.items;
    if (items.length === 0) return;
    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals:     cart.totals(),
      client:     cart.client,
      created_at: new Date().toISOString(),
    };
    set(s => ({ heldCarts: [...s.heldCarts, held] }));
    cart.clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find(c => c.id === id);
    if (!held) return;
    const cart = useCartStore.getState();
    // Restore items directly
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) })),

  setTab:      (tab)  => set({ activeTab: tab }),
  setSearch:   (q)    => set({ searchQuery: q }),
  setCategory: (id)   => set({ selectedCategory: id }),
  openPayment:  ()    => set({ paymentModalOpen: true }),
  closePayment: ()    => set({ paymentModalOpen: false }),
}));


// ════════════════════════════════════════════════
// store/useUIStore.ts — الحالة العامة للواجهة
// ════════════════════════════════════════════════
import { create as cr } from 'zustand';
import { persist as ps } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  notifications:   number;
  // actions
  toggleSidebar:   () => void;
  setNotifications:(n: number) => void;
}

export const useUIStore = cr<UIState>()(
  ps(
    (set) => ({
      sidebarCollapsed: false,
      notifications:   0,
      toggleSidebar:   () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setNotifications:(n) => set({ notifications: n }),
    }),
    { name: 'ui-state' }
  )
);
