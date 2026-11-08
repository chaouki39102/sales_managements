// Tab "SEO" of ProductModal. Called as a plain render function (not a component) to keep the original React tree.
import { slugify } from '../helpers';
import { s } from '../ui/styles';
import Field from '../ui/Field';
import SectionHeader from '../ui/SectionHeader';
import type { ProductModalCtx } from '../hooks/useProductModal';

export default function renderSeoTab(ctx: ProductModalCtx) {
  const {
    slugEdited, form, kwInput, setKwInput, set,
  } = ctx;

  const kwArray = form.meta_keywords;

  function addKw() {
    const kw = kwInput.trim();
    if (!kw || kwArray.includes(kw)) { setKwInput(''); return; }
    set('meta_keywords', [...kwArray, kw]);
    setKwInput('');
  }

  function removeKw(kw: string) {
    set('meta_keywords', kwArray.filter(k => k !== kw));
  }

  return (
    <div style={s.section}>
      <SectionHeader icon="ti-world" title="SEO والـ Slug" subtitle="تحسين ظهور المنتج في محركات البحث والروابط الداخلية" />

      {/* Slug (قابل للتعديل هنا أيضاً) */}
      <Field label="Slug الرابط" hint="يظهر في رابط URL المنتج — أحرف صغيرة وشرطات فقط">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace', fontSize: 12, flex: 1 }}
            value={form.slug}
            onChange={e => { slugEdited.current = true; set('slug', e.target.value); }}
            placeholder="my-product-name"
          />
          <button
            type="button"
            onClick={() => { slugEdited.current = false; set('slug', slugify(form.name)); }}
            style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t3)', cursor: 'pointer', fontSize: 11 }}
            title="إعادة توليد من الاسم"
          ><i className="ti ti-refresh" style={{ fontSize: 13 }} /></button>
        </div>
      </Field>

      <Field label="عنوان SEO (meta_title)" hint={`يُستخدم في علامة <title> وبطاقة المشاركة — يُفضَّل 50-60 حرف (${form.meta_title.length}/60)`}>
        <input
          style={{ ...s.inp(), ...(form.meta_title.length > 60 ? { borderColor: '#f59e0b' } : {}) }}
          value={form.meta_title}
          onChange={e => set('meta_title', e.target.value)}
          placeholder="مثال: حليب نصف دسم 1 لتر — أفضل سعر بالجزائر"
        />
      </Field>

      <Field label="وصف SEO (meta_description)" hint={`يظهر في نتائج البحث — يُفضَّل 120-160 حرف (${form.meta_description.length}/160)`}>
        <textarea
          style={{
            ...s.inp(), resize: 'vertical', minHeight: 80,
            ...(form.meta_description.length > 160 ? { borderColor: '#f59e0b' } : {}),
          }}
          value={form.meta_description}
          onChange={e => set('meta_description', e.target.value)}
          placeholder="وصف موجز يظهر في نتائج Google وبطاقات المشاركة على الشبكات الاجتماعية..."
        />
      </Field>

      <Field label="الكلمات المفتاحية (meta_keywords)" hint="أضف كلمات مفتاحية مرتبطة بالمنتج — اضغط Enter أو الفاصلة للإضافة">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...s.inp(), flex: 1 }}
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKw(); } }}
            placeholder="حليب، منتجات غذائية، جزائر..."
          />
          <button
            disabled={!kwInput.trim()}
            onClick={addKw}
            style={{ padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, cursor: 'pointer', opacity: !kwInput.trim() ? 0.5 : 1 }}
          ><i className="ti ti-plus" /></button>
        </div>
        {kwArray.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {kwArray.map(kw => (
              <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'var(--emb)', border: '1px solid var(--embo)', color: 'var(--em)', fontSize: 12, fontWeight: 600 }}>
                {kw}
                <button onClick={() => removeKw(kw)} style={{ background: 'none', border: 'none', color: 'var(--em)', cursor: 'pointer', padding: '0 0 0 2px', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                  <i className="ti ti-x" style={{ fontSize: 11 }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* معاينة بطاقة Google */}
      {(form.meta_title || form.meta_description || form.name) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>معاينة نتيجة Google</div>
          <div style={{ padding: 14, borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg2)', maxWidth: 600 }}>
            <div style={{ fontSize: 14, color: '#1a0dab', fontWeight: 400, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.meta_title || form.name}
            </div>
            <div style={{ fontSize: 12, color: '#006621', marginBottom: 4 }}>www.example.com › {form.slug || 'product-slug'}</div>
            <div style={{ fontSize: 13, color: '#545454', lineHeight: 1.6 }}>
              {form.meta_description || form.description || 'لا يوجد وصف — أضف meta_description لتحسين ظهور المنتج.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
