// ════════════════════════════════════════════════
// resources/js/pages/products/ProductModal.tsx
// Modal إضافة/تعديل المنتج مع المتغيرات والأسعار
// ════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// ── Types ──────────────────────────────────────
interface VariantForm {
  id?:               number;
  ref:               string;
  variant_name:      string;
  barcode:           string;
  purchase_price:    number | '';
  price_ht:          number | '';
  tva_rate:          number;
  unit_id:           string;
  min_stock:         number;
  active:            boolean;
  // prices per level
  prices:            { price_level_id: number; price: number | '' }[];
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
function inp(err?: boolean): React.CSSProperties {
  return {
    width:'100%', boxSizing:'border-box',
    padding:'8px 12px', borderRadius:'var(--r2)',
    border:`1px solid ${err?'var(--red)':'var(--b3)'}`,
    background:'var(--bg1)', color:'var(--t1)',
    fontSize:13, fontFamily:'Tajawal,sans-serif', outline:'none',
  };
}

function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label style={{fontSize:11.5, fontWeight:700, color:'var(--t3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.4}}>
      {children}{req && <span style={{color:'var(--red)', marginRight:3}}>*</span>}
    </label>
  );
}

function Section({ title, icon, children }: { title:string; icon:string; children:React.ReactNode }) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--b1)'}}>
        <i className={`ti ${icon}`} style={{color:'var(--em)', fontSize:15}}/>
        <span style={{fontSize:12, fontWeight:800, color:'var(--t2)', textTransform:'uppercase', letterSpacing:.5}}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function extractList(data: any): any[] {
  if (Array.isArray(data?.data))       return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
}

