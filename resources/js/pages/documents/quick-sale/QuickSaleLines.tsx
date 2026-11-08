// pages/documents/quick-sale/QuickSaleLines.tsx
// قسم المنتجات: رأس الأعمدة + الأسطر + زر الإضافة
import type React from 'react';
import ErrMsg from './ErrMsg';
import QuickSaleLineRow from './QuickSaleLineRow';
import { calcLine } from './quickSale.utils';
import type { Product, QuickLine } from './quickSale.types';

interface QuickSaleLinesProps {
  lines: QuickLine[];
  errors: Record<string, string>;
  loadingProds: boolean;
  products: Product[];
  isPending: boolean;
  addLine: () => void;
  updateLine: (idx: number, field: keyof QuickLine, value: unknown) => void;
  removeLine: (idx: number) => void;
  getProductLabel: (p: Product) => string;
  getProductSub: (p: Product) => string | null;
  productInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  quantityInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  handleQuantityEnter: (idx: number) => void;
}

export default function QuickSaleLines({
  lines, errors, loadingProds, products, isPending, addLine, updateLine, removeLine,
  getProductLabel, getProductSub, productInputRefs, quantityInputRefs, handleQuantityEnter,
}: QuickSaleLinesProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--t3)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          المنتجات
          {lines.length > 0 && (
            <span
              style={{
                marginRight: 6,
                padding: '1px 7px',
                borderRadius: 99,
                background: 'var(--em)',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {lines.length}
            </span>
          )}
        </div>
        {errors.lines && <ErrMsg msg={errors.lines} />}
      </div>

      {loadingProds ? (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--t4)', fontSize: 13 }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
          تحميل المنتجات...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lines.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                gap: 6,
                padding: '4px 10px',
              }}
            >
              {['المنتج', 'الكمية', 'سعر HT', 'TVA%', 'TTC', ''].map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--t4)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                    textAlign: 'center',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
          )}

          {lines.map((line, idx) => {
            const { ttc } = calcLine(line);
            const prod = products.find(p => String(p.id) === line.product_id);
            const overStock =
              prod?.manages_stock && prod.current_stock != null && line.quantity > prod.current_stock;

            return (
              <QuickSaleLineRow
                key={idx}
                line={line}
                idx={idx}
                ttc={ttc}
                overStock={overStock}
                products={products}
                isPending={isPending}
                updateLine={updateLine}
                removeLine={removeLine}
                getProductLabel={getProductLabel}
                getProductSub={getProductSub}
                productInputRefs={productInputRefs}
                quantityInputRefs={quantityInputRefs}
                handleQuantityEnter={handleQuantityEnter}
              />
            );
          })}

          <button
            onClick={addLine}
            disabled={isPending}
            style={{
              padding: '8px',
              borderRadius: 'var(--r2)',
              border: '1px dashed var(--em)',
              background: 'transparent',
              color: 'var(--em)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <i className="ti ti-plus" /> إضافة منتج
          </button>
        </div>
      )}
    </div>
  );
}
