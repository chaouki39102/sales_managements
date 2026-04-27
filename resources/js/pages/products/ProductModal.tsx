// ════════════════════════════════════════════════
// resources/js/pages/products/ProductModal.tsx
// الإصدار المُصحَّح - يستخدم tokens.css الأصلي
// ════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import Switch from '@/components/ui/Switch';

// ── Types ──────────────────────────────────────
interface VariantForm {
  id?:            number;
  ref:            string;
  variant_name:   string;
  barcode:        string;
  purchase_price: number | '';
  price_ht:       number | '';
  tva_rate:       number;
  unit_id:        string;
  min_stock:      number;
  active:         boolean;
  prices:         { price_level_id: number; price: number | '' }[];
}

interface FormState {
  name:            string;
  description:     string;
  family_id:       string;
  brand_id:        string;
  product_type_id: string;
  active:          boolean;
  variants:        VariantForm[];
}

// ── Helpers ────────────────────────────────────
function extractList(d: any): any[] {
  if (Array.isArray(d?.data))       return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
}

// نمط الحقول باستخدام المتغيرات الحقيقية للمشروع
const inputStyle = (err?: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  padding: '8.5px 12px', borderRadius: 'var(--r2)',
  border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
  background: 'var(--bg2)',
  color: 'var(--t1)',
  fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
});

const selectStyle: React.CSSProperties = {
  ...inputStyle(),
  cursor: 'pointer',
  appearance: 'menulist',
};

// ── Field component ────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 700,
        color: 'var(--t3)', letterSpacing: '.3px',
      }}>
        {label}
        {required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />{error}
        </div>
      )}
    </div>
  );
}

// ── Stepper (3 خطوات) ─────────────────────────
function Stepper({ step }: { step: number }) {
  const steps = [
    { label: 'معلومات المنتج', icon: 'ti-info-circle' },
    { label: 'المتغيرات',      icon: 'ti-versions'     },
    { label: 'مراجعة',         icon: 'ti-check'        },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: done ? 'var(--em)' : current ? 'var(--emb)' : 'var(--bg3)',
                color: done ? '#fff' : current ? 'var(--em)' : 'var(--t4)',
                border: current ? '2px solid var(--em)' : '2px solid transparent',
                transition: 'all .2s',
              }}>
                {done
                  ? <i className="ti ti-check" style={{ fontSize: 15 }} />
                  : <i className={`ti ${s.icon}`} style={{ fontSize: 14 }} />}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                color: current ? 'var(--em)' : done ? 'var(--t3)' : 'var(--t4)',
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, background: done ? 'var(--em)' : 'var(--b2)',
                margin: '0 4px', marginBottom: 18, transition: 'background .3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Variant card in list ──────────────────────