// ════════════════════════════════════════════════
export default function ProductModal({ open, product, onClose, onSaved }: {
  open:      boolean;
  product?:  any | null;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const isEdit = !!product;
  const qc     = useQueryClient();

  const [form,    setForm]    = useState<FormState>(buildDefault());
  const [errors,  setErrors]  = useState<Record<string,string>>({});
  const [apiErr,  setApiErr]  = useState('');
  const [tab,     setTab]     = useState(0); // active variant tab index

  // ── Lookups ────────────────────────────────
  const { data: families    = [] } = useQuery({ queryKey:['families-sel'],    queryFn:()=>apiClient.get('/families',     {params:{per_page:200}}).then(r=>extractList(r.data)), staleTime:120_000, enabled:open });
  const { data: brands      = [] } = useQuery({ queryKey:['brands-sel'],      queryFn:()=>apiClient.get('/brands',       {params:{per_page:200}}).then(r=>extractList(r.data)), staleTime:120_000, enabled:open });
  const { data: productTypes= [] } = useQuery({ queryKey:['product-types'],   queryFn:()=>apiClient.get('/product-types',{params:{per_page:50}}).then(r=>extractList(r.data)),  staleTime:300_000, enabled:open });
  const { data: units       = [] } = useQuery({ queryKey:['units-sel'],       queryFn:()=>apiClient.get('/units',        {params:{per_page:100}}).then(r=>extractList(r.data)), staleTime:300_000, enabled:open });
  const { data: priceLevels = [] } = useQuery({ queryKey:['price-levels-sel'],queryFn:()=>apiClient.get('/price-levels', {params:{per_page:50}}).then(r=>extractList(r.data)),  staleTime:300_000, enabled:open });
  const { data: tvaRates    = [] } = useQuery({ queryKey:['tvas-sel'],        queryFn:()=>apiClient.get('/tvas',         {params:{per_page:20}}).then(r=>extractList(r.data)),   staleTime:300_000, enabled:open });

  function buildDefault(): FormState {
    if (product) {
      const variants = (product?.relations?.variants ?? product?.variants ?? []).map((v:any) => ({
        id:             v.id,
        ref:            v.ref           ?? '',
        variant_name:   v.variant_name  ?? '',
        barcode:        v.barcode       ?? '',
        purchase_price: v.purchase_price ?? '',
        price_ht:       v.price_ht      ?? '',
        tva_rate:       parseFloat(v.tva_rate ?? 19),
        unit_id:        String(v.unit_id ?? ''),
        min_stock:      v.min_stock     ?? 0,
        active:         v.active        ?? true,
        prices:         (v.prices ?? v.variantPrices ?? []).map((p:any) => ({
          price_level_id: p.price_level_id,
          price:          parseFloat(p.price) ?? '',
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
    return { name:'', description:'', family_id:'', brand_id:'', product_type_id:'', active:true, variants:[] };
  }

  useEffect(() => {
    if (open) { setForm(buildDefault()); setErrors({}); setApiErr(''); setTab(0); }
  }, [open, product?.id]);

  // init prices for each variant when priceLevels load
  useEffect(() => {
    if (!priceLevels.length) return;
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        prices: priceLevels.map((pl:any) => {
          const existing = v.prices.find(p=>p.price_level_id===pl.id);
          return existing ?? { price_level_id: pl.id, price: '' };
        }),
      })),
    }));
  }, [priceLevels.length]);

  // ── Variant helpers ───────────────────────
  function addVariant() {
    setForm(f => ({
      ...f,
      variants: [...f.variants, {
        ref:'', variant_name:'', barcode:'',
        purchase_price:'', price_ht:'',
        tva_rate: parseFloat((tvaRates as any[]).find((t:any)=>t.is_default)?.rate ?? 19),
        unit_id:'', min_stock:0, active:true,
        prices: (priceLevels as any[]).map((pl:any) => ({ price_level_id:pl.id, price:'' })),
      }],
    }));
    setTimeout(()=>setTab(form.variants.length), 0);
  }

  function removeVariant(idx: number) {
    setForm(f => ({ ...f, variants: f.variants.filter((_,i)=>i!==idx) }));
    setTab(Math.max(0, idx-1));
  }

  function setVariant(idx: number, key: keyof VariantForm, val: any) {
    setForm(f => {
      const variants = [...f.variants];
      variants[idx] = { ...variants[idx], [key]: val };
      return { ...f, variants };
    });
  }

  function setVariantPrice(vidx: number, plId: number, price: any) {
    setForm(f => {
      const variants = [...f.variants];
      const prices = variants[vidx].prices.map(p =>
        p.price_level_id === plId ? { ...p, price } : p
      );
      variants[vidx] = { ...variants[vidx], prices };
      return { ...f, variants };
    });
  }

  // ── Validation ────────────────────────────
  function validate(): boolean {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = 'اسم المنتج إلزامي';
    form.variants.forEach((v,i) => {
      if (!v.ref.trim()) e[`v${i}_ref`] = 'المرجع إلزامي';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Save ──────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name:            form.name,
        description:     form.description || null,
        family_id:       form.family_id    ? parseInt(form.family_id)    : null,
        brand_id:        form.brand_id     ? parseInt(form.brand_id)     : null,
        product_type_id: form.product_type_id ? parseInt(form.product_type_id) : null,
        active:          form.active,
        variants: form.variants.map(v => ({
          ...(v.id ? {id:v.id} : {}),
          ref:            v.ref,
          variant_name:   v.variant_name  || null,
          barcode:        v.barcode       || null,
          purchase_price: v.purchase_price !== '' ? parseFloat(String(v.purchase_price)) : null,
          price_ht:       v.price_ht      !== '' ? parseFloat(String(v.price_ht)) : 0,
          tva_rate:       v.tva_rate,
          unit_id:        v.unit_id       ? parseInt(v.unit_id)  : null,
          min_stock:      v.min_stock,
          active:         v.active,
          prices: v.prices
            .filter(p => p.price !== '' && p.price !== null)
            .map(p => ({ price_level_id:p.price_level_id, price:parseFloat(String(p.price)) })),
        })),
      };
      if (isEdit)
        return apiClient.put(`/products/${product.id}`, payload);
      return apiClient.post('/products', payload);
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:['products']}); onSaved(); },
    onError:   (e:any) => {
      const msg = e?.response?.data?.message
        ?? Object.values(e?.response?.data?.errors ?? {}).flat().join(' | ')
        ?? 'فشل الحفظ';
      setApiErr(String(msg));
    },
  });

  function handleSave() {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }

  if (!open) return null;

  const isPending = saveMut.isPending;
  const v = form.variants[tab];

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:'rgba(0,0,0,.5)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'20px 16px', overflowY:'auto',
    }} onClick={onClose}>
      <div style={{
        width:'100%', maxWidth:880,
        background:'var(--bg1)', borderRadius:'var(--r3)',
        boxShadow:'0 24px 64px rgba(0,0,0,.25)',
      }} onClick={e=>e.stopPropagation()}>

        {/* ── Modal Header ────────────────────── */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--b1)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--bg2)', borderRadius:'var(--r3) var(--r3) 0 0',
        }}>
          <div>
            <div style={{fontSize:16, fontWeight:800, color:'var(--t1)'}}>
              {isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </div>
            <div style={{fontSize:11, color:'var(--t4)', marginTop:2}}>
              {form.variants.length} متغير • {(priceLevels as any[]).length} مستوى سعر
            </div>
          </div>
          <button onClick={onClose} style={{
            width:30, height:30, borderRadius:8,
            border:'1px solid var(--b2)', background:'var(--bg1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'var(--t3)',
          }}>
            <i className="ti ti-x" style={{fontSize:14}}/>
          </button>
        </div>

        <div style={{padding:'20px', overflowY:'auto', maxHeight:'calc(90vh - 130px)'}}>

          {apiErr && (
            <div style={{
              padding:'10px 14px', marginBottom:16, borderRadius:'var(--r2)',
              background:'var(--redb)', border:'1px solid var(--redbo)',
              color:'var(--red)', fontSize:13, display:'flex', gap:8, alignItems:'center',
            }}>
              <i className="ti ti-alert-circle"/>{apiErr}
            </div>
          )}

          {/* ── Section: معلومات المنتج ────────── */}
          <Section title="معلومات المنتج الأساسية" icon="ti-package">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
              <div style={{gridColumn:'span 2'}}>
                <Lbl req>اسم المنتج</Lbl>
                <input style={inp(!!errors.name)} value={form.name}
                  placeholder="أدخل اسم المنتج"
                  onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                {errors.name && <div style={{color:'var(--red)',fontSize:11,marginTop:3}}>{errors.name}</div>}
              </div>
              <div>
                <Lbl>الفئة</Lbl>
                <select style={{...inp(),cursor:'pointer'}} value={form.family_id}
                  onChange={e=>setForm(f=>({...f,family_id:e.target.value}))}>
                  <option value="">— بدون فئة —</option>
                  {(families as any[]).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <Lbl>العلامة التجارية</Lbl>
                <select style={{...inp(),cursor:'pointer'}} value={form.brand_id}
                  onChange={e=>setForm(f=>({...f,brand_id:e.target.value}))}>
                  <option value="">— بدون علامة —</option>
                  {(brands as any[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <Lbl>نوع المنتج</Lbl>
                <select style={{...inp(),cursor:'pointer'}} value={form.product_type_id}
                  onChange={e=>setForm(f=>({...f,product_type_id:e.target.value}))}>
                  <option value="">— بدون نوع —</option>
                  {(productTypes as any[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:12, paddingTop:24}}>
                <div onClick={()=>setForm(f=>({...f,active:!f.active}))} style={{
                  width:44, height:24, borderRadius:12, cursor:'pointer',
                  background:form.active?'var(--em)':'var(--b2)',
                  position:'relative', transition:'background .2s', flexShrink:0,
                }}>
                  <div style={{
                    width:18, height:18, borderRadius:'50%', background:'#fff',
                    position:'absolute', top:3,
                    left:form.active?'calc(100% - 21px)':3,
                    transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                  }}/>
                </div>
                <span style={{fontSize:13, color:'var(--t2)', fontWeight:600}}>
                  {form.active ? 'المنتج نشط' : 'المنتج غير نشط'}
                </span>
              </div>
              <div style={{gridColumn:'span 2'}}>
                <Lbl>الوصف</Lbl>
                <textarea style={{...inp(), resize:'vertical'}} rows={2}
                  placeholder="وصف اختياري للمنتج..."
                  value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
            </div>
          </Section>

          {/* ── Section: المتغيرات ─────────────── */}
          <Section title="المتغيرات والأسعار" icon="ti-versions">
            {form.variants.length === 0 ? (
              <div style={{
                textAlign:'center', padding:'24px',
                background:'var(--bg2)', borderRadius:'var(--r2)',
                border:'1px dashed var(--b3)', marginBottom:12,
              }}>
                <i className="ti ti-package" style={{fontSize:32, color:'var(--b3)', display:'block', marginBottom:8}}/>
                <div style={{fontSize:13, color:'var(--t4)', marginBottom:12}}>
                  أضف متغيراً واحداً على الأقل (مثال: الحجم، اللون، الباركود...)
                </div>
                <button onClick={addVariant} style={{
                  padding:'8px 20px', borderRadius:'var(--r2)',
                  border:'1px dashed var(--em)', background:'transparent',
                  color:'var(--em)', fontSize:13, fontWeight:700,
                  cursor:'pointer', fontFamily:'Tajawal,sans-serif',
                }}>
                  <i className="ti ti-plus" style={{marginLeft:6}}/>إضافة متغير
                </button>
              </div>
            ) : (
              <>
                {/* Variant tabs */}
                <div style={{display:'flex', gap:4, marginBottom:14, flexWrap:'wrap', alignItems:'center'}}>
                  {form.variants.map((v,i) => (
                    <button key={i} onClick={()=>setTab(i)} style={{
                      padding:'5px 12px', borderRadius:'var(--r2)',
                      border:`1px solid ${tab===i?'var(--em)':'var(--b2)'}`,
                      background: tab===i ? 'var(--em)' : 'var(--bg2)',
                      color: tab===i ? '#fff' : 'var(--t3)',
                      fontSize:12, fontWeight:700, cursor:'pointer',
                      fontFamily:'Tajawal,sans-serif', transition:'all .15s',
                    }}>
                      {v.variant_name || v.ref || `متغير ${i+1}`}
                      {errors[`v${i}_ref`] && <i className="ti ti-alert-circle" style={{marginRight:4, fontSize:11, color:tab===i?'#fff':'var(--red)'}}/>}
                    </button>
                  ))}
                  <button onClick={addVariant} style={{
                    padding:'5px 10px', borderRadius:'var(--r2)',
                    border:'1px dashed var(--b3)', background:'transparent',
                    color:'var(--t4)', fontSize:12, cursor:'pointer',
                    fontFamily:'Tajawal,sans-serif',
                  }}>
                    <i className="ti ti-plus"/>
                  </button>
                </div>

                {/* Active variant form */}
                {v && (
                  <div style={{
                    padding:'16px', borderRadius:'var(--r2)',
                    border:'1px solid var(--b2)', background:'var(--bg2)',
                  }}>
                    {/* Variant header */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                      <div style={{fontSize:12, fontWeight:800, color:'var(--t2)'}}>
                        {v.variant_name || v.ref || `متغير ${tab+1}`}
                      </div>
                      <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <div onClick={()=>setVariant(tab,'active',!v.active)} style={{
                          width:36, height:20, borderRadius:10, cursor:'pointer',
                          background:v.active?'var(--em)':'var(--b2)',
                          position:'relative', transition:'background .2s',
                        }}>
                          <div style={{
                            width:14, height:14, borderRadius:'50%', background:'#fff',
                            position:'absolute', top:3,
                            left:v.active?'calc(100% - 17px)':3,
                            transition:'left .2s',
                          }}/>
                        </div>
                        <button onClick={()=>removeVariant(tab)} style={{
                          padding:'4px 8px', borderRadius:'var(--r1)',
                          border:'1px solid color-mix(in srgb,var(--red) 30%,transparent)',
                          background:'color-mix(in srgb,var(--red) 8%,transparent)',
                          color:'var(--red)', cursor:'pointer', fontSize:12,
                        }}>
                          <i className="ti ti-trash"/>
                        </button>
                      </div>
                    </div>

                    {/* Basic variant info */}
                    <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16}}>
                      <div>
                        <Lbl req>المرجع (REF)</Lbl>
                        <input style={inp(!!errors[`v${tab}_ref`])} value={v.ref}
                          placeholder="REF-001"
                          onChange={e=>setVariant(tab,'ref',e.target.value)}/>
                        {errors[`v${tab}_ref`] && <div style={{color:'var(--red)',fontSize:11,marginTop:3}}>{errors[`v${tab}_ref`]}</div>}
                      </div>
                      <div>
                        <Lbl>اسم المتغير</Lbl>
                        <input style={inp()} value={v.variant_name}
                          placeholder="مثال: أحمر L"
                          onChange={e=>setVariant(tab,'variant_name',e.target.value)}/>
                      </div>
                      <div>
                        <Lbl>الباركود</Lbl>
                        <input style={inp()} value={v.barcode}
                          placeholder="6191..."
                          onChange={e=>setVariant(tab,'barcode',e.target.value)}/>
                      </div>
                      <div>
                        <Lbl>سعر الشراء HT</Lbl>
                        <input type="number" min="0" step="0.01" style={inp()} value={v.purchase_price}
                          placeholder="0.00"
                          onChange={e=>setVariant(tab,'purchase_price',e.target.value)}/>
                      </div>
                      <div>
                        <Lbl req>سعر البيع HT</Lbl>
                        <input type="number" min="0" step="0.01" style={inp()} value={v.price_ht}
                          placeholder="0.00"
                          onChange={e=>setVariant(tab,'price_ht',e.target.value)}/>
                      </div>
                      <div>
                        <Lbl>معدل TVA</Lbl>
                        <select style={{...inp(),cursor:'pointer'}} value={v.tva_rate}
                          onChange={e=>setVariant(tab,'tva_rate',parseFloat(e.target.value))}>
                          {(tvaRates as any[]).length > 0
                            ? (tvaRates as any[]).map((t:any)=><option key={t.id} value={t.rate}>{t.rate}%</option>)
                            : [0,9,19].map(r=><option key={r} value={r}>{r}%</option>)}
                        </select>
                      </div>
                      <div>
                        <Lbl>وحدة القياس</Lbl>
                        <select style={{...inp(),cursor:'pointer'}} value={v.unit_id}
                          onChange={e=>setVariant(tab,'unit_id',e.target.value)}>
                          <option value="">— اختر —</option>
                          {(units as any[]).map(u=><option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                        </select>
                      </div>
                      <div>
                        <Lbl>الحد الأدنى للمخزون</Lbl>
                        <input type="number" min="0" style={inp()} value={v.min_stock}
                          onChange={e=>setVariant(tab,'min_stock',parseInt(e.target.value)||0)}/>
                      </div>
                    </div>

                    {/* Price levels */}
                    {(priceLevels as any[]).length > 0 && (
                      <div>
                        <div style={{fontSize:11, fontWeight:700, color:'var(--t4)', marginBottom:8, textTransform:'uppercase', letterSpacing:.4}}>
                          أسعار المستويات
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:`repeat(${Math.min((priceLevels as any[]).length,3)},1fr)`, gap:10}}>
                          {(priceLevels as any[]).map((pl:any) => {
                            const priceEntry = v.prices.find(p=>p.price_level_id===pl.id);
                            return (
                              <div key={pl.id}>
                                <Lbl>{pl.name}</Lbl>
                                <input type="number" min="0" step="0.01" style={inp()}
                                  placeholder="0.00"
                                  value={priceEntry?.price ?? ''}
                                  onChange={e=>setVariantPrice(tab,pl.id,e.target.value)}/>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Section>
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div style={{
          padding:'14px 20px', borderTop:'1px solid var(--b1)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'var(--bg2)', borderRadius:'0 0 var(--r3) var(--r3)',
        }}>
          <div style={{fontSize:12, color:'var(--t4)'}}>
            {form.variants.length > 0
              ? `${form.variants.length} متغير — ${(priceLevels as any[]).length} مستوى سعر`
              : 'لا توجد متغيرات'}
          </div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={onClose} disabled={isPending} style={{
              padding:'8px 20px', borderRadius:'var(--r2)',
              border:'1px solid var(--b3)', background:'var(--bg1)',
              color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal,sans-serif',
            }}>إلغاء</button>
            <button onClick={handleSave} disabled={isPending} style={{
              padding:'8px 24px', borderRadius:'var(--r2)', border:'none',
              background:isPending?'var(--b2)':'var(--em)', color:'#fff',
              fontSize:13, fontWeight:700, cursor:isPending?'not-allowed':'pointer',
              fontFamily:'Tajawal,sans-serif', display:'flex', alignItems:'center', gap:7,
              transition:'all .15s',
            }}>
              {isPending
                ? <i className="ti ti-loader-2" style={{animation:'spin .8s linear infinite'}}/>
                : <i className={`ti ${isEdit?'ti-check':'ti-plus'}`}/>}
              {isPending ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
