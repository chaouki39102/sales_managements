// Tab "المخزون" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import QuickAddLookupButton from '@/components/ui/QuickAddLookupButton';
import type { ValuationMethod } from '../types';
import { s } from '../ui/styles';
import Field from '../ui/Field';
import Toggle from '../ui/Toggle';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderStockTab(ctx: ProductModalCtx) {
  const {
    product, form, setForm, setIsDirty, units, valuationMethods, set,
  } = ctx;
  // Same derivation as useProductModal; kept local so TS narrows `product` through it.
  const isEdit = !!product;

  const stockDisabled = !form.manages_stock;
  return (
    <div style={s.section}>
      <SectionHeader icon="ti-building-warehouse" title="إدارة المخزون" subtitle="إعدادات التتبع والتنبيهات والتقييم" />

      {/* toggle manages_stock */}
      <div style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Toggle
            checked={form.manages_stock}
            onChange={v => {
              setForm(f => ({ ...f, manages_stock: v, allow_negative_stock: v ? f.allow_negative_stock : false }));
              setIsDirty(true);
            }}
            label="إدارة المخزون"
          />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, marginRight: 44 }}>فعّل لتتبع الكميات والتنبيهات وطريقة التقييم</div>
        </div>
        {form.manages_stock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--r2)', background: 'var(--emb)', border: '1px solid var(--embo)' }}>
            <i className="ti ti-check" style={{ fontSize: 14, color: 'var(--em)' }} />
            <span style={{ fontSize: 11, color: 'var(--em)', fontWeight: 700 }}>مفعّل</span>
          </div>
        )}
      </div>

      {/* خيارات المخزون */}
      <div style={{ opacity: stockDisabled ? 0.4 : 1, pointerEvents: stockDisabled ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'allow_negative_stock', label: 'السماح بمخزون سالب', hint: 'يتيح البيع حتى عند نفاد المخزون (للمنتجات المصنوعة عند الطلب)' },
            { key: 'has_lots',             label: 'إدارة الدفعات (Lots)', hint: 'تتبع دفعات الإنتاج والشراء — لازم لـ FIFO و LIFO' },
            { key: 'has_expiration_date',  label: 'تتبع تاريخ الصلاحية', hint: 'متاح فقط عند تفعيل إدارة الدفعات' },
            { key: 'manages_quantity_discounts', label: 'تفعيل خصومات الكمية', hint: 'تحديد خصومات تلقائية عند شراء كميات كبيرة' },
          ].map(opt => (
            <div key={opt.key} style={{ ...s.card }}>
              <Toggle
                checked={(form as any)[opt.key]}
                onChange={v => { set(opt.key as any, v); }}
                label={opt.label}
                disabled={opt.key === 'has_expiration_date' && !form.has_lots}
              />
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, marginRight: 44 }}>{opt.hint}</div>
            </div>
          ))}
        </div>

        {/* تنبيهات المخزون */}
        <div style={s.divider} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 15, color: '#f59e0b' }} />
          تنبيهات المخزون
        </div>
        <div style={s.row2}>
          <Field label="الحد الأدنى للتنبيه" hint="تنبيه عند الوصول لهذه الكمية أو ما دونها">
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" step="1"
                style={{ ...s.inp(), paddingLeft: 50 }}
                value={form.min_stock_alert}
                onChange={e => set('min_stock_alert', e.target.value === '' ? '' : +e.target.value)}
                placeholder="10"
              />
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>وحدة</span>
            </div>
          </Field>
          <Field label="الحد الأقصى المخزون" hint="تنبيه عند تجاوز هذه الكمية (اختياري)">
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" step="1"
                style={{ ...s.inp(), paddingLeft: 50 }}
                value={form.max_stock_alert}
                onChange={e => set('max_stock_alert', e.target.value === '' ? '' : +e.target.value)}
                placeholder="500"
              />
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>وحدة</span>
            </div>
          </Field>
        </div>

        {/* طريقة التقييم */}
        <div style={s.divider} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-calculator" style={{ fontSize: 15, color: 'var(--em)' }} />
          طريقة تقييم المخزون
        </div>
        <Field label="طريقة التقييم" hint="تُستخدم لحساب تكلفة البضاعة المباعة وقيمة المخزون">
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <select
              style={{ ...s.sel(), flex: 1 }}
              value={form.valuation_method_id ?? ''}
              onChange={e => set('valuation_method_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— استخدام الإعداد الافتراضي للشركة —</option>
              {(valuationMethods as ValuationMethod[]).map(vm => (
                <option key={vm.id} value={vm.id}>{vm.name}{vm.method ? ` (${vm.method})` : ''}</option>
              ))}
            </select>
            <QuickAddLookupButton
              title="إضافة طريقة تقييم جديدة"
              resourcePath="valuation-methods"
              fields={[{ name: 'name', label: 'اسم الطريقة', required: true }]}
              onCreated={item => set('valuation_method_id', item.id)}
            />
          </div>
        </Field>

        {/* مخزون حالي (read-only عند التعديل) */}
        {isEdit && product?.current_stock !== undefined && (
          <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: product.is_low_stock ? 'var(--redb)' : 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${product.is_low_stock ? 'ti-alert-triangle' : 'ti-box'}`} style={{ fontSize: 18, color: product.is_low_stock ? 'var(--red)' : 'var(--em)' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>المخزون الحالي</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: product.is_low_stock ? 'var(--red)' : 'var(--t1)' }}>
                {Number(product.current_stock).toFixed(2)}
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--t4)', marginRight: 4 }}>
                  {(units as any[]).find((u: any) => u.id === form.unit_id)?.symbol ?? 'وحدة'}
                </span>
              </div>
              {product.is_low_stock && (
                <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>⚠ أقل من الحد الأدنى!</div>
              )}
            </div>
            <div style={{ marginRight: 'auto', fontSize: 10, color: 'var(--t4)' }}>للقراءة فقط — يتغير عبر حركات المخزون</div>
          </div>
        )}
      </div>
    </div>
  );
}
