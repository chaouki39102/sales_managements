// Tab "التعبئة" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import { s } from '../ui/styles';
import Toggle from '../ui/Toggle';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderPackagingsTab(ctx: ProductModalCtx) {
  const {
    form, setCopyModalOpen, addPackaging, updatePackaging, removePackaging, movePackaging,
  } = ctx;

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-package" title="وحدات التعبئة" subtitle="تعريف مختلف وحدات البيع: وحدة، كرتون، باليطة..." />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>
          {form.packagings.length === 0 ? 'المنتج يُباع بوحدته الأساسية' : `${form.packagings.length} وحدة تعبئة مُعرَّفة`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setCopyModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="ti ti-copy" style={{ fontSize: 14 }} /> نسخ من منتج آخر
          </button>
          <button
            onClick={addPackaging}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة تعبئة
          </button>
        </div>
      </div>

      {form.packagings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)' }}>
          <i className="ti ti-package" style={{ fontSize: 40, opacity: 0.3 }} />
          <div style={{ marginTop: 12, fontSize: 13 }}>لا توجد تعبئات مُعرَّفة</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أمثلة: وحدة (UN, ×1) | فاردو (FD, ×12) | باليطة (PLT, ×240)</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 70px 1fr 90px 1fr 60px 60px 60px auto', gap: 8, padding: '0 10px' }}>
            {['', 'الكود', 'الاسم', 'الكمية', 'الباركود', 'افتراضي', 'نشط', 'الترتيب', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {form.packagings.map((pkg, idx) => (
            <div key={idx} style={{
              display: 'grid', gridTemplateColumns: '28px 70px 1fr 90px 1fr 60px 60px 60px auto',
              gap: 8, alignItems: 'center', padding: '10px 10px',
              borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)',
            }}>
              {/* رقم الصف */}
              <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</div>
              {/* الكود */}
              <input
                placeholder="UN"
                style={{ ...s.inp(), textTransform: 'uppercase', fontSize: 12, fontFamily: 'monospace' }}
                value={pkg.code}
                onChange={e => updatePackaging(idx, 'code', e.target.value.toUpperCase())}
              />
              {/* الاسم */}
              <input
                placeholder="قارورة"
                style={{ ...s.inp(), fontSize: 12 }}
                value={pkg.label}
                onChange={e => updatePackaging(idx, 'label', e.target.value)}
              />
              {/* الكمية */}
              <input
                type="number" min="0.0001" step="1"
                placeholder="1"
                style={{ ...s.inp(), fontSize: 12 }}
                value={pkg.quantity}
                onChange={e => updatePackaging(idx, 'quantity', e.target.value ? +e.target.value : '')}
              />
              {/* الباركود */}
              <input
                placeholder="باركود"
                style={{ ...s.inp(), fontSize: 11, fontFamily: 'monospace' }}
                value={pkg.barcode}
                onChange={e => updatePackaging(idx, 'barcode', e.target.value)}
              />
              {/* افتراضي */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="radio" name="default_pkg" checked={pkg.is_default}
                  onChange={() => updatePackaging(idx, 'is_default', true)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
              </div>
              {/* نشط */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={pkg.active} onChange={v => updatePackaging(idx, 'active', v)} label="" />
              </div>
              {/* الترتيب */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <button
                  onClick={() => movePackaging(idx, -1)} disabled={idx === 0}
                  style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--b2)', background: 'var(--bg3)', color: idx === 0 ? 'var(--b3)' : 'var(--t3)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 11 }}
                ><i className="ti ti-chevron-up" /></button>
                <button
                  onClick={() => movePackaging(idx, 1)} disabled={idx === form.packagings.length - 1}
                  style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--b2)', background: 'var(--bg3)', color: idx === form.packagings.length - 1 ? 'var(--b3)' : 'var(--t3)', cursor: idx === form.packagings.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11 }}
                ><i className="ti ti-chevron-down" /></button>
              </div>
              {/* حذف */}
              <button
                onClick={() => removePackaging(idx)}
                style={{ padding: '6px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--redbo)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      {form.packagings.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--t4)', padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13, marginLeft: 5 }} />
          <strong>الكمية</strong> تمثل عدد الوحدات الأساسية في هذه التعبئة.
          سعر التعبئة = سعر الوحدة × الكمية.
          يجب أن يكون الكود فريداً لكل منتج.
        </div>
      )}
    </div>
  );
}
