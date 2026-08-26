
import { fmtDZD, calcLineTotal, getProductStock, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import type { QuickCreatePayload } from './ProductSearch';
import type { LineItem, Product } from '../types/document.types';
import type { ProductType, Tva, Unit } from '@/lib/api/core/types';
import type { LineStockValidation } from '../utils/document.utils';
import type { ComputeLineWarning } from '../hooks/useComputeLine';

interface LineCardProps {
  line:            LineItem;
  idx:             number;
  products:        Product[];
  isPurchase:      boolean;
  disabled:        boolean;
  stockData:       Record<number, number>;
  stockValidation: LineStockValidation;
  isTvaExempt?:    boolean;
  lineWarnings?:   ComputeLineWarning[];
  warehouses?:     Array<{ id: number; name: string }>;
  onUpdate:        (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  onRemove:        (idx: number) => void;
  onDuplicate:     (idx: number) => void;
  onQuickCreate?:  (payload: QuickCreatePayload) => void;
  productTypes?:   ProductType[];
  tvas?:           Tva[];
  units?:          Unit[];
  isLoadingProducts?: boolean;
}

export function LineCard({
  line, idx, products, isPurchase, disabled, stockData, stockValidation,
  isTvaExempt, lineWarnings, warehouses,
  onUpdate, onRemove, onDuplicate,
  onQuickCreate, productTypes, tvas, units, isLoadingProducts,
}: LineCardProps) {
  const prod = products.find((p) => String(p.id) === line.product_id) ?? line._product;
  const { baseQty, gross: _gross, ht, tva, ttc, discountAmt, discPct: _discPct } = calcLineTotal(line);
  const packagings = prod?.packagings ?? [];
  const selectedPack = line.packaging_id
    ? packagings.find((p) => String(p.id) === line.packaging_id)
    : null;

  const hasStockWarning = !stockValidation.ok;
  const computeWarnings = line._warnings ?? lineWarnings ?? [];
  const activeComputeWarnings = computeWarnings.filter((w) => w.level !== 'info');
  const hasWarning = hasStockWarning || activeComputeWarnings.length > 0;

  const stockQty = prod ? getProductStock(prod, stockData) : null;

  let stockBadge: { label: string; color: string } | null = null;
  if (!isPurchase && prod?.manages_stock && stockQty !== null && stockQty !== Infinity) {
    if (stockQty <= 0)
      stockBadge = { label: 'نفد', color: 'var(--red)' };
    else if (stockQty < 5)
      stockBadge = { label: `متاح: ${stockQty}`, color: 'var(--orange)' };
    else
      stockBadge = { label: `متاح: ${stockQty}`, color: 'var(--green)' };
  }

  let marginPct: number | null = null;
  let unitMargin = 0;
  let totalMargin = 0;
  let marginColor = 'var(--t4)';
  let costPrice = 0;
  const lowMarginThreshold = (prod as any)?.min_margin_percentage ?? 5;
  if (!isPurchase && prod) {
    costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
    if (costPrice > 0 && line.unit_price_ht > 0) {
      unitMargin = line.unit_price_ht - costPrice;
      marginPct = (unitMargin / line.unit_price_ht) * 100;
      totalMargin = unitMargin * baseQty;
      marginColor = marginPct < lowMarginThreshold ? 'var(--red)' : marginPct < 10 ? 'var(--orange)' : 'var(--green)';
    }
  }
  const hasLowMarginWarning = (line._warnings ?? []).some(w => w.type === 'low_margin');
  const hasLowMargin = hasLowMarginWarning || (!isPurchase && marginPct !== null && marginPct < lowMarginThreshold);
  const borderColor = hasLowMargin
    ? 'var(--red)'
    : hasWarning
      ? (stockValidation && 'blocking' in stockValidation && stockValidation.blocking ? 'var(--red)' : 'var(--orange)')
      : 'var(--b2)';
  const bgTint = hasLowMargin
    ? `color-mix(in srgb, var(--red) 18%, var(--bg2))`
    : hasWarning
      ? (stockValidation && 'blocking' in stockValidation && stockValidation.blocking
          ? `color-mix(in srgb, var(--red) 5%, var(--bg2))`
          : `color-mix(in srgb, var(--orange) 4%, var(--bg2))`)
      : 'var(--bg2)';

  return (
    <div
      data-line-idx={idx}
      style={{
        background: bgTint,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--r2)',
        boxShadow: hasWarning ? 'none' : '0 1px 4px rgba(0,0,0,.04)',
        padding: '12px 14px',
        fontSize: 12,
        position: 'relative',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <ProductSearch
              products={products}
              value={line.product_id}
              onChange={(id, p) => onUpdate(idx, { product_id: id }, p)}
              disabled={disabled}
              isPurchase={isPurchase}
              stockData={stockData}
              triggerId={`doc-line-${idx}-product`}
              afterSelectFocusId={`doc-line-${idx}-qty`}
              onQuickCreate={onQuickCreate}
              productTypes={productTypes}
              tvas={tvas}
              units={units}
              isLoadingProducts={isLoadingProducts}
            />
            {stockBadge && (
              <span style={{
                fontSize: 9, fontWeight: 700, flexShrink: 0,
                padding: '1px 6px', borderRadius: 99,
                background: `color-mix(in srgb, ${stockBadge.color} 12%, transparent)`,
                color: stockBadge.color,
              }}>
                {stockBadge.label}
              </span>
            )}
            {isTvaExempt && (
              <span style={{
                padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                color: 'var(--green)', whiteSpace: 'nowrap',
              }}>
                <i className="ti ti-circle-check" style={{ marginLeft: 2, fontSize: 8 }} />
                معفى
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {!disabled && (
            <button
              onClick={() => onDuplicate(idx)}
              title="تكرار السطر"
              style={{
                width: 28, height: 28, borderRadius: 'var(--r1)',
                border: '1px solid var(--b2)', background: 'var(--bg2)',
                color: 'var(--t3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className="ti ti-copy" style={{ fontSize: 11 }} />
            </button>
          )}
          <button
            disabled={disabled}
            onClick={() => onRemove(idx)}
            title="حذف السطر"
            style={{
              width: 28, height: 28, borderRadius: 'var(--r1)',
              border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
              background: 'var(--redb)', color: 'var(--red)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      {/* ── Quantity & Price Row ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Quantity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--t4)', fontSize: 10, width: 38 }}>الكمية:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              disabled={disabled || line.quantity <= 1}
              onClick={() => onUpdate(idx, { quantity: Math.max(1, line.quantity - 1) })}
              style={{
                width: 26, height: 26, borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--t3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              −
            </button>
            <input
              id={`doc-line-${idx}-qty`}
              type="number"
              min={0.001}
              step={1}
              value={line.quantity}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { quantity: parseFloat(e.target.value) || 0 })}
              style={{
                width: 50, textAlign: 'center', padding: '3px 4px',
                borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
                background: 'var(--bg1)', color: 'var(--t1)',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                outline: 'none', fontVariantNumeric: 'tabular-nums',
              }}
            />
            <button
              disabled={disabled}
              onClick={() => onUpdate(idx, { quantity: line.quantity + 1 })}
              style={{
                width: 26, height: 26, borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--t3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Total Quantity (baseQty) */}
        {line._packQty > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--t4)', fontSize: 10, width: 56 }}>الكمية الإجمالية:</span>
            <input id={`doc-line-${idx}-total_qty`} type="number" defaultValue={baseQty * line._packQty} disabled={disabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                const newQty = line._packQty > 1 ? v / line._packQty : v;
                onUpdate(idx, { quantity: newQty });
              }}
              style={{ width: 70, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--b2)', fontSize: 12 }} />
          </div>
        )}

        {/* Unit Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>السعر:</span>
          <input
            id={`doc-line-${idx}-price`}
            type="number"
            min={0}
            step={0.01}
            value={line.unit_price_ht}
            disabled={disabled}
            onChange={(e) => onUpdate(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
            style={{
              width: 80, textAlign: 'right', padding: '3px 6px',
              borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
              background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              outline: 'none', direction: 'ltr', fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--t4)' }}>دج</span>
        </div>

        {/* Packaging selector */}
        {packagings.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>التعبئة:</span>
            <select
              value={line.packaging_id}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { packaging_id: e.target.value })}
              style={{
                padding: '3px 6px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">—</option>
              {packagings.map((pk) => (
                <option key={pk.id} value={String(pk.id)}>
                  {pk.label} ({pk.quantity}){pk.is_default ? ' ★' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Warehouse */}
        {warehouses && warehouses.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>المستودع:</span>
            <select
              value={line.warehouse_id ?? ''}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { warehouse_id: e.target.value || undefined })}
              style={{
                padding: '3px 6px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">— تلقائي —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Discount Row ── */}
      {(discountAmt > 0 || line.discount_percentage > 0) && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6, padding: '4px 8px', borderRadius: 'var(--r1)', background: 'color-mix(in srgb, var(--orange) 5%, transparent)', fontSize: 11 }}>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>الخصم:</span>
          <span style={{ color: 'var(--red)', fontWeight: 700 }}>
            {line.discount_mode === 'percent'
              ? `${line.discount_percentage}%`
              : `${fmtDZD(line.discount_amount_fixed)} دج`}
          </span>
          <span style={{ color: 'var(--t4)' }}>({fmtDZD(discountAmt)} دج)</span>
        </div>
      )}

      {/* ── Totals Row ── */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        marginTop: 8, paddingTop: 8,
        borderTop: '1px solid var(--b2)',
      }}>
        <div>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>المبلغ HT: </span>
          <span style={{ fontWeight: 700, color: 'var(--t2)' }}>{fmtDZD(ht)} دج</span>
        </div>
        <div>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>TVA ({line.tva_rate}%): </span>
          <span style={{ fontWeight: 600 }}>{fmtDZD(tva)} دج</span>
        </div>
        <div>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>المبلغ TTC: </span>
          <span style={{ fontWeight: 800, color: 'var(--em)' }}>{fmtDZD(ttc)} دج</span>
        </div>
        {!isPurchase && (
          <div>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>التكلفة: </span>
            {costPrice > 0 ? (
              <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{fmtDZD(costPrice)} دج</span>
            ) : (
              <span style={{ color: 'var(--t4)', fontWeight: 500 }}>—</span>
            )}
          </div>
        )}
        {!isPurchase && (
          <div>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>الهامش: </span>
            {marginPct !== null ? (
              <>
                <span style={{ color: marginColor, fontWeight: 700 }}>{fmtDZD(unitMargin)} دج</span>
                <span style={{ color: 'var(--t4)', margin: '0 3px' }}>·</span>
                <span style={{ color: marginColor, fontWeight: 700 }}>{marginPct.toFixed(1)}%</span>
                <span style={{ color: 'var(--t4)', margin: '0 3px' }}>·</span>
                <span style={{ color: marginColor, fontWeight: 600, fontSize: 11 }}>{fmtDZD(totalMargin)} دج</span>
              </>
            ) : (
              <span style={{ color: 'var(--t4)', fontWeight: 500 }}>—</span>
            )}
          </div>
        )}
        {selectedPack && (
          <div>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>{baseQty.toFixed(2)} و.أ</span>
          </div>
        )}
      </div>

      {/* ── Stock & Other Warnings ── */}
      {hasStockWarning && (
        <div style={{
          marginTop: 6, padding: '4px 8px', borderRadius: 'var(--r1)',
          background: stockValidation && 'blocking' in stockValidation && stockValidation.blocking
            ? 'color-mix(in srgb, var(--red) 8%, transparent)'
            : 'color-mix(in srgb, var(--orange) 8%, transparent)',
          fontSize: 10.5, color: stockValidation && 'blocking' in stockValidation && stockValidation.blocking
            ? 'var(--red)' : 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className={`ti ${stockValidation && 'blocking' in stockValidation && stockValidation.blocking ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
            style={{ fontSize: 11 }} />
          {stockValidation && 'message' in stockValidation ? stockValidation.message : ''}
        </div>
      )}

      {activeComputeWarnings.map((w, wi) => (
        <div key={wi} style={{
          marginTop: 4, padding: '4px 8px', borderRadius: 'var(--r1)',
          background: w.level === 'error'
            ? 'color-mix(in srgb, var(--red) 8%, transparent)'
            : 'color-mix(in srgb, var(--orange) 8%, transparent)',
          fontSize: 10.5, color: w.level === 'error' ? 'var(--red)' : 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className={`ti ${w.level === 'error' ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
            style={{ fontSize: 11 }} />
          {w.message}
        </div>
      ))}

      {/* ── Line Note ── */}
      {!disabled && (
        <div style={{ marginTop: 6 }}>
          <input
            type="text"
            value={line.line_note ?? ''}
            placeholder="ملاحظة على السطر..."
            disabled={disabled}
            onChange={(e) => onUpdate(idx, { line_note: e.target.value })}
            style={{
              width: '100%', padding: '4px 8px', fontSize: 10.5,
              borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
              background: 'transparent', color: 'var(--t3)',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}


