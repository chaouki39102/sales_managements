// Tab "الخصومات" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import type { PriceLevel } from '@/lib/api/core/types';
import { s } from '../ui/styles';
import Toggle from '../ui/Toggle';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderDiscountsTab(ctx: ProductModalCtx) {
  const {
    form, setCopyModalOpen, priceLevels, switchTab, addDiscount, updateDiscount, removeDiscount,
  } = ctx;

  const lvls = priceLevels as PriceLevel[];

  if (!form.manages_quantity_discounts) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--t4)' }}>
        <i className="ti ti-discount-off" style={{ fontSize: 40, opacity: 0.3 }} />
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>خصومات الكمية معطّلة</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>فعّل خيار &ldquo;خصومات الكمية&rdquo; في تاب المخزون أولاً</div>
        <button
          onClick={() => switchTab('stock')}
          style={{ marginTop: 16, padding: '8px 20px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          <i className="ti ti-settings" style={{ marginLeft: 5 }} /> الذهاب لتاب المخزون
        </button>
      </div>
    );
  }

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-discount" title="خصومات الكمية" subtitle="تحديد خصومات تلقائية حسب الكمية المباعة لكل مستوى سعر" />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setCopyModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          <i className="ti ti-copy" style={{ fontSize: 14 }} /> نسخ من منتج آخر
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--t3)', ...s.card }}>
        <i className="ti ti-info-circle" style={{ fontSize: 13, marginLeft: 5 }} />
        يمكن تحديد خصم كمبلغ ثابت (دج) أو كنسبة مئوية (%). إذا حُدِّد كلاهما فالأفضلية للنسبة المئوية.
      </div>

      {lvls.map(pl => {
        const discountsForLevel = form.quantity_discounts.filter(d => d.price_level_id === pl.id);
        return (
          <div key={pl.id} style={{ ...s.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-tag" style={{ fontSize: 15, color: 'var(--em)' }} />
                {pl.name}
                {discountsForLevel.length > 0 && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--emb)', color: 'var(--em)', fontWeight: 700 }}>
                    {discountsForLevel.length} شرط
                  </span>
                )}
              </div>
              <button
                onClick={() => addDiscount(pl.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <i className="ti ti-plus" style={{ fontSize: 12 }} /> إضافة شرط
              </button>
            </div>

            {discountsForLevel.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '16px 0' }}>لا توجد شروط خصم لهذا المستوى</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 90px 90px 40px 40px auto', gap: 8, padding: '0 4px' }}>
                  {['من كمية', 'حتى كمية', 'خصم (دج)', 'خصم (%)', 'مجمد', 'نشط', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>
                {form.quantity_discounts.map((d, idx) => {
                  if (d.price_level_id !== pl.id) return null;
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 80px 90px 90px 40px 40px auto', gap: 8, alignItems: 'center', padding: '8px', borderRadius: 'var(--r1)', border: '1px solid var(--b1)', background: 'var(--bg2)' }}>
                      <input type="number" min="1" step="1" placeholder="1" style={{ ...s.inp(), fontSize: 12 }} value={d.min_qty ?? ''} onChange={e => updateDiscount(idx, 'min_qty', e.target.value ? +e.target.value : '')} />
                      <input type="number" min="1" step="1" placeholder="—" style={{ ...s.inp(), fontSize: 12 }} value={d.max_qty ?? ''} onChange={e => updateDiscount(idx, 'max_qty', e.target.value ? +e.target.value : null)} />
                      <input type="number" min="0" step="0.01" placeholder="0.00" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_amount ?? ''} onChange={e => updateDiscount(idx, 'discount_amount', e.target.value ? +e.target.value : null)} />
                      <input type="number" min="0" max="100" step="0.1" placeholder="0.0" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_percentage ?? ''} onChange={e => updateDiscount(idx, 'discount_percentage', e.target.value ? +e.target.value : null)} />
                      <div style={{ textAlign: 'center', cursor: 'pointer' }} title={d.is_blocked ? 'مجمد — انقر لإلغاء التجميد' : 'انقر للتجميد'} onClick={() => updateDiscount(idx, 'is_blocked', !d.is_blocked)}>
                        <i className={`ti ${d.is_blocked ? 'ti-lock' : 'ti-lock-open'}`} style={{ fontSize: 15, color: d.is_blocked ? 'var(--red)' : 'var(--t4)' }} />
                      </div>
                      <Toggle checked={d.active} onChange={v => updateDiscount(idx, 'active', v)} label="" />
                      <button onClick={() => removeDiscount(idx)} style={{ padding: '5px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--redbo)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
