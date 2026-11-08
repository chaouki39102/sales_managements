// pages/portal/orders-admin/components/OrderLinesEditorSection.tsx
// Editable order lines (quantity / unit price / discount) + add-product search.
import { fmt } from '../ordersAdminUtils';
import type { DraftLine } from '../types';
import type { WithLoadedOrder } from '../hooks/useAdminOrderDetail';
import StockCell from './StockCell';

export default function OrderLinesEditorSection(props: WithLoadedOrder) {
  const {
    draft,
    setDraft,
    addQuery,
    setAddQuery,
    addQty,
    setAddQty,
    productSearch,
    addProduct,
    productResults,
    order,
    stockByLine,
  } = props;

  return (
    <div className="poa-sec">
      <div className="poa-sec-t">
        <i className="ti ti-edit" /> تحرير المنتجات
        <span className="poa-hint poa-hint--auto">
          <i className="ti ti-info-circle" /> الكمية 0 تحذف المنتج — سعر الوحدة والخصم قابلان للتعديل
        </span>
      </div>

      <div className="poa-edit-wrap">
      <table className="poa-edit-tbl">
        <thead>
          <tr>
            <th className="poa-tas">المنتج</th>
            <th className="poa-tac">الكمية</th>
            <th className="poa-tac">سعر الوحدة HT</th>
            <th className="poa-tac">الخصم %</th>
            <th className="poa-tac">TVA</th>
            <th className="poa-tac">المخزون</th>
            <th className="poa-tae">المجموع TTC</th>
            <th className="poa-taw40"></th>
          </tr>
        </thead>
        <tbody>
          {draft.map((l, i) => {
            const stock = l.line_id !== null ? stockByLine.get(l.line_id) : undefined;
            const insufficient = stock && stock.available !== null && l.quantity * l.pack_qty > stock.available;
            const baseQty = Math.max(0, l.quantity) * (l.pack_qty > 0 ? l.pack_qty : 1);
            const gross = baseQty * (l.unit_price_ht ?? 0);
            const dPct = Math.min(100, Math.max(0, l.discount_percentage ?? 0));
            // نفس المسار الذي يطبقه الخادم: خصم مبلغ ثابت ما لم يلمس
            // المسؤول النسبة، وإلا نسبة مئوية.
            const isFixed = !l.discountTouched && l.fixedDiscPerUnit > 0;
            const discAmt = isFixed
              ? l.fixedDiscPerUnit * baseQty
              : gross * (dPct / 100);
            const lineHt = gross - discAmt;
            const lineTtc = lineHt * (1 + (l.tva_rate ?? 0) / 100);
            // نسبة مئوية فعّالة للعرض في حقل الخصم (خط ثابت غير ملموس).
            const effectivePct = isFixed
              ? Math.min(100, (l.fixedDiscPerUnit / Math.max(0.0001, l.unit_price_ht ?? 0)) * 100)
              : dPct;
            const setField = (patch: Partial<DraftLine>) =>
              setDraft((d) => d.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
            return (
              <tr key={l.line_id ?? `new-${i}`}>
                <td>
                  <div className="poa-item-name">{l.product_name}</div>
                  <div className="poa-item-ref">
                    {l.product_ref}
                    {l.pack_qty > 1 ? <span className="poa-pack-note"> · تعبئة × {l.pack_qty}</span> : null}
                  </div>
                </td>
                <td className="poa-tac">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={l.quantity}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      setField({ quantity: Number.isFinite(q) ? q : 0 });
                    }}
                    className={`poa-alloc${insufficient ? ' bad' : ''}`}
                  />
                  {l.unit_name ? <span className="poa-unit-note">{l.unit_name}</span> : null}
                </td>
                <td className="poa-tac">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={l.unit_price_ht ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setField({
                        unit_price_ht: Number.isFinite(v) && v >= 0 ? v : 0,
                        priceTouched: true,
                      });
                    }}
                    className="poa-alloc poa-price"
                  />
                </td>
                <td className="poa-tac">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={isFixed ? effectivePct : l.discount_percentage ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setField({
                        discount_percentage: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0,
                        discountTouched: true,
                      });
                    }}
                    className="poa-alloc poa-disc"
                  />
                  {isFixed && (
                    <div
                      className="poa-fixed-disc"
                      title={`خصم مبلغ ثابت من طبقة الكميات (${fmt(l.fixedDiscPerUnit * baseQty)} دج) — كتابة نسبة تحوّله إلى خصم %`}
                    >
                      <i className="ti ti-lock" /> ثابت {fmt(l.fixedDiscPerUnit * baseQty)} دج
                    </div>
                  )}
                </td>
                <td className="poa-tac">
                  <span className="poa-bold">
                    {l.tva_rate_live ?? l.tva_rate ?? 0}%
                  </span>
                  {!!order?.party?.is_tva_exempt && (l.tva_rate_live ?? 0) > (l.tva_rate ?? 0) && (
                    <span className="poa-exempt" title="معفى جبائياً — نُطبق 0%">معفى</span>
                  )}
                </td>
                <td className="poa-tac">
                  <StockCell stock={stock} />
                  {insufficient && (
                    <div className="poa-stock-over">
                      يتجاوز المخزون
                    </div>
                  )}
                </td>
                <td className="poa-tae">
                  <b className="poa-cell-ttc">{fmt(lineTtc)}</b>
                </td>
                <td className="poa-tac">
                  <button
                    type="button"
                    className="icon-btn hover-red"
                    onClick={() => setDraft((d) => d.filter((_, xi) => xi !== i))}
                    title="حذف المنتج"
                  >
                    <i className="ti ti-trash" />
                  </button>
                </td>
              </tr>
            );
          })}
          {draft.length === 0 && (
            <tr>
              <td colSpan={8} className="poa-tbl-empty">
                لا توجد منتجات — أضف منتجاً من الأسفل
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* إضافة منتج */}
      <div className="poa-addbox">
        <div className="poa-hint"><i className="ti ti-plus" /> إضافة منتج للطلب</div>
        <div className="poa-addrow">
          <input
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="ابحث بالاسم أو المرجع..."
            className="poa-add-input"
          />
          <input
            type="number"
            min={1}
            step="any"
            value={addQty}
            onChange={(e) => setAddQty(Number(e.target.value) || 1)}
            className="poa-alloc poa-add-qty"
            title="الكمية"
          />
        </div>
        {addQuery.trim().length >= 2 && (
          <div className="poa-search-box">
            {productSearch.isLoading && (
              <div className="poa-search-msg">جاري البحث...</div>
            )}
            {!productSearch.isLoading && productResults.length === 0 && (
              <div className="poa-search-msg">لا توجد منتجات مطابقة</div>
            )}
            {productResults.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => addProduct(v)}
                className="poa-search-row"
              >
                <span className="poa-search-name">
                  {v.name}
                  <span className="poa-search-sub">
                    {[v.ref, v.unit?.symbol].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="poa-search-price">{fmt(v.default_selling_price_ht ?? 0)} دج</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
