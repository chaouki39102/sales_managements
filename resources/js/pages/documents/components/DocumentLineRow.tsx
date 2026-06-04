// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocumentLineRow.tsx
//
// صف واحد من جدول الأسطر.
// يستقبل البيانات ويستدعي callbacks — لا يمتلك حالة إلا ما يخص UI فقط.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { calcLineTotal, fmtDZD, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product, ColKey, LineStockValidation } from '../types/document.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentLineRowProps {
  line:           LineItem;
  idx:            number;
  visibleCols:    Set<ColKey>;
  isPurchase:     boolean;
  disabled:       boolean;
  products:       Product[];
  stockData:      Record<number, number>;
  stockValidation: LineStockValidation;
  onUpdate:       (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  onRemove:       (idx: number) => void;
  onDuplicate:    (idx: number) => void;
}

// ─── Shared cell input style ──────────────────────────────────────────────────

function CellInput({
  value, onChange, type = 'number', min, step, disabled, highlight, width,
}: {
  value:      number | string;
  onChange:   (v: string) => void;
  type?:      string;
  min?:       number;
  step?:      number;
  disabled?:  boolean;
  highlight?: boolean;
  width?:     number;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...cellStyle(highlight), width: width ?? '100%' }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DocumentLineRow = memo(function DocumentLineRow({
  line, idx, visibleCols, isPurchase, disabled, products, stockData,
  stockValidation, onUpdate, onRemove, onDuplicate,
}: DocumentLineRowProps) {

  const { gross, discountAmt, discPct, ht, tva: lineTva, ttc } = calcLineTotal(line);

  const prod      = line._product;
  const packagings = prod?.packagings ?? [];
  const lots      = prod?.has_lots
    ? (prod?.lots ?? []).filter((lt) => lt.remaining_quantity > 0)
    : [];

  const hasStockWarning = !stockValidation.ok;
  const rowBg = hasStockWarning
    ? `color-mix(in srgb, ${stockValidation.blocking ? 'var(--red)' : 'var(--orange)'} 5%, transparent)`
    : undefined;

  const col = (key: ColKey) => visibleCols.has(key);

  return (
    <>
      <tr style={{
        borderBottom: '1px solid var(--b1)',
        background:   rowBg,
        transition:   'background .15s',
      }}>
        {/* # */}
        {col('idx') && (
          <td style={{ padding: '4px 6px', textAlign: 'center',
            color: 'var(--t4)', fontSize: 11 }}>
            {idx + 1}
          </td>
        )}

        {/* المنتج */}
        {col('product') && (
          <td style={{ padding: '3px 4px' }}>
            <ProductSearch
              products={products}
              value={line.product_id}
              onChange={(id, p) => onUpdate(idx, { product_id: id }, p)}
              disabled={disabled}
              error={!line.product_id}
              isPurchase={isPurchase}
              stockData={stockData}
            />
          </td>
        )}

        {/* التعبئة */}
        {col('packaging') && (
          <td style={{ padding: '3px 4px' }}>
            {packagings.length > 0 ? (
              <select
                style={{ ...cellStyle(), cursor: 'pointer' }}
                value={line.packaging_id}
                disabled={disabled}
                onChange={(e) => onUpdate(idx, { packaging_id: e.target.value })}
              >
                <option value="">— —</option>
                {packagings.map((pk) => (
                  <option key={pk.id} value={String(pk.id)}>
                    {pk.label} ({pk.quantity})
                    {pk.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
            )}
          </td>
        )}

        {/* الكثير */}
        {col('lot') && (
          <td style={{ padding: '3px 4px' }}>
            {prod?.has_lots ? (
              isPurchase ? (
                <CellInput
                  type="text"
                  value={line.lot_number_new ?? ''}
                  onChange={(v) => onUpdate(idx, { lot_number_new: v })}
                  disabled={disabled}
                />
              ) : (
                <select
                  style={{ ...cellStyle(), cursor: 'pointer' }}
                  value={line.stock_lot_id}
                  disabled={disabled}
                  onChange={(e) => onUpdate(idx, { stock_lot_id: e.target.value })}
                >
                  <option value="">— اختر —</option>
                  {lots.map((lt) => (
                    <option key={lt.id} value={String(lt.id)}>
                      {lt.lot_number} ({lt.remaining_quantity})
                      {lt.expiration_date ? ` exp:${lt.expiration_date.slice(0, 7)}` : ''}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
            )}
          </td>
        )}

        {/* الكمية */}
        {col('quantity') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.quantity}
              min={0.001}
              step={1}
              onChange={(v) => onUpdate(idx, { quantity: toNum(v) })}
              disabled={disabled}
              highlight={hasStockWarning && !stockValidation.blocking}
            />
          </td>
        )}

        {/* الوحدة */}
        {col('unit') && (
          <td style={{ padding: '3px 6px', textAlign: 'center',
            fontSize: 11, color: 'var(--t4)' }}>
            {prod?.unit?.symbol ?? '—'}
          </td>
        )}

        {/* سعر الوحدة HT */}
        {col('unit_price') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.unit_price_ht}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { unit_price_ht: toNum(v) })}
              disabled={disabled}
            />
          </td>
        )}

        {/* سعر التعبئة */}
        {col('pack_price') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.price_per_pack}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { price_per_pack: toNum(v) })}
              disabled={disabled || line._packQty <= 1}
            />
          </td>
        )}

        {/* السعر الأصلي */}
        {col('orig_price') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t4)' }}>
            {fmtDZD(gross)}
          </td>
        )}

        {/* الخصم */}
        {col('discount') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {/* نوع الخصم */}
              <select
                style={{ ...cellStyle(), width: 40, padding: '5px 2px', fontSize: 10 }}
                value={line.discount_mode}
                disabled={disabled}
                onChange={(e) => onUpdate(idx, {
                  discount_mode: e.target.value as 'percent' | 'fixed',
                })}
              >
                <option value="percent">%</option>
                <option value="fixed">دج</option>
              </select>
              {/* قيمة الخصم */}
              <CellInput
                value={line.discount_mode === 'percent'
                  ? line.discount_percentage
                  : line.discount_amount_fixed}
                min={0}
                step={0.01}
                onChange={(v) => onUpdate(idx, line.discount_mode === 'percent'
                  ? { discount_percentage: toNum(v) }
                  : { discount_amount_fixed: toNum(v) })}
                disabled={disabled}
              />
            </div>
          </td>
        )}

        {/* بعد الخصم HT */}
        {col('price_after') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: discountAmt > 0 ? 'var(--em)' : 'var(--t3)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {/* TVA % */}
        {col('tva') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.tva_rate}
              min={0}
              step={1}
              onChange={(v) => onUpdate(idx, { tva_rate: toNum(v) })}
              disabled={disabled}
              width={60}
            />
          </td>
        )}

        {/* إجمالي HT */}
        {col('total_ht') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t2)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {/* إجمالي TTC */}
        {col('total_ttc') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {fmtDZD(ttc)}
          </td>
        )}

        {/* ملاحظة السطر */}
        {col('line_note') && (
          <td style={{ padding: '3px 4px' }}>
            <input
              type="text"
              value={line.line_note ?? ''}
              placeholder="ملاحظة..."
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { line_note: e.target.value })}
              style={{ ...cellStyle(), fontSize: 11 }}
            />
          </td>
        )}

        {/* الإجراءات */}
        {col('actions') && (
          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <button
                onClick={() => onDuplicate(idx)}
                disabled={disabled}
                title="تكرار السطر"
                style={{
                  width: 24, height: 24, borderRadius: 'var(--r1)',
                  border: '1px solid var(--b2)', background: 'var(--bg2)',
                  color: 'var(--t3)', cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-copy" style={{ fontSize: 11 }} />
              </button>
              <button
                onClick={() => onRemove(idx)}
                disabled={disabled}
                title="حذف السطر"
                style={{
                  width: 24, height: 24, borderRadius: 'var(--r1)',
                  border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                  background: 'var(--redb)', color: 'var(--red)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 11 }} />
              </button>
            </div>
          </td>
        )}
      </tr>

      {/* تحذير المخزون — صف فرعي */}
      {hasStockWarning && (
        <tr style={{ background: rowBg }}>
          <td
            colSpan={visibleCols.size}
            style={{ padding: '3px 10px 6px', fontSize: 11,
              color: stockValidation.blocking ? 'var(--red)' : 'var(--orange)' }}
          >
            <i className={`ti ${stockValidation.blocking ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
              style={{ marginLeft: 4 }} />
            {stockValidation.message}
          </td>
        </tr>
      )}
    </>
  );
});
