// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosBarcodeScanner.ts
//
// Barcode input for POSPage — hardware scanner (keystroke buffer + Enter) and
// camera scan. Lookup order: product barcode → packaging barcode → barcodes
// table. Unified with handleAddItem.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { Barcode, ProductPackaging, ProductVariant } from '@/types';

export function usePosBarcodeScanner(params: {
  allVariants: ProductVariant[];
  allowNegSetting: boolean;
  safeToast: PosSafeToast;
  handleAddItem: (v: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
}) {
  const { allVariants, allowNegSetting, safeToast, handleAddItem } = params;

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [scannedId, setScannedId] = useState<number | null>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Barcode Scanner ────────────────────────────────────────────────────────
  const barcodeRef = useRef('');
  useEffect(() => { barcodeRef.current = barcodeBuffer; }, [barcodeBuffer]);

  // ── Barcode scanner — unified with handleAddItem ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag     = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const buf = barcodeRef.current;
      if (e.key === 'Enter' && buf.length >= 4) {
        // 1) Try product barcode
        let variant = allVariants.find(v => v.barcode === buf);
        let packaging: ProductPackaging | null = null;
        if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
          setScannedId(variant.id);
          handleAddItem(variant, 1, null);
        } else {
          // 2) Try packaging barcode
          for (const v of allVariants) {
            const pkgs = (v.packagings ?? (v.product as any)?.packagings) as ProductPackaging[] | undefined;
            const match = pkgs?.find(p => p.barcode === buf);
            if (match) { variant = v; packaging = match; break; }
          }
          if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
            setScannedId(variant.id);
            handleAddItem(variant, 1, packaging);
          } else {
            // 3) Try dedicated barcodes table (barcodes relationship)
            for (const v of allVariants) {
              const bcList = v.barcodes;
              if (bcList?.some((bc: Barcode) => bc.barcode === buf)) {
                variant = v;
                break;
              }
            }
            if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
              setScannedId(variant.id);
              handleAddItem(variant, 1, null);
            }
          }
        }
        setBarcodeBuffer('');
        return;
      }
      // Don't accumulate barcode buffer when typing in an input field
      // (e.g. search, modal fields) — avoids swallowing Enter from ProductSearchBar
      if (!inInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setBarcodeBuffer(b => b + e.key);
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(barcodeTimer.current);
    };
  }, [allVariants, allowNegSetting, safeToast, handleAddItem]);

  const handleCameraScan = useCallback((barcode: string) => {
    if (!barcode || barcode.length < 4) return;
    let variant = allVariants.find(v => v.barcode === barcode);
    let packaging: ProductPackaging | null = null;
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      setScannedId(variant.id);
      handleAddItem(variant, 1, null);
      return;
    }
    for (const v of allVariants) {
      const pkgs = (v.packagings ?? (v.product as any)?.packagings) as ProductPackaging[] | undefined;
      const match = pkgs?.find(p => p.barcode === barcode);
      if (match) { variant = v; packaging = match; break; }
    }
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      setScannedId(variant.id);
      handleAddItem(variant, 1, packaging);
      return;
    }
    for (const v of allVariants) {
      const bcList = v.barcodes;
      if (bcList?.some((bc: Barcode) => bc.barcode === barcode)) {
        variant = v; break;
      }
    }
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      setScannedId(variant.id);
      handleAddItem(variant, 1, null);
    }
  }, [allVariants, allowNegSetting, handleAddItem]);

  return { scannedId, handleCameraScan };
}
