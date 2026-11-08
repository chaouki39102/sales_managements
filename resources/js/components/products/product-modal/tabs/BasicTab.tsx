// Tab "الأساسيات" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import QuickAddLookupButton from '@/components/ui/QuickAddLookupButton';
import { fmtMoneyOrDash as fmtDZD } from '@/lib/format';
import type { Family, Brand, ProductType } from '@/lib/api/core/types';
import type { TvaRate } from '../types';
import { slugify } from '../helpers';
import { s } from '../ui/styles';
import Field from '../ui/Field';
import Toggle from '../ui/Toggle';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderBasicTab(ctx: ProductModalCtx) {
  const {
    product, nameRef, slugEdited, form, setForm, errors, setIsDirty, copied, setShowBarcodeScanner, families,
    brands, units, tvas, productTypes, regulatedProducts, set, validateField, copyBarcode,
    handleGenerateBarcode,
  } = ctx;
  // Same derivation as useProductModal; kept local so TS narrows `product` through it.
  const isEdit = !!product;

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-info-circle" title="المعلومات الأساسية" subtitle="البيانات الرئيسية للمنتج" />

      {/* اسم + نشط */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
        <Field label="اسم المنتج" error={errors.name} required>
          <input
            ref={nameRef}
            style={s.inp(!!errors.name)}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            onBlur={() => validateField('name')}
            placeholder="مثال: حليب نصف دسم 1 لتر"
          />
        </Field>
        <Toggle checked={form.active} onChange={v => set('active', v)} label="نشط" />
      </div>

      {/* Slug */}
      <Field label="Slug الرابط" hint="يُولَّد تلقائياً من الاسم — اضغط للتعديل اليدوي">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace', fontSize: 12, flex: 1, color: 'var(--t3)' }}
            value={form.slug}
            onChange={e => {
              slugEdited.current = true;
              set('slug', e.target.value);
            }}
            placeholder="my-product-name"
          />
          <button
            type="button"
            onClick={() => { slugEdited.current = false; set('slug', slugify(form.name)); }}
            style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t3)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
            title="إعادة توليد من الاسم"
          >
            <i className="ti ti-refresh" style={{ fontSize: 13 }} />
          </button>
        </div>
      </Field>

      {/* REF + Barcode */}
      <div style={s.row2}>
        <Field label="المرجع (SKU)" hint="مرجع داخلي فريد للمنتج">
          <input style={s.inp()} value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="PROD-001" />
        </Field>
        <Field label="الباركود">
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace', flex: 1 }}
              value={form.barcode}
              onChange={e => set('barcode', e.target.value)}
              placeholder="6121234567890"
            />
            <button type="button" onClick={handleGenerateBarcode}
              style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', cursor: 'pointer', fontSize: 12 }}
              title="توليد باركود فريد جديد">
              <i className="ti ti-dice" style={{ fontSize: 13 }} />
            </button>
            <button type="button" onClick={() => setShowBarcodeScanner(true)}
              style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', cursor: 'pointer', fontSize: 12 }}
              title="مسح الباركود بالكاميرا">
              <i className="ti ti-camera" style={{ fontSize: 13 }} />
            </button>
            {form.barcode && (
              <button
                type="button"
                onClick={copyBarcode}
                style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: copied ? 'var(--greenb)' : 'var(--bg3)', color: copied ? 'var(--green)' : 'var(--t3)', cursor: 'pointer', fontSize: 12 }}
                title="نسخ الباركود"
              >
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: 13 }} />
              </button>
            )}
          </div>
        </Field>
      </div>

      {/* الوصف */}
      <Field label="الوصف">
        <textarea
          style={{ ...s.inp(), resize: 'vertical', minHeight: 80 }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="وصف تفصيلي للمنتج، مزاياه، استخداماته..."
        />
        <span style={{ ...s.hint, textAlign: 'end', marginTop: 2 }}>{form.description.length} حرف</span>
      </Field>

      <div style={s.divider} />
      <SectionHeader icon="ti-category" title="التصنيف والتنويع" subtitle="ربط المنتج بالتصنيفات المناسبة" />

      {/* family + brand + type */}
      <div style={s.row3}>
        <Field label="التصنيف (Family)">
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <select style={{ ...s.sel(), flex: 1 }} value={form.family_id ?? ''} onChange={e => set('family_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <QuickAddLookupButton
              title="إضافة تصنيف جديد"
              resourcePath="families"
              fields={[{ name: 'name', label: 'اسم التصنيف', required: true }]}
              onCreated={item => set('family_id', item.id)}
            />
          </div>
        </Field>
        <Field label="العلامة التجارية">
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <select style={{ ...s.sel(), flex: 1 }} value={form.brand_id ?? ''} onChange={e => set('brand_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <QuickAddLookupButton
              title="إضافة علامة تجارية جديدة"
              resourcePath="brands"
              fields={[{ name: 'name', label: 'اسم العلامة التجارية', required: true }]}
              onCreated={item => set('brand_id', item.id)}
            />
          </div>
        </Field>
        <Field label="نوع المنتج">
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <select
              style={{ ...s.sel(), flex: 1 }}
              value={form.product_type_id ?? ''}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                const pt = (productTypes as ProductType[]).find(t => t.id === id);
                setForm(f => ({ ...f, product_type_id: id, manages_stock: pt?.manages_stock ?? f.manages_stock }));
                setIsDirty(true);
              }}
            >
              <option value="">— اختر —</option>
              {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <QuickAddLookupButton
              title="إضافة نوع منتج جديد"
              resourcePath="product-types"
              fields={[{ name: 'name', label: 'اسم النوع', required: true }]}
              onCreated={item => {
                set('product_type_id', item.id);
                if (item.manages_stock !== undefined) {
                  setForm(f => ({ ...f, product_type_id: item.id, manages_stock: item.manages_stock }));
                }
              }}
            />
          </div>
        </Field>
      </div>

      <div style={s.divider} />
      <SectionHeader icon="ti-package-off" title="الدعم والمواد المدعمة" subtitle="تحديد إذا كان المنتج مدعماً من الدولة وربطه بالمادة المقننة" />

      <div style={s.row2}>
        <Field label="منتج مدعم" hint="المنتجات المدعمة تخضع لضريبة IFU على الهامش (5%) بدلاً من IFU على المشتريات">
          <Toggle checked={form.is_subsidized} onChange={v => {
            set('is_subsidized', v);
            if (!v) set('regulated_product_config_id', null);
          }} label={form.is_subsidized ? 'مدعم' : 'غير مدعم'} />
        </Field>
        {form.is_subsidized && (
          <Field label="المادة المقننة" hint="اختر المادة التي ينتمي إليها هذا المنتج" required>
            <select style={s.sel()} value={form.regulated_product_config_id ?? ''}
              onChange={e => set('regulated_product_config_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر المادة المقننة —</option>
              {regulatedProducts.map((rp: any) => (
                <option key={rp.id} value={rp.id}>{rp.label} ({rp.unit_label}) — {rp.category}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div style={s.divider} />
      <SectionHeader icon="ti-calculator" title="الأسعار الأساسية والضريبة" subtitle="سعر الشراء ومعدل TVA — يُستخدمان لحساب أسعار البيع" />

      {/* TVA + Unit + سعر الشراء + الهامش الأدنى */}
      <div style={s.row2}>
        <Field label="معدل TVA" error={errors.tva_id} required>
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <select style={{ ...s.sel(!!errors.tva_id), flex: 1 }} value={form.tva_id ?? ''} onChange={e => set('tva_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(tvas as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%{t.is_default ? ' ✓' : ''}</option>)}
            </select>
            <QuickAddLookupButton
              title="إضافة معدل TVA جديد"
              resourcePath="tvas"
              fields={[
                { name: 'rate', label: 'النسبة %', type: 'number', required: true },
              ]}
              onCreated={item => set('tva_id', item.id)}
            />
          </div>
        </Field>
        <Field label="وحدة القياس">
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <select style={{ ...s.sel(), flex: 1 }} value={form.unit_id ?? ''} onChange={e => set('unit_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(units as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </select>
            <QuickAddLookupButton
              title="إضافة وحدة قياس جديدة"
              resourcePath="units"
              fields={[
                { name: 'name', label: 'اسم الوحدة', required: true },
                { name: 'symbol', label: 'الرمز (مثل: كغ، لتر، قطعة)', required: true },
              ]}
              onCreated={item => set('unit_id', item.id)}
            />
          </div>
        </Field>
      </div>

      {/* يُباع بالوزن */}
      <div style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Toggle
            checked={form.is_sold_by_weight}
            onChange={v => set('is_sold_by_weight', v)}
            label="يُباع بالوزن (Weight)"
          />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, marginRight: 44 }}>في الـ POS يُفتح نافذة إدخال الوزن بدلاً من الكمية — للمنتجات المشروطة والموزونة</div>
        </div>
      </div>

      <div style={s.row2}>
        <Field label="سعر الشراء HT *" error={errors.purchase_price_ht} hint="المبلغ بدون TVA — يُستخدم كأساس لحساب أسعار البيع والهوامش" required>
          <div style={{ position: 'relative' }}>
            <input
              type="number" min="0" step="0.01"
              style={{ ...s.inp(!!errors.purchase_price_ht), paddingLeft: 40 }}
              value={form.purchase_price_ht}
              onChange={e => set('purchase_price_ht', e.target.value === '' ? '' : +e.target.value)}
              onBlur={() => validateField('purchase_price_ht')}
              placeholder="0.00"
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>دج</span>
          </div>
        </Field>
        <Field label="الحد الأدنى لهامش الربح %" hint="تحذير تلقائي عند انخفاض هامش سعر البيع عن هذه النسبة">
          <div style={{ position: 'relative' }}>
            <input
              type="number" min="0" max="100" step="0.01"
              style={{ ...s.inp(), paddingLeft: 30 }}
              value={form.min_margin_percentage === null ? '' : form.min_margin_percentage}
              onChange={e => set('min_margin_percentage', e.target.value === '' ? null : +e.target.value)}
              placeholder="0.00"
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--t4)' }}>%</span>
          </div>
        </Field>
      </div>

      {/* تكلفة صافية (read-only في حالة التعديل) */}
      {isEdit && (product?.current_cost_price ?? 0) > 0 && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="ti ti-coin" style={{ fontSize: 20, color: 'var(--gold)' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>التكلفة الحالية المُحسَبة (PMP/FIFO)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{fmtDZD(product.current_cost_price)}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginRight: 'auto' }}>للقراءة فقط — تُحسَب من حركات المخزون</div>
        </div>
      )}
    </div>
  );
}
