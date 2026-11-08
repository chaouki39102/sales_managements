// Price / packaging / barcode / discount list handlers for ProductModal (plain functions, no hooks)
import React from 'react';
import type { Barcode } from '@/lib/api/core/types';
import type { useBarcodeMutations } from '@/lib/api/endpoints/barcodes';
import type { ProductForm, ProductPrice, ProductPackaging, QuantityDiscount } from '../types';

interface Deps {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  barcodeInput: string;
  setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
  setShowAddBarcode: React.Dispatch<React.SetStateAction<boolean>>;
  productId: number | null;
  productBarcodes: unknown[];
  barcodeMutations: ReturnType<typeof useBarcodeMutations>;
}

export function createProductCollectionHandlers({ form, setForm, setIsDirty, barcodeInput, setBarcodeInput, setShowAddBarcode, productId, productBarcodes, barcodeMutations }: Deps) {
  // ── Price helpers ──
  function updatePrice(levelId: number, key: keyof ProductPrice, val: any) {
    setForm(f => ({
      ...f,
      prices: f.prices.map(p => p.price_level_id === levelId ? { ...p, [key]: val } : p),
    }));
    setIsDirty(true);
  }

  // ── Packaging helpers ──
  function addPackaging() {
    const order = form.packagings.length;
    setForm(f => ({
      ...f,
      packagings: [...f.packagings, {
        code: '', label: '', quantity: 1, barcode: '',
        is_default: order === 0, active: true, display_order: order,
      }],
    }));
    setIsDirty(true);
  }
  function updatePackaging(idx: number, key: keyof ProductPackaging, val: any) {
    setForm(f => {
      const next = f.packagings.map((p, i) => {
        if (i !== idx) return key === 'is_default' ? { ...p, is_default: false } : p;
        return { ...p, [key]: val };
      });
      return { ...f, packagings: next };
    });
    setIsDirty(true);
  }
  function removePackaging(idx: number) {
    setForm(f => ({ ...f, packagings: f.packagings.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }
  function movePackaging(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= form.packagings.length) return;
    setForm(f => {
      const next = [...f.packagings];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { ...f, packagings: next.map((p, i) => ({ ...p, display_order: i })) };
    });
    setIsDirty(true);
  }

  // ── Barcode helpers ──
  function addBarcode() {
    if (!barcodeInput.trim() || !productId) return;
    barcodeMutations.create.mutate({
      product_id: productId,
      barcode: barcodeInput.trim(),
      is_primary: (productBarcodes as Barcode[]).length === 0,
    });
    setBarcodeInput('');
    setShowAddBarcode(false);
  }

  function removeBarcodeItem(id: number) {
    barcodeMutations.remove.mutate(id);
  }

  function makePrimaryBarcode(id: number) {
    barcodeMutations.update.mutate({ id, data: { is_primary: true } });
  }

  function copyBarcodeText(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleCopyConfig(result: { copy_packaging: boolean; copy_discounts: boolean; replace_packaging: boolean; replace_discounts: boolean; packagings: any[]; quantity_discounts: any[] }) {
    setForm(f => {
      const next = { ...f };
      if (result.copy_packaging && result.packagings.length > 0) {
        const base = result.replace_packaging ? [] : f.packagings;
        const startOrder = base.length;
        next.packagings = [
          ...base,
          ...result.packagings.map((pkg: any, i: number) => ({
            code: pkg.code ?? '',
            label: pkg.label ?? '',
            quantity: pkg.quantity ?? 1,
            barcode: pkg.barcode ?? '',
            is_default: pkg.is_default ?? false,
            active: pkg.active ?? true,
            display_order: startOrder + i,
          })),
        ];
      }
      if (result.copy_discounts && result.quantity_discounts.length > 0) {
        const base = result.replace_discounts ? [] : f.quantity_discounts;
        next.quantity_discounts = [
          ...base,
          ...result.quantity_discounts.map((d: any) => ({
            price_level_id:      d.price_level_id,
            min_qty:             d.min_qty,
            max_qty:             d.max_qty ?? null,
            discount_amount:     d.discount_amount ?? null,
            discount_percentage: d.discount_percentage ?? null,
            tier_order:          d.tier_order ?? 0,
            is_blocked:          d.is_blocked ?? false,
            active:              d.active ?? true,
          })),
        ];
        next.manages_quantity_discounts = true;
      }
      return next;
    });
    setIsDirty(true);
  }

  // ── Discount helpers ──
  function addDiscount(levelId: number) {
    setForm(f => ({
      ...f,
      quantity_discounts: [...f.quantity_discounts, {
        price_level_id: levelId, min_qty: '', max_qty: null,
        discount_amount: null, discount_percentage: null,
        tier_order: f.quantity_discounts.filter(d => d.price_level_id === levelId).length,
        is_blocked: false, active: true,
      }],
    }));
    setIsDirty(true);
  }
  function updateDiscount(idx: number, key: keyof QuantityDiscount, val: any) {
    setForm(f => ({
      ...f,
      quantity_discounts: f.quantity_discounts.map((d, i) => i === idx ? { ...d, [key]: val } : d),
    }));
    setIsDirty(true);
  }
  function removeDiscount(idx: number) {
    setForm(f => ({ ...f, quantity_discounts: f.quantity_discounts.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }

  return {
    updatePrice,
    addPackaging,
    updatePackaging,
    removePackaging,
    movePackaging,
    addBarcode,
    removeBarcodeItem,
    makePrimaryBarcode,
    copyBarcodeText,
    handleCopyConfig,
    addDiscount,
    updateDiscount,
    removeDiscount,
  };
}
