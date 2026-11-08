// pages/documents/quick-sale/QuickSaleLineRow.tsx
// سطر منتج واحد في البيع السريع
import type React from 'react';
import { fmtDZD } from '@/lib/format';
import SearchSelect from './SearchSelect';
import { cellStyle } from './quickSale.styles';
import type { Product, QuickLine } from './quickSale.types';

interface QuickSaleLineRowProps {
  line: QuickLine;
  idx: number;
  ttc: number;
  overStock: boolean | undefined;
  products: Product[];
  isPending: boolean;
  updateLine: (idx: number, field: keyof QuickLine, value: unknown) => void;
  removeLine: (idx: number) => void;
  getProductLabel: (p: Product) => string;
  getProductSub: (p: Product) => string | null;
  productInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  quantityInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  handleQuantityEnter: (idx: number) => void;
}

export default function QuickSaleLineRow({
  line, idx, ttc, overStock, products, isPending, updateLine, removeLine,
  getProductLabel, getProductSub, productInputRefs, quantityInputRefs, handleQuantityEnter,
}: QuickSaleLineRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
        gap: 6,
        alignItems: 'center',
        padding: '8px 10px',
        background: overStock
          ? 'color-mix(in srgb, var(--red) 5%, var(--bg2))'
          : 'var(--bg2)',
        borderRadius: 'var(--r2)',
        border: `1px solid ${overStock ? 'var(--redbo)' : 'var(--b1)'}`,
      }}
    >
      <SearchSelect
        items={products as any}
        value={line.product_id}
        onChange={(id, _item) => updateLine(idx, 'product_id', id)}
        getLabel={getProductLabel as any}
        getSub={getProductSub as any}
        placeholder="— اختر منتجاً —"
        disabled={isPending}
        error={!line.product_id}
        inputRef={(el: any) => (productInputRefs.current[idx] = el)}
        onEnter={() => {
          // عند الضغط Enter في حقل البحث بعد اختيار منتج (أو بدون اختيار)
          // ننتقل إلى حقل الكمية
          const quantityInput = quantityInputRefs.current[idx];
          quantityInput?.focus();
        }}
      />
      <input
        ref={el => (quantityInputRefs.current[idx] = el)}
        type="number"
        min="0.001"
        step="1"
        value={line.quantity}
        onChange={e => updateLine(idx, 'quantity', e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleQuantityEnter(idx);
          }
        }}
        style={{
          ...cellStyle(),
          border: `1px solid ${
            overStock
              ? 'var(--red)'
              : line.quantity <= 0
              ? 'var(--red)'
              : 'var(--b3)'
          }`,
        }}
        disabled={isPending}
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={line.price}
        onChange={e => updateLine(idx, 'price', e.target.value)}
        style={cellStyle()}
        disabled={isPending}
      />
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={line.tva_rate}
        onChange={e => updateLine(idx, 'tva_rate', e.target.value)}
        style={cellStyle()}
        disabled={isPending}
      />
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--em)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtDZD(ttc)}
      </div>
      <button
        onClick={() => removeLine(idx)}
        disabled={isPending}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '1px solid var(--b3)',
          background: 'var(--bg1)',
          color: 'var(--red)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className="ti ti-trash" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}