function VariantCard({ variant, index, active, onSelect, onRemove, errors }: {
  variant: VariantForm; index: number; active: boolean;
  onSelect: () => void; onRemove: () => void; errors: Record<string, string>;
}) {
  const hasError = !!errors[`v${index}_ref`];
  return (
    <div
      onClick={onSelect}
      style={{
        borderRadius: 'var(--r2)', padding: '9px 12px', cursor: 'pointer',
        border: active
          ? '1.5px solid var(--em)'
          : hasError ? '1px solid var(--red)' : '1px solid var(--b2)',
        background: active ? 'var(--emb)' : 'var(--bg3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: active ? 'var(--em)' : 'var(--bg4)',
          color: active ? '#fff' : 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>
          {index + 1}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {variant.variant_name || variant.ref || `متغير ${index + 1}`}
          </div>
          {variant.ref && variant.variant_name && (
            <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {variant.ref}
            </div>
          )}
        </div>
        {hasError && <i className="ti ti-alert-circle" style={{ color: 'var(--red)', fontSize: 14 }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {variant.price_ht !== '' && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {Number(variant.price_ht).toLocaleString('fr-DZ')} دج
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            width: 24, height: 24, borderRadius: 5, border: '1px solid var(--b2)', cursor: 'pointer',
            background: 'var(--bg3)', color: 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
          }}>
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function ProductModal({ open, product, onClose, onSaved }: {
  open: boolean; product?: any | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!product;
  const qc = useQueryClient();

  const [step,   setStep]   = useState(0);
  const [form,   setForm]   = useState<FormState>(buildDefault());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState('');
  const [varTab, setVarTab] = useState(0);

  // ── Lookups (cached) ────────────────────────
  const { data: families     = [] } = useQuery({ queryKey: ['families-sel'],     queryFn: () => apiClient.get('/families',      { params: { per_page: 200 } }).then(r => extractList(r.data)), staleTime: Infinity, enabled: open });
  const { data: brands       = [] } = useQuery({ queryKey: ['brands-sel'],       queryFn: () => apiClient.get('/brands',        { params: { per_page: 200 } }).then(r => extractList(r.data)), staleTime: Infinity, enabled: open });
  const { data: productTypes = [] } = useQuery({ queryKey: ['product-types'],    queryFn: () => apiClient.get('/product-types', { params: { per_page: 50  } }).then(r => extractList(r.data)), staleTime: Infinity, enabled: open });
  const { data: units        = [] } = useQuery({ queryKey: ['units-sel'],        queryFn: () => apiClient.get('/units',         { params: { per_page: 100 } }).then(r => extractList(r.data)), staleTime: Infinity, enabled: open });
  const { data: priceLevels  = [] } = useQuery({ queryKey: ['price-levels-sel'], queryFn: () => apiClient.get('/price-levels',  { params: { per_page: 50  } }).then(r => extractList(r.data)), staleTime: Infinity, enabled: open });
  const { data: tvaRates     = [] } = useQuery({ queryKey: ['tvas-sel'],         queryFn: () => apiClient.get('/tvas',          { params: { per_page: 20  } }).then(r => extractList(r.data)), staleTime: Infinity, enabled: open });

  function buildDefault(): FormState {
    if (product) {
      const variants = (product?.relations?.variants ?? product?.variants ?? []).map((v: any) => ({
        id:             v.id,
        ref:            v.ref            ?? '',
        variant_name:   v.variant_name   ?? '',
        barcode:        v.barcode        ?? '',
        purchase_price: v.purchase_price ?? '',
        price_ht:       v.price_ht       ?? '',
        tva_rate:       parseFloat(v.tva_rate ?? 19),
        unit_id:        String(v.unit_id ?? ''),
        min_stock:      v.min_stock      ?? 0,
        active:         v.active         ?? true,
        prices:         (v.prices ?? v.variantPrices ?? []).map((p: any) => ({
          price_level_id: p.price_level_id,
          price:          parseFloat(p.price) || '',
        })),
      }));
      return {
        name:            product.name            ?? '',
        description:     product.description     ?? '',
        family_id:       String(product.family_id ?? ''),
        brand_id:        String(product.brand_id  ?? ''),
        product_type_id: String(product.product_type_id ?? ''),
        active:          product.active           ?? true,
        variants,
      };
    }
    return { name: '', description: '', family_id: '', brand_id: '', product_type_id: '', active: true, variants: [] };
  }

  useEffect(() => {
    if (open) { setForm(buildDefault()); setErrors({}); setApiErr(''); setStep(0); setVarTab(0); }
  }, [open, product?.id]);

  // Populate price levels in all variants when priceLevels load
  useEffect(() => {
    if (!(priceLevels as any[]).length) return;
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        prices: (priceLevels as any[]).map((pl: any) => {
          const ex = v.prices.find(p => p.price_level_id === pl.id);
          return ex ?? { price_level_id: pl.id, price: '' };
        }),
      })),
    }));
  }, [(priceLevels as any[]).length]);

  // ── Variant helpers ───────────────────────
  function addVariant() {
    const defTva = parseFloat((tvaRates as any[]).find((t: any) => t.is_default)?.rate ?? 19);
    const newV: VariantForm = {
      ref: '', variant_name: '', barcode: '',
      purchase_price: '', price_ht: '',
      tva_rate: defTva, unit_id: '', min_stock: 0, active: true,
      prices: (priceLevels as any[]).map((pl: any) => ({ price_level_id: pl.id, price: '' })),
    };
    setForm(f => ({ ...f, variants: [...f.variants, newV] }));
    setTimeout(() => setVarTab(form.variants.length), 0);
  }

  function removeVariant(idx: number) {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
    setVarTab(t => Math.max(0, idx - 1 < t ? t - 1 : t));
  }

  function setVariant(idx: number, key: keyof VariantForm, val: any) {
    setForm(f => {
      const vs = [...f.variants];
      vs[idx] = { ...vs[idx], [key]: val };
      return { ...f, variants: vs };
    });
  }

  function setVariantPrice(vidx: number, plId: number, price: any) {
    setForm(f => {
      const vs = [...f.variants];
      vs[vidx] = {
        ...vs[vidx],
        prices: vs[vidx].prices.map(p => p.price_level_id === plId ? { ...p, price } : p),
      };
      return { ...f, variants: vs };
    });
  }

  // ── Validation ────────────────────────────
  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = 'اسم المنتج إلزامي';
    }
    if (s === 1) {
      form.variants.forEach((v, i) => {
        if (!v.ref.trim()) e[`v${i}_ref`] = 'المرجع إلزامي';
        if (v.price_ht === '') e[`v${i}_price`] = 'سعر البيع إلزامي';
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep(step)) setStep(s => s + 1);
  }

  // ── Save ──────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name:            form.name,
        description:     form.description || null,
        family_id:       form.family_id       ? parseInt(form.family_id)       : null,
        brand_id:        form.brand_id        ? parseInt(form.brand_id)        : null,
        product_type_id: form.product_type_id ? parseInt(form.product_type_id) : null,
        active:          form.active,
        variants: form.variants.map(v => ({
          ...(v.id ? { id: v.id } : {}),
          ref:            v.ref,
          variant_name:   v.variant_name  || null,
          barcode:        v.barcode       || null,
          purchase_price: v.purchase_price !== '' ? parseFloat(String(v.purchase_price)) : null,
          price_ht:       v.price_ht       !== '' ? parseFloat(String(v.price_ht))       : 0,
          tva_rate:       v.tva_rate,
          unit_id:        v.unit_id        ? parseInt(v.unit_id) : null,
          min_stock:      v.min_stock,
          active:         v.active,
          prices: v.prices
            .filter(p => p.price !== '' && p.price !== null)
            .map(p => ({ price_level_id: p.price_level_id, price: parseFloat(String(p.price)) })),
        })),
      };
      if (isEdit) return apiClient.put(`/products/${product.id}`, payload);
      return apiClient.post('/products', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onSaved(); },
    onError: (e: any) => {
      const msg = e?.response?.data?.message
        ?? Object.values(e?.response?.data?.errors ?? {}).flat().join(' | ')
        ?? 'فشل الحفظ';
      setApiErr(String(msg));
      setStep(1);
    },
  });

  function handleSave() {
    setApiErr('');
    if (validateStep(1)) saveMut.mutate();
  }

  if (!open) return null;

  const isPending = saveMut.isPending;
  const v = form.variants[varTab];

  // استخدام مكونات الـ Overlay / Modal جاهزة
  return (
    <div className="ov on">
      <div className="modal modal-lg" style={{ maxHeight: '92vh' }}>
        {/* ── Header ─────────────────────────── */}
        <div className="m-hd">
          <div>
            <div className="m-title">
              {isEdit ? 'تعديل المنتج' : 'منتج جديد'}
            </div>
            <div className="m-sub">
              {form.name || 'أدخل اسم المنتج'} • {form.variants.length} متغير
            </div>
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* ── Stepper ────────────────────────── */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
          <Stepper step={step} />
        </div>

        {/* ── Body ───────────────────────────── */}
        <div className="m-body" style={{ padding: '18px 20px' }}>
          {apiErr && (
            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              color: 'var(--red)', fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <i className="ti ti-alert-circle" />{apiErr}
            </div>
          )}

          {/* ── STEP 0 ───────────────────────── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="اسم المنتج" required error={errors.name}>
                <input style={inputStyle(!!errors.name)} value={form.name}
                  placeholder="أدخل اسم المنتج..." autoFocus
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Field label="الفئة">
                  <select style={selectStyle} value={form.family_id}
                    onChange={e => setForm(f => ({ ...f, family_id: e.target.value }))}>
                    <option value="">— بدون فئة —</option>
                    {(families as any[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </Field>
                <Field label="العلامة التجارية">
                  <select style={selectStyle} value={form.brand_id}
                    onChange={e => setForm(f => ({ ...f, brand_id: e.target.value }))}>
                    <option value="">— بدون علامة —</option>
                    {(brands as any[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
                <Field label="نوع المنتج">
                  <select style={selectStyle} value={form.product_type_id}
                    onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value }))}>
                    <option value="">— بدون نوع —</option>
                    {(productTypes as any[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="الوصف">
                <textarea style={{ ...inputStyle(), resize: 'vertical' }} rows={3}
                  placeholder="وصف اختياري للمنتج..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </Field>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <Switch checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))}
                  label={form.active ? 'المنتج نشط ومتاح للبيع' : 'المنتج غير نشط'} />
              </div>
            </div>
          )}

          {/* ── STEP 1 ───────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', gap: 16, minHeight: 400 }}>
              {/* Left list */}
              <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 2 }}>
                  المتغيرات ({form.variants.length})
                </div>
                {form.variants.map((vr, i) => (
                  <VariantCard key={i} variant={vr} index={i} active={varTab === i}
                    errors={errors} onSelect={() => setVarTab(i)} onRemove={() => removeVariant(i)} />
                ))}
                <button onClick={addVariant}
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--r2)', cursor: 'pointer',
                    border: '1.5px dashed var(--b3)', background: 'transparent',
                    color: 'var(--t4)', fontSize: 12, fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--em)';
                    e.currentTarget.style.color = 'var(--em)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--b3)';
                    e.currentTarget.style.color = 'var(--t4)';
                  }}
                >
                  <i className="ti ti-plus" /> إضافة متغير
                </button>
                {form.variants.length === 0 && (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 10, padding: '20px 0', color: 'var(--t4)',
                    textAlign: 'center',
                  }}>
                    <i className="ti ti-versions" style={{ fontSize: 28 }} />
                    <div style={{ fontSize: 11.5 }}>أضف متغيراً واحداً على الأقل</div>
                  </div>
                )}
              </div>

              {/* Right form */}
              {v ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 14, paddingBottom: 10,
                    borderBottom: '1px solid var(--b1)',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                      {v.variant_name || v.ref || `متغير ${varTab + 1}`}
                    </div>
                    <Switch checked={v.active} onChange={val => setVariant(varTab, 'active', val)}
                      label={v.active ? 'نشط' : 'غير نشط'} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                    <Field label="المرجع (REF)" required error={errors[`v${varTab}_ref`]}>
                      <input style={inputStyle(!!errors[`v${varTab}_ref`])} value={v.ref}
                        placeholder="REF-001" onChange={e => setVariant(varTab, 'ref', e.target.value)} />
                    </Field>
                    <Field label="اسم المتغير">
                      <input style={inputStyle()} value={v.variant_name} placeholder="مثال: أحمر L"
                        onChange={e => setVariant(varTab, 'variant_name', e.target.value)} />
                    </Field>
                    <Field label="الباركود">
                      <input style={inputStyle()} value={v.barcode} placeholder="6191..."
                        onChange={e => setVariant(varTab, 'barcode', e.target.value)} />
                    </Field>
                    <Field label="سعر الشراء HT">
                      <input type="number" min="0" step="0.01" style={inputStyle()} value={v.purchase_price}
                        placeholder="0.00" onChange={e => setVariant(varTab, 'purchase_price', e.target.value)} />
                    </Field>
                    <Field label="سعر البيع HT" required error={errors[`v${varTab}_price`]}>
                      <input type="number" min="0" step="0.01" style={inputStyle(!!errors[`v${varTab}_price`])}
                        value={v.price_ht} placeholder="0.00"
                        onChange={e => setVariant(varTab, 'price_ht', e.target.value)} />
                    </Field>
                    <Field label="معدل TVA">
                      <select style={selectStyle} value={v.tva_rate}
                        onChange={e => setVariant(varTab, 'tva_rate', parseFloat(e.target.value))}>
                        {(tvaRates as any[]).length > 0
                          ? (tvaRates as any[]).map((t: any) => <option key={t.id} value={t.rate}>{t.rate}%</option>)
                          : [0, 9, 19].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </Field>
                    <Field label="وحدة القياس">
                      <select style={selectStyle} value={v.unit_id}
                        onChange={e => setVariant(varTab, 'unit_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {(units as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                      </select>
                    </Field>
                    <Field label="الحد الأدنى للمخزون">
                      <input type="number" min="0" style={inputStyle()} value={v.min_stock}
                        onChange={e => setVariant(varTab, 'min_stock', parseInt(e.target.value) || 0)} />
                    </Field>
                  </div>

                  {(priceLevels as any[]).length > 0 && (
                    <div style={{
                      padding: '12px 14px', borderRadius: 'var(--r2)',
                      background: 'var(--bg3)', border: '1px solid var(--b1)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 10 }}>
                        أسعار المستويات
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min((priceLevels as any[]).length, 3)},1fr)`, gap: 10 }}>
                        {(priceLevels as any[]).map((pl: any) => {
                          const entry = v.prices.find(p => p.price_level_id === pl.id);
                          return (
                            <Field key={pl.id} label={pl.name}>
                              <input type="number" min="0" step="0.01" style={inputStyle()}
                                placeholder="0.00" value={entry?.price ?? ''}
                                onChange={e => setVariantPrice(varTab, pl.id, e.target.value)} />
                            </Field>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--t4)', gap: 10,
                }}>
                  <i className="ti ti-arrow-right" style={{ fontSize: 28 }} />
                  <div style={{ fontSize: 13 }}>اختر متغيراً من القائمة أو أضف جديداً</div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ───────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 'var(--r3)',
                background: 'var(--bg3)', border: '1px solid var(--b2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{form.name}</div>
                  <span className={`bx ${form.active ? 'be' : 'bz'}`}>{form.active ? 'نشط' : 'غير نشط'}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t3)' }}>
                  {form.family_id && <span><i className="ti ti-folder" style={{ marginLeft: 4 }} />
                    {(families as any[]).find((f: any) => String(f.id) === form.family_id)?.name}</span>}
                  {form.brand_id && <span><i className="ti ti-award" style={{ marginLeft: 4 }} />
                    {(brands as any[]).find((b: any) => String(b.id) === form.brand_id)?.name}</span>}
                </div>
                {form.description && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)', lineHeight: 1.6 }}>
                    {form.description}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 2 }}>
                {form.variants.length} متغير
              </div>
              {form.variants.length === 0 ? (
                <div style={{
                  padding: '14px', borderRadius: 'var(--r2)', textAlign: 'center',
                  background: 'var(--goldb)', border: '1px solid var(--goldbo)',
                  color: 'var(--gold)', fontSize: 12.5,
                }}>
                  <i className="ti ti-alert-triangle" style={{ marginLeft: 6 }} />
                  لا توجد متغيرات — يمكنك إضافتها لاحقاً
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {form.variants.map((vr, i) => (
                    <div key={i} style={{
                      padding: '10px 14px', borderRadius: 'var(--r2)',
                      border: '1px solid var(--b2)', background: 'var(--bg3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                          {vr.variant_name || vr.ref}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {vr.ref}{vr.barcode ? ` · ${vr.barcode}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 9, color: 'var(--t4)' }}>سعر البيع HT</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)' }}>
                            {vr.price_ht !== '' ? `${Number(vr.price_ht).toLocaleString('fr-DZ')} دج` : '—'}
                          </div>
                        </div>
                        <span className={`bx ${vr.active ? 'be' : 'bz'}`}>{vr.active ? 'نشط' : 'غير نشط'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div className="m-foot">
          <div className="m-foot-l">
            <button className="btn" onClick={step === 0 ? onClose : () => setStep(s => s - 1)} disabled={isPending}>
              {step === 0 ? 'إلغاء' : <><i className="ti ti-arrow-right" /> رجوع</>}
            </button>
          </div>
          {step < 2 ? (
            <button className="btn btn-p" onClick={nextStep}>
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button className="btn btn-p" onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ الحفظ...</>
              ) : (
                <>{isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
