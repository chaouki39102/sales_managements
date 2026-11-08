// Completeness score + per-tab dot/badge indicators for ProductModal
import { useMemo } from 'react';
import type { Barcode } from '@/lib/api/core/types';
import type { TabId } from '../constants';
import type { ProductForm } from '../types';

interface Deps {
  form: ProductForm;
  pendingImageUrl: string | null;
  productBarcodes: unknown[];
}

export function useTabIndicators({ form, pendingImageUrl, productBarcodes }: Deps) {
  // ── Completeness % ──
  const completeness = useMemo(() => {
    let score = 0; const total = 10;
    if (form.name.trim()) score++;
    if (form.purchase_price_ht !== '' && Number(form.purchase_price_ht) >= 0) score++;
    if (form.tva_id) score++;
    if (form.unit_id) score++;
    if (form.family_id) score++;
    if (form.brand_id) score++;
    if (form.ref.trim()) score++;
    if (form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '')) score++;
    if (form.description.trim()) score++;
    if (form.images.length > 0) score++;
    return Math.round((score / total) * 100);
  }, [form]);

  // ── Tab indicators ──
  function tabDot(tabId: TabId): 'done' | 'warn' | 'empty' {
    if (tabId === 'basic')    return (!form.name.trim() || form.purchase_price_ht === '') ? 'warn' : 'done';
    if (tabId === 'pricing')  return form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '') ? 'done' : 'empty';
    if (tabId === 'packagings') return form.packagings.length > 0 ? 'done' : 'empty';
    if (tabId === 'discounts')  return form.manages_quantity_discounts && form.quantity_discounts.length > 0 ? 'done' : 'empty';
    if (tabId === 'images')   return form.images.length > 0 || pendingImageUrl ? 'done' : 'empty';
    if (tabId === 'seo')      return (form.meta_title || form.meta_description) ? 'done' : 'empty';
    return 'empty';
  }
  function tabBadge(tabId: TabId): number | null {
    if (tabId === 'pricing')    return form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length || null;
    if (tabId === 'packagings') return form.packagings.length || null;
    if (tabId === 'discounts')  return form.quantity_discounts.filter(d => d.active).length || null;
    if (tabId === 'images')     return form.images.length + (pendingImageUrl ? 1 : 0) || null;
    if (tabId === 'barcodes')   return (productBarcodes as Barcode[]).length || null;
    return null;
  }
  const dotColor = (d: 'done' | 'warn' | 'empty') =>
    d === 'done' ? 'var(--green)' : d === 'warn' ? '#f59e0b' : 'transparent';

  return {
    completeness,
    tabDot,
    tabBadge,
    dotColor,
  };
}
