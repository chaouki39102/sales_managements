// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosQuickItems.ts
//
// Pinned quick items + recent products (both persisted per company in
// localStorage) and the quick-items bar visibility.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import type { QuickItem } from '@/pos/utils/posHelpers';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { ProductVariant } from '@/types';

export const QUICK_ITEMS_KEY = (slug: string) => `pos-quick-items-${slug}`;
export const RECENT_PRODUCTS_KEY = (slug: string) => `pos-recent-products-${slug}`;

export function usePosQuickItems(params: {
  slug: string | null;
  settings: POSSettings;
  setSettings: (patch: Partial<POSSettings>) => void;
}) {
  const { slug, settings, setSettings } = params;

  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(QUICK_ITEMS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showQuickbar, setShowQuickbar] = useState(settings.showQuickbarOnStart);

  const [recentProducts, setRecentProducts] = useState<ProductVariant[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(RECENT_PRODUCTS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const handleToggleQuickbar = useCallback(() => {
    setShowQuickbar(prev => {
      const next = !prev;
      setSettings({ showQuickbarOnStart: next });
      return next;
    });
  }, [setSettings]);

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(QUICK_ITEMS_KEY(slug), JSON.stringify(quickItems)); }
    catch { /* storage full */ }
  }, [quickItems, slug]);

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(RECENT_PRODUCTS_KEY(slug), JSON.stringify(recentProducts)); }
    catch { /* storage full */ }
  }, [recentProducts, slug]);

  // ── Quick Items ────────────────────────────────────────────────────────────
  const toggleQuickItem = useCallback((variant: ProductVariant) => {
    setQuickItems(prev => {
      const exists = prev.find(q => q.variantId === variant.id);
      if (exists) return prev.filter(q => q.variantId !== variant.id);
      return [...prev, {
        variantId: variant.id,
        name:      variant.product?.name ?? '',
        priceHt:   variant.default_selling_price_ht,
        tvaRate:   variant.tva?.rate ?? 0,
      }];
    });
  }, []);

  const isQuickItem = useCallback((variantId: number) =>
    quickItems.some(q => q.variantId === variantId), [quickItems]);

  return {
    quickItems, setQuickItems, showQuickbar, handleToggleQuickbar,
    recentProducts, setRecentProducts, toggleQuickItem, isQuickItem,
  };
}
