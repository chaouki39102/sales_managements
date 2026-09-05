import { memo, useState, useRef, useCallback } from 'react';
import { calcLineTotal, fmtDZD, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import type { QuickCreatePayload } from './ProductSearch';
import { LotCell } from './LotCell';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product, ColKey } from '../types/document.types';
import type { ProductType, Tva, Unit } from '@/lib/api/core/types';
import type { LineStockValidation } from '../utils/document.utils';
import { getDocLinePref } from '../utils/docLinePrefs';
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
  /** صلاحية إظهار التكلفة والهامش (view_cost_price) — تُخفي خلفية صف الهامش المنخفض وتلوين المبالغ. */
  canViewCost?:   boolean;
  /** صلاحية تغيير أسعار الأسطر (change_price_commercial_document) — تُفنَّى حقول السعر دون الصلاحية (و backend يرفض الرفع). */
  canEditPrice?:  boolean;
  /** صلاحية تطبيق خصومات الأسطر (apply_discount_commercial_document) — تُفنَّى حقول/مبدّل الخصم دون الصلاحية. */
  canApplyDiscount?: boolean;
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
  onQuickCreate?: (payload: QuickCreatePayload) => void;
  productTypes?:  ProductType[];
  tvas?:          Tva[];
  units?:         Unit[];
  isLoadingProducts?: boolean;
  selected?:      boolean;
  onToggleSelect?: (idx: number) => void;
  /** مقبض السحب لإعادة الترتيب (Task 11) — يعرض مقبضاً حين يكون السطر قابلاً للتعديل. */
  onRowDragStart?: (idx: number, e: React.DragEvent) => void;
  onRowDragEnd?: () => void;
  onRowDragOver?: (idx: number, e: React.DragEvent) => void;
  onRowDragLeave?: (idx: number, e: React.DragEvent) => void;
  onRowDrop?: (idx: number, e: React.DragEvent) => void;
  isDragSource?: boolean;
  isDropTarget?: boolean;
  /** طريقة عرض السعر في القراءات العرضية (سعر بعد الخصم) — لا يمس الحقل القابل للتحرير. */
  priceDisplayMode?: 'ht' | 'ttc';
}

function CellInput({
  value, onChange, type = 'number', min, step, disabled, readOnly, highlight, width, id,
}: {
  value:      number | string;
  onChange:   (v: string) => void;
  type?:      string;
  min?:       number;
  step?:      number;
  disabled?:  boolean;
  readOnly?:  boolean;
  highlight?: boolean;
  width?:     number;
  id?:        string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      min={min}
      step={step}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...cellStyle(highlight), width: width ?? '100%' }}
    />
  );
}

function TotalQtyInput({
  baseQty, disabled, onUpdate, id,
}: {
  baseQty:  number;
  _packQty:  number;
  disabled: boolean;
  onUpdate: (totalQty: number) => void;
  id?:      string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const display = draft ?? (Number.isInteger(baseQty) ? String(baseQty) : baseQty.toFixed(4).replace(/\.?0+$/, ''));

  const handleBlur = useCallback(() => {
    setDraft(null);
    if (draft !== null) {
      const num = toNum(draft);
      if (num > 0) onUpdate(num);
    }
  }, [draft, onUpdate]);

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setDraft(String(baseQty))}
      onBlur={handleBlur}
      style={{ ...cellStyle(), width: '100%' }}
    />
  );
}

