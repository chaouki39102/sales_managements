// components/products/SidePanel.tsx
import React, { useState, useEffect } from 'react';
import { Product, Family, Brand, ProductType, ProductVariant } from '@/types/product';
import Switch from '@/components/ui/Switch';

interface SidePanelProps {
  product: Product;
  families: Family[];
  brands: Brand[];
  productTypes: ProductType[];
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}

export default function SidePanel({ product, families, brands, productTypes, onClose, onSave, onDelete, saving, deleting }: SidePanelProps) {
  const [tab, setTab] = useState<'main' | 'meta' | 'specs' | 'variants' | 'prices'>('main');
  const [form, setForm] = useState<Partial<Product>>({});
  const [dirty, setDirty] = useState(false);
  const [specRows, setSpecRows] = useState<{ k: string; v: string }[]>([]);
  const [keywordsStr, setKeywordsStr] = useState('');

  useEffect(() => {
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? '',
      family_id: product.family_id,
      brand_id: product.brand_id,
      product_type_id: product.product_type_id,
      active: product.active,
      meta_title: product.meta_title ?? '',
      meta_description: product.meta_description ?? '',
      meta_keywords: product.meta_keywords ?? [],
      specifications: product.specifications ?? {},
    });
    setKeywordsStr((product.meta_keywords ?? []).join(', '));
    setSpecRows(Object.entries(product.specifications ?? {}).map(([k, v]) => ({ k, v: String(v) })));
    setDirty(false);
  }, [product.id]);

  const handleSave = () => {
    const payload: Partial<Product> = {
      ...form,
      meta_keywords: keywordsStr.split(',').map(s => s.trim()).filter(Boolean),
      specifications: Object.fromEntries(specRows.filter(r => r.k.trim()).map(r => [r.k, r.v])),
    };
    onSave(payload);
    setDirty(false);
  };

  const updateForm = (key: keyof Product, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)',
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 12.5, outline: 'none',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  const variants = product.variants ?? product.relations?.variants ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b2)', background: 'var(--bg3)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 'var(--r3)', background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--em)' }}>{product.name.slice(0, 2).toUpperCase()}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{product.name}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>{product.slug}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-xs btn-r" onClick={onDelete} disabled={deleting}><i className={`ti ${deleting ? 'ti-loader-2 spin' : 'ti-trash'}`} /></button>
            <button className="btn btn-xs" onClick={onClose}><i className="ti ti-x" /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {product.family && <span className="bx bb no-dot">{product.family.name}</span>}
          {product.brand && <span className="bx bp no-dot">{product.brand.name}</span>}
          <span className={`bx ${product.active ? 'be' : 'bz'} no-dot`}>{product.active ? 'نشط' : 'غير نشط'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--b1)', background: 'var(--bg2)', flexShrink: 0 }}>
        {[
          { key: 'main', label: 'الأساسية', icon: 'ti-info-circle' },
          { key: 'meta', label: 'SEO', icon: 'ti-world' },
          { key: 'specs', label: 'المواصفات', icon: 'ti-list-details' },
          { key: 'variants', label: `المتغيرات (${variants.length})`, icon: 'ti-versions' },
          { key: 'prices', label: 'الأسعار', icon: 'ti-tag' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
            color: tab === t.key ? 'var(--em)' : 'var(--t4)',
            borderBottom: tab === t.key ? '2px solid var(--em)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} /> {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {tab === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>اسم المنتج</label>
              <input style={inputStyle} value={form.name ?? ''} onChange={e => updateForm('name', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>السلوج</label>
              <input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.slug ?? ''} onChange={e => updateForm('slug', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label>الفئة</label>
                <select style={selectStyle} value={form.family_id ?? ''} onChange={e => updateForm('family_id', e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">— بلا —</option>
                  {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label>العلامة</label>
                <select style={selectStyle} value={form.brand_id ?? ''} onChange={e => updateForm('brand_id', e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">— بلا —</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label>نوع المنتج</label>
              <select style={selectStyle} value={form.product_type_id ?? ''} onChange={e => updateForm('product_type_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">— بلا —</option>
                {productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label>الوصف</label>
              <textarea style={inputStyle} rows={3} value={form.description ?? ''} onChange={e => updateForm('description', e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg3)', borderRadius: 'var(--r2)' }}>
              <span>الحالة</span>
              <Switch checked={form.active ?? false} onChange={val => updateForm('active', val)} />
            </div>
          </div>
        )}

        {tab === 'meta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label>عنوان الميتا</label>
              <input style={inputStyle} value={form.meta_title ?? ''} onChange={e => updateForm('meta_title', e.target.value)} />
            </div>
            <div>
              <label>وصف الميتا</label>
              <textarea style={inputStyle} rows={2} value={form.meta_description ?? ''} onChange={e => updateForm('meta_description', e.target.value)} />
            </div>
            <div>
              <label>الكلمات المفتاحية (مفصولة بفاصلة)</label>
              <input style={inputStyle} value={keywordsStr} onChange={e => { setKeywordsStr(e.target.value); setDirty(true); }} />
            </div>
          </div>
        )}

        {tab === 'specs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{specRows.length} مواصفة</span>
              <button className="btn btn-xs" onClick={() => { setSpecRows([...specRows, { k: '', v: '' }]); setDirty(true); }}><i className="ti ti-plus" /> إضافة</button>
            </div>
            {specRows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="الخاصية" value={row.k} onChange={e => { const newRows = [...specRows]; newRows[idx].k = e.target.value; setSpecRows(newRows); setDirty(true); }} />
                <input style={{ ...inputStyle, flex: 1 }} placeholder="القيمة" value={row.v} onChange={e => { const newRows = [...specRows]; newRows[idx].v = e.target.value; setSpecRows(newRows); setDirty(true); }} />
                <button className="btn btn-xs btn-r" onClick={() => { setSpecRows(specRows.filter((_, i) => i !== idx)); setDirty(true); }}><i className="ti ti-x" /></button>
              </div>
            ))}
          </div>
        )}

        {tab === 'variants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {variants.length === 0 && <div className="empty"><div className="empty-tx">لا توجد متغيرات</div></div>}
            {variants.map(v => (
              <div key={v.id} style={{ border: '1px solid var(--b2)', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg3)', display: 'flex', justifyContent: 'space-between' }}>
                  <div><span style={{ fontWeight: 700 }}>{v.variant_name || v.ref}</span><div style={{ fontSize: 10, color: 'var(--t4)' }}>{v.ref}</div></div>
                  <span className={`bx ${v.active ? 'be' : 'bz'}`}>{v.active ? 'نشط' : 'غير نشط'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', textAlign: 'center', padding: '6px 0' }}>
                  <div><div style={{ fontSize: 9 }}>شراء HT</div><div>{v.purchase_price ?? '—'}</div></div>
                  <div><div style={{ fontSize: 9 }}>بيع HT</div><div style={{ color: 'var(--em)', fontWeight: 700 }}>{v.price_ht}</div></div>
                  <div><div style={{ fontSize: 9 }}>TVA</div><div>{v.tva_rate}%</div></div>
                  <div><div style={{ fontSize: 9 }}>المخزون</div><div>{v.current_stock ?? 0}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'prices' && (
          <div className="tw">
            <table style={{ width: '100%' }}>
              <thead><tr><th>المتغير</th><th>مستوى السعر</th><th>السعر</th></tr></thead>
              <tbody>
                {variants.flatMap(v =>
                  (v.prices ?? []).map(p => (
                    <tr key={`${v.id}-${p.price_level_id}`}>
                      <td>{v.variant_name || v.ref}</td>
                      <td>{p.priceLevel?.name ?? `#${p.price_level_id}`}</td>
                      <td>{p.price} دج</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer save */}
      {dirty && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-xs" onClick={() => setDirty(false)}>إلغاء</button>
          <button className="btn btn-p btn-xs" onClick={handleSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button>
        </div>
      )}
    </div>
  );
}
