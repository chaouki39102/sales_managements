import React, { memo } from 'react';
import { calcLineTotal, fmtDZD, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product, ColKey } from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';
import type { ComputeLineWarning } from '../hooks/useComputeLine';

interface WarehouseOption {
  id:   number;
  name: string;
}

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
  isTvaExempt?:   boolean;
  lineWarnings?:  ComputeLineWarning[];
  warehouses?:    WarehouseOption[];
}

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

export const DocumentLineRow = memo(function DocumentLineRow({
  line, idx, visibleCols, isPurchase, disabled, products, stockData,
  stockValidation, onUpdate, onRemove, onDuplicate, isTvaExempt, lineWarnings, warehouses,
}: DocumentLineRowProps) {

  const { baseQty, gross, discountAmt, discPct, ht, tva: lineTva, ttc } = calcLineTotal(line);

  const prodFromList = products.find((p) => String(p.id) === line.product_id);
  const prod         = prodFromList ?? line._product;
  const packagings   = prod?.packagings ?? [];
  const lots         = prod?.has_lots
    ? (prod?.lots ?? []).filter((lt) => lt.remaining_quantity > 0)
    : [];

  const hasStockWarning = !stockValidation.ok;
  const computeWarnings = line._warnings ?? lineWarnings ?? [];
  const activeComputeWarnings = computeWarnings.filter(
    (w) => w.level !== 'info',
  );
  const rowBg = hasStockWarning || activeComputeWarnings.length > 0
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
        {col('idx') && (
          <td style={{ padding: '4px 6px', textAlign: 'center',
            color: 'var(--t4)', fontSize: 11 }}>
            {idx + 1}
          </td>
        )}

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

        {col('lot') && (
          <td style={{ padding: '3px 4px' }}>
            {isPurchase ? (
              <CellInput
                type="text"
                value={line.lot_number_new ?? ''}
                onChange={(v) => onUpdate(idx, { lot_number_new: v })}
                disabled={disabled}
              />
            ) : (
              prod?.has_lots ? (
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
              ) : (
                <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
              )
            )}
          </td>
        )}

        {col('warehouse') && (
          <td style={{ padding: '3px 4px' }}>
            <select
              style={{ ...cellStyle(), cursor: 'pointer', fontSize: 10 }}
              value={line.warehouse_id ?? ''}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { warehouse_id: e.target.value || undefined })}
            >
              <option value="">— تلقائي —</option>
              {(warehouses ?? []).map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </td>
        )}

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

        {col('unit') && (
          <td style={{ padding: '3px 6px', textAlign: 'center',
            fontSize: 11, color: 'var(--t4)' }}>
            {prod?.unit?.symbol ?? '—'}
          </td>
        )}

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

        {col('orig_price') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t4)' }}>
            {fmtDZD(gross)}
          </td>
        )}

        {col('discount') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <select
                style={{ ...cellStyle(), width: 40, padding: '5px 2px', fontSize: 10 }}
                value={line.discount_mode}
                disabled={disabled}
                onChange={(e) => {
                  const newMode = e.target.value as 'percent' | 'fixed';
                  onUpdate(idx, newMode === 'fixed'
                    ? { discount_mode: 'fixed',   discount_percentage:   0 }
                    : { discount_mode: 'percent', discount_amount_fixed: 0 }
                  );
                }}
              >
                <option value="percent">%</option>
                <option value="fixed">دج</option>
              </select>
              <CellInput
                value={line.discount_mode === 'percent'
                  ? line.discount_percentage
                  : line.discount_amount_fixed}
                min={0}
                step={0.01}
                onChange={(v) => onUpdate(idx, line.discount_mode === 'percent'
                  ? { discount_percentage:   toNum(v), discount_amount_fixed: 0 }
                  : { discount_amount_fixed: toNum(v), discount_percentage:   0 }
                )}
                disabled={disabled}
              />
            </div>
          </td>
        )}

        {col('price_after') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: discountAmt > 0 ? 'var(--em)' : 'var(--t3)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {col('tva') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CellInput
                value={line.tva_rate}
                min={0}
                step={1}
                onChange={(v) => onUpdate(idx, { tva_rate: toNum(v) })}
                disabled={disabled || isTvaExempt}
                width={isTvaExempt ? 40 : 60}
              />
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
          </td>
        )}

        {col('total_ht') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t2)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {col('total_ttc') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {fmtDZD(ttc)}
          </td>
        )}

        {col('cost') && (
          <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
            {(() => {
              if (isPurchase || !prod) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
              if (!costPrice) return <span style={{ color: 'var(--t4)' }}>—</span>;
              return <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{fmtDZD(costPrice)}</span>;
            })()}
          </td>
        )}

        {col('margin') && (
          <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
            {(() => {
              if (isPurchase || !prod) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
              if (!costPrice || !line.unit_price_ht) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const unitMargin = line.unit_price_ht - costPrice;
              const marginPct = (unitMargin / line.unit_price_ht) * 100;
              const totalMargin = unitMargin * baseQty;
              const color  = marginPct < 0 ? 'var(--red)' : marginPct < 10 ? 'var(--orange)' : 'var(--green)';
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                  <span style={{ color, fontWeight: 700, fontSize: 12 }}>
                    {fmtDZD(unitMargin)} · {marginPct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                    {fmtDZD(totalMargin)}
                  </span>
                </div>
              );
            })()}
          </td>
        )}

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

      {/* تحذيرات الحساب (compute) — صفوف فرعية */}
      {activeComputeWarnings.map((w, wi) => (
        <tr key={wi} style={{ background: rowBg }}>
          <td
            colSpan={visibleCols.size}
            style={{
              padding: '3px 10px 6px', fontSize: 11,
              color: w.level === 'error' ? 'var(--red)' : 'var(--orange)',
            }}
          >
            <i
              className={`ti ${w.level === 'error' ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
              style={{ marginLeft: 4 }}
            />
            {w.message}
          </td>
        </tr>
      ))}
    </>
  );
});
