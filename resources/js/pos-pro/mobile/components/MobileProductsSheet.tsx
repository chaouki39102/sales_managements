// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/MobileProductsSheet.tsx — Sheet المنتجات
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import { htToTtc } from '@/pos/utils/calculations';
import type { ProductVariant } from '@/types';
import { money, swatchFor, initials } from '../mobileFormat';
import PPMSheet from './PPMSheet';

export interface MobileProductsSheetProps {
  open: boolean;
  onClose: () => void;
  searchRef: React.RefObject<HTMLInputElement>;
  search: string;
  setSearch: (q: string) => void;
  activeCat: number | 'all';
  setActiveCat: React.Dispatch<React.SetStateAction<number | 'all'>>;
  families: Array<{ id: number; name: string }>;
  visibleVariants: ProductVariant[];
  qtyInCartByVariant: Map<number, number>;
  allowNegSetting: boolean;
  onAdd: (v: ProductVariant) => void;
}

export default function MobileProductsSheet({
  open, onClose, searchRef, search, setSearch, activeCat, setActiveCat, families,
  visibleVariants, qtyInCartByVariant, allowNegSetting, onAdd,
}: MobileProductsSheetProps) {
  return (
    <PPMSheet
      open={open}
      title="المنتجات"
      onClose={onClose}
    >
      <div className="ppm-psearch">
        <i className="ti ti-search" />
        <input
          ref={searchRef}
          placeholder="بحث باسم / مرجع / باركود…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="ppm-cat-scroll">
        <button
          className={`ppm-cat-chip${activeCat === 'all' ? ' on' : ''}`}
          onClick={() => setActiveCat('all')}
        >
          الكل
        </button>
        {families.map((f) => (
          <button
            key={f.id}
            className={`ppm-cat-chip${activeCat === f.id ? ' on' : ''}`}
            onClick={() => setActiveCat((c) => (c === f.id ? 'all' : f.id))}
          >
            {f.name}
          </button>
        ))}
      </div>
      <div className="ppm-pgrid">
        {visibleVariants.map((v) => {
          const inCartQty = qtyInCartByVariant.get(v.id) ?? 0;
          const out = isVariantOutOfStock(v, allowNegSetting);
          const priceTtc = htToTtc(v.default_selling_price_ht, v.tva?.rate ?? 0);
          return (
            <button
              key={v.id}
              className={`ppm-pcard${out ? ' ppm-is-out' : ''}`}
              onClick={() => onAdd(v)}
              disabled={out}
            >
              <div className={`ppm-sw ${swatchFor(v.id)}`}>
                {v.image_url
                  ? <img src={v.image_url} alt="" loading="lazy" />
                  : <span>{initials(v.product?.name)}</span>}
              </div>
              <div className="ppm-pc-body">
                <span className="ppm-pc-name">{v.product?.name}</span>
                <span className="ppm-pc-price ppm-mono">{money(priceTtc)} <em>دج</em></span>
                <div className="ppm-pc-row">
                  {inCartQty > 0 && <span className="ppm-pc-add">{inCartQty}</span>}
                  {v.manages_stock && v.current_stock !== undefined && v.current_stock <= 0 && (
                    <span className="ppm-stock-badge out">نفد</span>
                  )}
                  {v.manages_stock && v.current_stock !== undefined && v.current_stock > 0 && v.current_stock <= (v.max_stock_alert ?? 5) && (
                    <span className="ppm-stock-badge low">متبقّي {v.current_stock}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {visibleVariants.length === 0 && (
          <div className="ppm-cart-empty">
            <span className="ppm-t">لا توجد نتائج</span>
          </div>
        )}
      </div>
    </PPMSheet>
  );
}
