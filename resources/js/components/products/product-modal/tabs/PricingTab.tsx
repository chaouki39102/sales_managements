// Tab "الأسعار" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import { fmtMoneyOrDash as fmtDZD } from '@/lib/format';
import type { PriceLevel } from '@/lib/api/core/types';
import { PRICING_METHODS } from '../constants';
import { fmtPct, computeSellingPrice, computeMarginPct } from '../helpers';
import { s } from '../ui/styles';
import Toggle from '../ui/Toggle';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderPricingTab(ctx: ProductModalCtx) {
  const {
    form, priceLevels, updatePrice,
  } = ctx;

  const lvls = priceLevels as PriceLevel[];
  const purchasePrice = Number(form.purchase_price_ht) || 0;
  const minMargin = form.min_margin_percentage !== null && form.min_margin_percentage !== '' ? Number(form.min_margin_percentage) : null;

  if (!lvls.length) return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--t4)' }}>
      <i className="ti ti-tag" style={{ fontSize: 40, opacity: 0.3 }} />
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700 }}>لا توجد مستويات أسعار معرفة</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>أضف مستويات الأسعار من الإعدادات ← مستويات الأسعار</div>
    </div>
  );

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-tag" title="أسعار البيع" subtitle="حدد طريقة حساب السعر لكل مستوى" />

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {PRICING_METHODS.map(m => (
          <div key={m.value} style={{ padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <i className={`ti ${m.icon}`} style={{ fontSize: 16, color: 'var(--em)', marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{m.label}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{m.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {purchasePrice > 0 && (
        <div style={{ ...s.card, background: 'var(--emb)', border: '1px solid var(--embo)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-shopping-cart" style={{ color: 'var(--em)', fontSize: 18 }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>سعر الشراء الأساسي: </span>
            <strong style={{ color: 'var(--em)', fontSize: 14 }}>{fmtDZD(purchasePrice)}</strong>
          </div>
          {minMargin !== null && (
            <div style={{ marginRight: 'auto', fontSize: 11, color: 'var(--t3)' }}>
              الهامش الأدنى: <strong>{minMargin}%</strong>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lvls.map(pl => {
          const pr = form.prices.find(p => p.price_level_id === pl.id) ?? {
            price_level_id: pl.id, pricing_method: 'fixed' as const,
            price: '', rate: '', margin: '', active: true,
          };
          const method = pr.pricing_method;
          const sellingPrice = computeSellingPrice(pr, purchasePrice);
          const marginPct = computeMarginPct(sellingPrice, purchasePrice);
          const marginWarn = minMargin !== null && sellingPrice > 0 && marginPct < minMargin;

          return (
            <div key={pl.id} style={{
              display: 'grid', gridTemplateColumns: '160px 130px 1fr auto',
              gap: 10, alignItems: 'center',
              padding: '12px 16px', borderRadius: 'var(--r2)',
              border: `1px solid ${marginWarn ? 'var(--redbo)' : pr.active ? 'var(--b2)' : 'var(--b1)'}`,
              background: marginWarn ? 'var(--redb)' : pr.active ? 'var(--bg2)' : 'var(--bg3)',
              opacity: pr.active ? 1 : 0.55, transition: 'all .15s',
            }}>
              {/* اسم المستوى + preview */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{pl.name}</div>
                {sellingPrice > 0 ? (
                  <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--em)', fontWeight: 700 }}>{fmtDZD(sellingPrice)}</span>
                    <span style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 6, fontWeight: 700,
                      background: marginWarn ? 'var(--redbo)' : 'var(--greenb)',
                      color: marginWarn ? 'var(--red)' : 'var(--green)',
                    }}>
                      {marginPct >= 0 ? '+' : ''}{fmtPct(marginPct)}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>غير محدد</div>
                )}
              </div>

              {/* طريقة الحساب */}
              <select
                style={{ ...s.sel(), fontSize: 12 }}
                value={method}
                onChange={e => updatePrice(pl.id, 'pricing_method', e.target.value as any)}
              >
                {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>

              {/* القيمة */}
              <div style={{ position: 'relative' }}>
                <input
                  type="number" min="0" step="0.01"
                  style={{ ...s.inp(), fontSize: 12, paddingLeft: method === 'rate' ? 28 : 36 }}
                  value={
                    method === 'fixed'  ? (pr.price  ?? '') :
                    method === 'rate'   ? (pr.rate   ?? '') :
                                         (pr.margin  ?? '')
                  }
                  onChange={e => {
                    const k = method === 'fixed' ? 'price' : method === 'rate' ? 'rate' : 'margin';
                    updatePrice(pl.id, k as any, e.target.value === '' ? '' : +e.target.value);
                    if (method === 'fixed')  { updatePrice(pl.id, 'rate', '');  updatePrice(pl.id, 'margin', ''); }
                    if (method === 'rate')   { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'margin', ''); }
                    if (method === 'margin') { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'rate', '');  }
                  }}
                  placeholder={method === 'rate' ? '15' : '0.00'}
                />
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>
                  {method === 'rate' ? '%' : 'دج'}
                </span>
              </div>

              {/* تفعيل */}
              <Toggle checked={pr.active} onChange={v => updatePrice(pl.id, 'active', v)} label="" />
            </div>
          );
        })}
      </div>

      {/* ملاحظة TVA */}
      {form.tva_id && (
        <div style={{ fontSize: 11, color: 'var(--t4)', padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
          <i className="ti ti-receipt-tax" style={{ fontSize: 13, marginLeft: 5 }} />
          الأسعار أعلاه هي <strong>HT</strong> (بدون TVA). سعر TTC = السعر × (1 + نسبة TVA / 100)
        </div>
      )}
    </div>
  );
}