export const DocumentLineRow = memo(function DocumentLineRow({
  line, idx, visibleCols, isPurchase, canViewCost = true, canEditPrice = true, canApplyDiscount = true, disabled, products, stockData,
  stockValidation, onUpdate, onRemove, onDuplicate, isTvaExempt, lineWarnings, warehouses,
  onQuickCreate, productTypes, tvas, units, isLoadingProducts,
  selected, onToggleSelect,
  onRowDragStart, onRowDragEnd, onRowDragOver, onRowDragLeave, onRowDrop,
  isDragSource, isDropTarget, priceDisplayMode = 'ht',
}: DocumentLineRowProps) {

  const { baseQty, gross: _gross, discountAmt, discPct: _discPct, ht, tva: _lineTva, ttc } = calcLineTotal(line);

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
  let lowMarginRow = false;
  if (canViewCost && !isPurchase && prod) {
    const cp = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
    if (cp > 0 && line.unit_price_ht > 0) {
      const threshold = (prod as any).min_margin_percentage ?? 5;
      lowMarginRow = ((line.unit_price_ht - cp) / line.unit_price_ht) * 100 < threshold;
    }
  }
  const rowBg = selected
    ? 'color-mix(in srgb, var(--em) 8%, transparent)'
    : lowMarginRow
    ? `color-mix(in srgb, var(--red) 15%, transparent)`
    : hasStockWarning || activeComputeWarnings.length > 0
      ? `color-mix(in srgb, ${(stockValidation as any).blocking ? 'var(--red)' : 'var(--orange)'} 5%, transparent)`
      : undefined;

  const col = (key: ColKey) => visibleCols.has(key);

  const dragEnabled = !!onRowDragStart && !disabled;
  const subRowColSpan = visibleCols.size + (onToggleSelect ? 1 : 0) + (dragEnabled ? 1 : 0);

  const rowDragOver = (e: React.DragEvent) => {
    if (!dragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onRowDragOver?.(idx, e);
  };
  const rowDragLeave = (e: React.DragEvent) => {
    const rel = e.relatedTarget as Node | null;
    if (rel && e.currentTarget.contains(rel)) return;
    onRowDragLeave?.(idx, e);
  };
  const rowDrop = (e: React.DragEvent) => {
    if (!dragEnabled) return;
    e.preventDefault();
    onRowDrop?.(idx, e);
  };

  return (
    <>
      <tr
        data-line-idx={idx}
        onDragOver={rowDragOver}
        onDragLeave={rowDragLeave}
        onDrop={rowDrop}
        style={{
        borderBottom: '1px solid var(--b1)',
        background:   rowBg,
        transition:   'background .15s',
        opacity: isDragSource ? 0.4 : 1,
        outline: isDropTarget ? '2px dashed var(--em)' : 'none',
        outlineOffset: -2,
      }}>
        {dragEnabled && (
          <td style={{ padding: '4px 2px', textAlign: 'center', width: 28 }}>
            <span
              draggable
              onDragStart={(e) => onRowDragStart?.(idx, e)}
              onDragEnd={onRowDragEnd}
              title="اسحب لإعادة الترتيب"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, cursor: 'grab', userSelect: 'none',
                color: 'var(--t4)', borderRadius: 'var(--r1)',
              }}
            >
              <i className="ti ti-grip-vertical" style={{ fontSize: 13 }} />
            </span>
          </td>
        )}

        {onToggleSelect && (
          <td style={{ padding: '4px 6px', textAlign: 'center', width: 32 }}>
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect(idx)}
              style={{ cursor: 'pointer', accentColor: 'var(--em)' }}
            />
          </td>
        )}

        {col('idx') && (
          <td style={{ padding: '4px 6px', textAlign: 'center',
            color: 'var(--t4)', fontSize: 11 }}>
            {idx + 1}
          </td>
        )}

        {col('product') && (
          <td style={{ padding: '3px 4px', minWidth: 220, width: '26%' }}>
            <ProductSearch
              products={products}
              value={line.product_id ? String(line.product_id) : ''}
              onChange={(productId, product) => onUpdate(idx, { product_id: productId }, product)}
              disabled={disabled}
              error={!line.product_id}
              isPurchase={isPurchase}
              stockData={stockData}
              triggerId={`doc-line-${idx}-product`}
              afterSelectFocusId={`doc-line-${idx}-qty`}
              onQuickCreate={onQuickCreate}
              productTypes={productTypes}
              tvas={tvas}
              units={units}
              isLoadingProducts={isLoadingProducts}
              clearOnChoose={getDocLinePref('clearProductSearch')}
              autoOpenWhenEmpty={getDocLinePref('autoOpenProductOnEmpty') && !line.product_id}
              priceDisplayMode={priceDisplayMode}
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
              <LotCell line={line} idx={idx} disabled={disabled} onUpdate={onUpdate as (idx: number, patch: Partial<LineItem>) => void} />
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
              id={`doc-line-${idx}-qty`}
              value={line.quantity}
              min={0.001}
              step={1}
              onChange={(v) => onUpdate(idx, { quantity: toNum(v) })}
              disabled={disabled}
              highlight={hasStockWarning && !stockValidation.blocking}
            />
          </td>
        )}

        {col('total_qty') && (
          <td style={{ padding: '3px 4px' }}>
            <TotalQtyInput id={`doc-line-${idx}-total_qty`} baseQty={baseQty} _packQty={line._packQty} disabled={disabled} onUpdate={(v) => {
              const newQty = line._packQty > 1 ? v / line._packQty : v;
              onUpdate(idx, { quantity: newQty });
            }} />
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
              id={`doc-line-${idx}-price`}
              value={line.unit_price_ht}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { unit_price_ht: toNum(v) })}
              disabled={disabled}
              readOnly={!canEditPrice}
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
              readOnly={!canEditPrice}
            />
          </td>
        )}

        {col('orig_price') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t4)' }}>
            {fmtDZD((line as any).orig_price ?? 0)}
          </td>
        )}

        {col('discount') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <select
                style={{ ...cellStyle(), width: 40, padding: '5px 2px', fontSize: 10 }}
                value={line.discount_mode}
                disabled={disabled || !canApplyDiscount}
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
                readOnly={!canApplyDiscount}
              />
            </div>
          </td>
        )}

        {col('price_after') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: discountAmt > 0 ? 'var(--em)' : 'var(--t3)' }}>
            {fmtDZD(priceDisplayMode === 'ttc' ? ttc : ht)}
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
            fontSize: 11, color: (() => {
              if (!canViewCost || isPurchase || !prod) return 'var(--t2)';
              const costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
              if (!costPrice || !line.unit_price_ht) return 'var(--t2)';
              const marginPct = ((line.unit_price_ht - costPrice) / line.unit_price_ht) * 100;
              const marginThreshold = (prod as any)?.min_margin_percentage ?? 5;
              return marginPct < 0 ? 'var(--red)' : marginPct < marginThreshold ? 'var(--orange)' : 'var(--green)';
            })() }}>
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
              const marginThreshold = (prod as any)?.min_margin_percentage ?? 5;
              const color  = marginPct < marginThreshold ? 'var(--red)' : marginPct < 10 ? 'var(--orange)' : 'var(--green)';
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
            colSpan={subRowColSpan}
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
            colSpan={subRowColSpan}
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
