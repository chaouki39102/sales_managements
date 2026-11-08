// Tab "الأبعاد" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import { s } from '../ui/styles';
import Field from '../ui/Field';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderDimensionsTab(ctx: ProductModalCtx) {
  const {
    form, specKey, setSpecKey, specVal, setSpecVal, set,
  } = ctx;

  const dims = [
    { key: 'weight', label: 'الوزن',    unit: 'كغ',  step: '0.001', hint: 'للشحن والتوصيل' },
    { key: 'volume', label: 'الحجم',    unit: 'لتر', step: '0.001', hint: 'للسوائل والغازات' },
    { key: 'length', label: 'الطول',    unit: 'سم',  step: '0.1',  hint: '' },
    { key: 'width',  label: 'العرض',    unit: 'سم',  step: '0.1',  hint: '' },
    { key: 'height', label: 'الارتفاع', unit: 'سم',  step: '0.1',  hint: '' },
  ] as const;

  function addSpec() {
    if (!specKey.trim() || !specVal.trim()) return;
    set('specifications', { ...form.specifications, [specKey.trim()]: specVal.trim() });
    setSpecKey(''); setSpecVal('');
  }

  const volumeFromDimensions = form.length && form.width && form.height
    ? (Number(form.length) * Number(form.width) * Number(form.height)) / 1_000_000
    : null;

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-ruler" title="الأبعاد والمواصفات" subtitle="البيانات الفيزيائية للمنتج والخصائص التقنية" />

      <div style={s.row3}>
        {dims.map(d => (
          <Field key={d.key} label={`${d.label} (${d.unit})`} hint={d.hint}>
            <input
              type="number" step={d.step} min="0"
              style={s.inp()}
              value={(form as any)[d.key] ?? ''}
              onChange={e => set(d.key as any, e.target.value === '' ? '' : +e.target.value)}
              placeholder="0"
            />
          </Field>
        ))}
        {volumeFromDimensions !== null && (
          <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-cube" style={{ fontSize: 16, color: 'var(--blue)' }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>الحجم المحسوب</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{volumeFromDimensions.toFixed(4)} م³</div>
            </div>
          </div>
        )}
      </div>

      <div style={s.divider} />

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-list" style={{ fontSize: 14, color: 'var(--em)' }} />
          الخصائص التقنية (Specifications)
        </div>

        {Object.keys(form.specifications).length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t4)', padding: '8px 0 12px', textAlign: 'center' }}>
            لا توجد خصائص — مثال: اللون، المادة، الطاقة، درجة الحرارة...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {Object.entries(form.specifications).map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ ...s.inp(), fontSize: 12, fontWeight: 600 }}
                  defaultValue={k}
                  onBlur={e => {
                    const nk = e.target.value.trim();
                    if (!nk || nk === k) return;
                    const sp = { ...form.specifications };
                    const val = sp[k]; delete sp[k]; sp[nk] = val;
                    set('specifications', sp);
                  }}
                  placeholder="اسم الخاصية"
                />
                <input
                  style={{ ...s.inp(), fontSize: 12 }}
                  value={v}
                  onChange={e => set('specifications', { ...form.specifications, [k]: e.target.value })}
                  placeholder="القيمة"
                />
                <button
                  onClick={() => { const sp = { ...form.specifications }; delete sp[k]; set('specifications', sp); }}
                  style={{ padding: '6px 8px', border: '1px solid var(--redbo)', borderRadius: 'var(--r1)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}
                ><i className="ti ti-trash" /></button>
              </div>
            ))}
          </div>
        )}

        {/* إضافة خاصية */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px dashed var(--b3)', background: 'var(--bg3)' }}>
          <input
            placeholder="الخاصية (مثال: اللون)"
            style={{ ...s.inp(), flex: 1, fontSize: 12, background: 'var(--bg2)' }}
            value={specKey}
            onChange={e => setSpecKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSpec()}
          />
          <input
            placeholder="القيمة (مثال: أحمر)"
            style={{ ...s.inp(), flex: 1, fontSize: 12, background: 'var(--bg2)' }}
            value={specVal}
            onChange={e => setSpecVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSpec()}
          />
          <button
            onClick={addSpec}
            disabled={!specKey.trim() || !specVal.trim()}
            style={{ padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!specKey.trim() || !specVal.trim()) ? 0.5 : 1 }}
          >
            <i className="ti ti-plus" /> إضافة
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>اضغط Enter لإضافة الخاصية مباشرة</div>
      </div>
    </div>
  );
}
