// ════════════════════════════════════════════════
// resources/js/pages/products/ProductsPage.tsx
// واجهة المنتجات الكاملة — بطاقات + جدول + تفاصيل
// ════════════════════════════════════════════════
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import ProductModal from './ProductModal';

// ── Types ──────────────────────────────────────
interface Product {
  id:              number;
  name:            string;
  slug:            string;
  description?:    string;
  family_id?:      number;
  brand_id?:       number;
  product_type_id?: number;
  active:          boolean;
  images?:         string[];
  relations?: {
    family?:       { id: number; name: string };
    brand?:        { id: number; name: string };
    productType?:  { id: number; name: string };
    variants?:     Variant[];
  };
}

interface Variant {
  id:              number;
  product_id:      number;
  ref:             string;
  variant_name?:   string;
  barcode?:        string;
  purchase_price?: number;
  price_ht:        number;
  tva_rate:        number;
  unit_id?:        number;
  min_stock?:      number;
  active:          boolean;
  stock_quantity?: number;
}

// ── Helpers ────────────────────────────────────
function fmtPrice(n?: number | string) {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return '—';
  return v.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) + ' دج';
}

function extractList(data: any): any[] {
  if (Array.isArray(data?.data))       return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data))             return data;
  return [];
}

// ── Stock badge ────────────────────────────────
function StockBadge({ qty, min }: { qty?: number; min?: number }) {
  const q = qty ?? 0;
  const m = min ?? 5;
  if (q <= 0)  return <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:'color-mix(in srgb,var(--red) 12%,transparent)', color:'var(--red)' }}>نفذ</span>;
  if (q <= m)  return <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:'color-mix(in srgb,var(--orange) 12%,transparent)', color:'var(--orange)' }}>منخفض</span>;
  return <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:'color-mix(in srgb,var(--em) 12%,transparent)', color:'var(--em)' }}>متوفر</span>;
}

// ════════════════════════════════════════════════
export default function ProductsPage() {
  const qc = useQueryClient();

  const [view,    setView]    = useState<'grid' | 'table'>('grid');
  const [search,  setSearch]  = useState('');
  const [family,  setFamily]  = useState('');
  const [brand,   setBrand]   = useState('');
  const [active,  setActive]  = useState('');
  const [page,    setPage]    = useState(1);
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null);
  const [detail,  setDetail]  = useState<Product | null>(null);
  const [editProd,setEditProd]= useState<Product | null>(null);
  const [toast,   setToast]   = useState<{msg:string;type:'success'|'error'}|null>(null);

  function showToast(msg: string, type: 'success'|'error' = 'success') {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3200);
  }

  // ── Fetch products ──────────────────────────
  const { data: pData, isLoading, isFetching } = useQuery({
    queryKey: ['products', search, family, brand, active, page],
    queryFn:  () => apiClient.get('/products', {
      params: {
        'filter[search]':    search   || undefined,
        'filter[family_id]': family   || undefined,
        'filter[brand_id]':  brand    || undefined,
        'filter[active]':    active   || undefined,
        include: 'family,brand,productType,variants',
        per_page: view === 'grid' ? 12 : 15,
        page,
      },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const products: Product[] = extractList(pData);
  const meta = pData?.meta ?? {};

  // ── Lookups for filters ─────────────────────
  const { data: families = [] } = useQuery({
    queryKey: ['families-filter'],
    queryFn:  () => apiClient.get('/families', { params: { per_page: 100 } }).then(r => extractList(r.data)),
    staleTime: 120_000,
  });
  const { data: brands = [] } = useQuery({
    queryKey: ['brands-filter'],
    queryFn:  () => apiClient.get('/brands', { params: { per_page: 100 } }).then(r => extractList(r.data)),
    staleTime: 120_000,
  });

  // ── Delete ──────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['products']}); showToast('تم حذف المنتج بنجاح'); },
    onError:   (e:any) => showToast(e?.response?.data?.message ?? 'فشل الحذف', 'error'),
  });

  const selStyle: React.CSSProperties = {
    padding:'7px 12px', borderRadius:'var(--r2)',
    border:'1px solid var(--b3)', background:'var(--bg1)',
    color:'var(--t1)', fontSize:12.5, fontFamily:'Tajawal,sans-serif',
    outline:'none', cursor:'pointer',
  };

  return (
    <div className="page on" style={{padding:'18px 20px', display:'flex', flexDirection:'column', gap:16}}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
          zIndex:9999, padding:'10px 22px', borderRadius:'var(--r2)',
          background: toast.type==='success'?'var(--em)':'var(--red)',
          color:'#fff', fontSize:13, fontWeight:700,
          boxShadow:'0 4px 24px rgba(0,0,0,.2)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <i className={`ti ${toast.type==='success'?'ti-check':'ti-x'}`}/>{toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{
            width:42, height:42, borderRadius:12,
            background:'color-mix(in srgb,var(--blue) 12%,transparent)',
            border:'1px solid color-mix(in srgb,var(--blue) 25%,transparent)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--blue)', fontSize:20,
          }}>
            <i className="ti ti-package"/>
          </div>
          <div>
            <div style={{fontSize:17, fontWeight:800, color:'var(--t1)'}}>المنتجات</div>
            <div style={{fontSize:11.5, color:'var(--t4)'}}>
              {isLoading ? 'جارٍ التحميل...' : `${meta.total ?? products.length} منتج`}
            </div>
          </div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {/* View toggle */}
          <div style={{display:'flex', border:'1px solid var(--b2)', borderRadius:'var(--r2)', overflow:'hidden'}}>
            {(['grid','table'] as const).map(v => (
              <button key={v} onClick={()=>setView(v)} style={{
                padding:'6px 12px', border:'none', cursor:'pointer',
                background: view===v ? 'var(--em)' : 'var(--bg1)',
                color: view===v ? '#fff' : 'var(--t3)',
                fontSize:13, transition:'all .15s',
              }}>
                <i className={`ti ${v==='grid'?'ti-layout-grid':'ti-table'}`}/>
              </button>
            ))}
          </div>
          <button className="btn btn-p" onClick={()=>{setEditProd(null);setModal('add');}}>
            <i className="ti ti-plus"/> إضافة منتج
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────── */}
      <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
        <div className="srch" style={{flex:'1 1 200px', maxWidth:280}}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="بحث بالاسم، المرجع..."
            value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select style={selStyle} value={family} onChange={e=>{setFamily(e.target.value);setPage(1);}}>
          <option value="">كل الفئات</option>
          {(families as any[]).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={selStyle} value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);}}>
          <option value="">كل العلامات</option>
          {(brands as any[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select style={selStyle} value={active} onChange={e=>{setActive(e.target.value);setPage(1);}}>
          <option value="">الكل</option>
          <option value="1">نشط</option>
          <option value="0">غير نشط</option>
        </select>
        <button className="btn" onClick={()=>{setSearch('');setFamily('');setBrand('');setActive('');setPage(1);}} title="إعادة الضبط">
          <i className="ti ti-refresh"/>
        </button>
      </div>

      {/* ── Content ────────────────────────────── */}
      {isLoading ? (
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:200, gap:10, color:'var(--t3)'}}>
          <i className="ti ti-loader-2" style={{fontSize:24, animation:'spin .8s linear infinite'}}/>
          جارٍ التحميل...
        </div>
      ) : products.length === 0 ? (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:220, gap:10, color:'var(--t4)'}}>
          <i className="ti ti-package-off" style={{fontSize:44}}/>
          <div style={{fontSize:14, fontWeight:700}}>لا توجد منتجات</div>
          <div style={{fontSize:12}}>{search||family||brand ? 'لا توجد نتائج للبحث' : 'لم يتم إضافة أي منتج بعد'}</div>
          {!search && !family && !brand && (
            <button className="btn btn-p btn-sm" style={{marginTop:4}} onClick={()=>{setEditProd(null);setModal('add');}}>
              <i className="ti ti-plus"/> إضافة أول منتج
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <GridView
          products={products} isFetching={isFetching}
          onView={p=>{setDetail(p);}}
          onEdit={p=>{setEditProd(p);setModal('edit');}}
          onDelete={p=>{ if(confirm(`حذف ${p.name}؟`)) deleteMut.mutate(p.id); }}
        />
      ) : (
        <TableView
          products={products} isFetching={isFetching}
          onView={p=>{setDetail(p);}}
          onEdit={p=>{setEditProd(p);setModal('edit');}}
          onDelete={p=>{ if(confirm(`حذف ${p.name}؟`)) deleteMut.mutate(p.id); }}
        />
      )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4}}>
          <span style={{fontSize:12, color:'var(--t4)'}}>
            {meta.from}–{meta.to} من {meta.total}
          </span>
          <div style={{display:'flex', gap:4}}>
            <button className="btn btn-xs" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>
              <i className="ti ti-chevron-right"/>
            </button>
            {Array.from({length:Math.min(meta.last_page,7)},(_,i)=>{
              const p=i+1;
              return (
                <button key={p} className="btn btn-xs"
                  style={page===p?{background:'var(--em)',color:'#fff',borderColor:'var(--em)'}:{}}
                  onClick={()=>setPage(p)}>{p}</button>
              );
            })}
            <button className="btn btn-xs" disabled={page>=meta.last_page} onClick={()=>setPage(p=>p+1)}>
              <i className="ti ti-chevron-left"/>
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <ProductDetailDrawer
          product={detail}
          onClose={()=>setDetail(null)}
          onEdit={()=>{setEditProd(detail);setModal('edit');setDetail(null);}}
        />
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <ProductModal
          open={true}
          product={modal==='edit' ? editProd : null}
          onClose={()=>{setModal(null);setEditProd(null);}}
          onSaved={()=>{
            showToast(modal==='add'?'تمت إضافة المنتج بنجاح':'تم تعديل المنتج بنجاح');
            qc.invalidateQueries({queryKey:['products']});
            setModal(null);setEditProd(null);
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// Grid View
// ════════════════════════════════════════════════
function GridView({ products, isFetching, onView, onEdit, onDelete }: {
  products: Product[]; isFetching: boolean;
  onView:(p:Product)=>void; onEdit:(p:Product)=>void; onDelete:(p:Product)=>void;
}) {
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',
      gap:14, opacity:isFetching?.7:1, transition:'opacity .2s',
    }}>
      {products.map(p=>{
        const variants = p.relations?.variants ?? [];
        const totalStock = variants.reduce((s,v)=>(s+(v.stock_quantity??0)),0);
        const minPrice = variants.length ? Math.min(...variants.map(v=>v.price_ht)) : 0;
        const maxPrice = variants.length ? Math.max(...variants.map(v=>v.price_ht)) : 0;
        return (
          <div key={p.id}
            style={{
              background:'var(--bg1)', borderRadius:'var(--r3)',
              border:'1px solid var(--b1)', overflow:'hidden',
              transition:'all .15s', cursor:'pointer',
            }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow='var(--shadow2)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow='none'}
            onClick={()=>onView(p)}
          >
            {/* Image / Placeholder */}
            <div style={{
              height:120, background:'var(--bg2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              borderBottom:'1px solid var(--b1)', position:'relative',
            }}>
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name}
                  style={{width:'100%', height:'100%', objectFit:'cover'}}/>
              ) : (
                <i className="ti ti-photo" style={{fontSize:36, color:'var(--b3)'}}/>
              )}
              {/* Active badge */}
              <div style={{
                position:'absolute', top:8, right:8,
                width:8, height:8, borderRadius:'50%',
                background: p.active ? 'var(--em)' : 'var(--red)',
                boxShadow:`0 0 0 2px ${p.active?'color-mix(in srgb,var(--em) 25%,transparent)':'color-mix(in srgb,var(--red) 25%,transparent)'}`,
              }}/>
            </div>

            {/* Info */}
            <div style={{padding:'12px'}}>
              <div style={{fontSize:13.5, fontWeight:800, color:'var(--t1)', marginBottom:4, lineHeight:1.3}}>
                {p.name}
              </div>
              <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:8}}>
                {p.relations?.family && (
                  <span style={{fontSize:10, padding:'2px 7px', borderRadius:10, background:'color-mix(in srgb,var(--blue) 12%,transparent)', color:'var(--blue)', fontWeight:700}}>
                    {p.relations.family.name}
                  </span>
                )}
                {p.relations?.brand && (
                  <span style={{fontSize:10, padding:'2px 7px', borderRadius:10, background:'color-mix(in srgb,var(--purple) 12%,transparent)', color:'var(--purple)', fontWeight:700}}>
                    {p.relations.brand.name}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <div>
                  <div style={{fontSize:10, color:'var(--t4)', marginBottom:2}}>السعر HT</div>
                  <div style={{fontSize:13, fontWeight:700, color:'var(--em)'}}>
                    {variants.length === 0 ? '—'
                      : minPrice === maxPrice ? fmtPrice(minPrice)
                      : `${fmtPrice(minPrice)} — ${fmtPrice(maxPrice)}`}
                  </div>
                </div>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:10, color:'var(--t4)', marginBottom:2}}>المخزون</div>
                  <StockBadge qty={totalStock} min={5}/>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                paddingTop:8, borderTop:'1px solid var(--b1)',
              }}>
                <span style={{fontSize:11, color:'var(--t4)'}}>
                  {variants.length} متغير
                </span>
                <div style={{display:'flex', gap:4}} onClick={e=>e.stopPropagation()}>
                  <button className="btn btn-xs" onClick={()=>onEdit(p)} title="تعديل">
                    <i className="ti ti-pencil"/>
                  </button>
                  <button className="btn btn-xs btn-r" onClick={()=>onDelete(p)} title="حذف">
                    <i className="ti ti-trash"/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════
// Table View
// ════════════════════════════════════════════════
function TableView({ products, isFetching, onView, onEdit, onDelete }: {
  products: Product[]; isFetching: boolean;
  onView:(p:Product)=>void; onEdit:(p:Product)=>void; onDelete:(p:Product)=>void;
}) {
  return (
    <div className="card" style={{padding:0, overflow:'hidden', opacity:isFetching?.7:1, transition:'opacity .2s'}}>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المنتج</th>
              <th>الفئة</th>
              <th>العلامة</th>
              <th>المتغيرات</th>
              <th>السعر HT</th>
              <th>المخزون</th>
              <th>الحالة</th>
              <th style={{textAlign:'center', width:100}}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const variants = p.relations?.variants ?? [];
              const totalStock = variants.reduce((s,v)=>(s+(v.stock_quantity??0)),0);
              const minPrice = variants.length ? Math.min(...variants.map(v=>v.price_ht)) : 0;
              return (
                <tr key={p.id} style={{cursor:'pointer'}} onClick={()=>onView(p)}>
                  <td style={{color:'var(--t4)', fontSize:11}}>{idx+1}</td>
                  <td>
                    <div style={{fontWeight:700, color:'var(--t1)'}}>{p.name}</div>
                    {p.description && (
                      <div style={{fontSize:11, color:'var(--t4)', marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td>
                    {p.relations?.family
                      ? <span style={{fontSize:11, padding:'2px 7px', borderRadius:10, background:'color-mix(in srgb,var(--blue) 12%,transparent)', color:'var(--blue)', fontWeight:700}}>{p.relations.family.name}</span>
                      : <span style={{color:'var(--t4)'}}>—</span>}
                  </td>
                  <td>
                    {p.relations?.brand
                      ? <span style={{fontSize:11, padding:'2px 7px', borderRadius:10, background:'color-mix(in srgb,var(--purple) 12%,transparent)', color:'var(--purple)', fontWeight:700}}>{p.relations.brand.name}</span>
                      : <span style={{color:'var(--t4)'}}>—</span>}
                  </td>
                  <td style={{textAlign:'center'}}>
                    <span style={{
                      fontWeight:700, fontSize:13,
                      color: variants.length ? 'var(--t1)' : 'var(--t4)',
                    }}>{variants.length}</span>
                  </td>
                  <td style={{fontWeight:700, color:'var(--em)', direction:'ltr', textAlign:'left'}}>
                    {variants.length ? fmtPrice(minPrice) : '—'}
                  </td>
                  <td><StockBadge qty={totalStock} min={5}/></td>
                  <td>
                    <span style={{
                      padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                      background: p.active ? 'color-mix(in srgb,var(--em) 12%,transparent)' : 'color-mix(in srgb,var(--t4) 10%,transparent)',
                      color: p.active ? 'var(--em)' : 'var(--t4)',
                    }}>
                      {p.active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex', gap:4, justifyContent:'center'}}>
                      <button className="btn btn-xs" onClick={()=>onEdit(p)} title="تعديل"><i className="ti ti-pencil"/></button>
                      <button className="btn btn-xs btn-r" onClick={()=>onDelete(p)} title="حذف"><i className="ti ti-trash"/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Product Detail Drawer
// ════════════════════════════════════════════════
function ProductDetailDrawer({ product, onClose, onEdit }: {
  product: Product; onClose:()=>void; onEdit:()=>void;
}) {
  const [tab, setTab] = useState<'variants'|'prices'|'discounts'>('variants');

  // Fetch full product with all relations
  const { data: full, isLoading } = useQuery({
    queryKey: ['product-detail', product.id],
    queryFn: () => apiClient.get(`/products/${product.id}`, {
      params: { include: 'family,brand,productType,variants,variants.prices,variants.prices.priceLevel,variants.quantityDiscounts,variants.unit' },
    }).then(r => r.data.data),
  });

  const p = full ?? product;
  const variants: Variant[] = p?.relations?.variants ?? p?.variants ?? [];

  return (
    <>
      {/* Backdrop */}
      <div style={{position:'fixed',inset:0,zIndex:490,background:'rgba(0,0,0,.3)'}} onClick={onClose}/>

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, zIndex:500,
        width:520, maxWidth:'95vw',
        background:'var(--bg1)', boxShadow:'-8px 0 40px rgba(0,0,0,.2)',
        display:'flex', flexDirection:'column', overflowY:'auto',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--b1)',
          display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          background:'var(--bg2)', flexShrink:0,
        }}>
          <div>
            <div style={{fontSize:16, fontWeight:800, color:'var(--t1)', marginBottom:4}}>
              {p.name}
            </div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {p.relations?.family && (
                <span style={{fontSize:10, padding:'2px 7px', borderRadius:10, background:'color-mix(in srgb,var(--blue) 12%,transparent)', color:'var(--blue)', fontWeight:700}}>
                  {p.relations.family.name}
                </span>
              )}
              {p.relations?.brand && (
                <span style={{fontSize:10, padding:'2px 7px', borderRadius:10, background:'color-mix(in srgb,var(--purple) 12%,transparent)', color:'var(--purple)', fontWeight:700}}>
                  {p.relations.brand.name}
                </span>
              )}
              <span style={{
                fontSize:10, padding:'2px 7px', borderRadius:10, fontWeight:700,
                background: p.active?'color-mix(in srgb,var(--em) 12%,transparent)':'color-mix(in srgb,var(--t4) 10%,transparent)',
                color: p.active?'var(--em)':'var(--t4)',
              }}>
                {p.active?'نشط':'غير نشط'}
              </span>
            </div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button className="btn btn-sm" onClick={onEdit}>
              <i className="ti ti-pencil"/> تعديل
            </button>
            <button className="btn btn-xs" onClick={onClose}>
              <i className="ti ti-x"/>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', flex:1, gap:10, color:'var(--t3)'}}>
            <i className="ti ti-loader-2" style={{fontSize:22, animation:'spin .8s linear infinite'}}/>
          </div>
        ) : (
          <div style={{flex:1, overflowY:'auto'}}>

            {/* Description */}
            {p.description && (
              <div style={{padding:'14px 20px', borderBottom:'1px solid var(--b1)', fontSize:13, color:'var(--t3)', lineHeight:1.7}}>
                {p.description}
              </div>
            )}

            {/* Stats */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, borderBottom:'1px solid var(--b1)'}}>
              {[
                { label:'المتغيرات', value: variants.length, icon:'ti-versions' },
                { label:'المخزون', value: variants.reduce((s,v)=>s+(v.stock_quantity??0),0), icon:'ti-package' },
                { label:'أدنى سعر HT', value: variants.length ? fmtPrice(Math.min(...variants.map(v=>v.price_ht))) : '—', icon:'ti-tag' },
              ].map(({label,value,icon}) => (
                <div key={label} style={{padding:'14px', textAlign:'center', background:'var(--bg2)'}}>
                  <i className={`ti ${icon}`} style={{fontSize:18, color:'var(--em)', display:'block', marginBottom:4}}/>
                  <div style={{fontSize:15, fontWeight:800, color:'var(--t1)'}}>{value}</div>
                  <div style={{fontSize:10, color:'var(--t4)'}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:'flex', borderBottom:'1px solid var(--b1)'}}>
              {([
                ['variants',  'المتغيرات', 'ti-versions'],
                ['prices',    'الأسعار',    'ti-tag'],
                ['discounts', 'الخصومات',   'ti-discount'],
              ] as const).map(([t,l,ic]) => (
                <button key={t} onClick={()=>setTab(t)} style={{
                  flex:1, padding:'10px 8px', border:'none', cursor:'pointer',
                  fontFamily:'Tajawal,sans-serif', fontSize:12.5, fontWeight:700,
                  background: tab===t ? 'var(--bg1)' : 'var(--bg2)',
                  color: tab===t ? 'var(--em)' : 'var(--t4)',
                  borderBottom: tab===t ? '2px solid var(--em)' : '2px solid transparent',
                  transition:'all .15s',
                }}>
                  <i className={`ti ${ic}`} style={{marginLeft:4}}/>
                  {l}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{padding:'16px 20px'}}>
              {tab === 'variants' && (
                <VariantsTab variants={variants}/>
              )}
              {tab === 'prices' && (
                <PricesTab variants={variants}/>
              )}
              {tab === 'discounts' && (
                <DiscountsTab variants={variants}/>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Variants Tab ───────────────────────────────
function VariantsTab({ variants }: { variants: Variant[] }) {
  if (variants.length === 0)
    return <div style={{textAlign:'center', color:'var(--t4)', padding:'30px 0', fontSize:13}}>لا توجد متغيرات بعد</div>;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      {variants.map((v: any) => (
        <div key={v.id} style={{
          padding:'12px 14px', borderRadius:'var(--r2)',
          border:'1px solid var(--b1)', background:'var(--bg2)',
        }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
            <div>
              <div style={{fontWeight:700, color:'var(--t1)', fontSize:13}}>
                {v.variant_name || v.ref || `متغير #${v.id}`}
              </div>
              {v.ref && v.variant_name && (
                <div style={{fontSize:11, color:'var(--t4)', marginTop:2, fontFamily:'monospace'}}>
                  {v.ref}
                </div>
              )}
            </div>
            <StockBadge qty={v.stock_quantity} min={v.min_stock}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
            {[
              ['سعر الشراء', fmtPrice(v.purchase_price)],
              ['سعر البيع HT', fmtPrice(v.price_ht)],
              ['TVA', `${v.tva_rate ?? 19}%`],
            ].map(([label,val]) => (
              <div key={label} style={{textAlign:'center', padding:'6px', borderRadius:'var(--r1)', background:'var(--bg1)'}}>
                <div style={{fontSize:10, color:'var(--t4)', marginBottom:2}}>{label}</div>
                <div style={{fontSize:12, fontWeight:700, color:'var(--t1)'}}>{val}</div>
              </div>
            ))}
          </div>
          {v.barcode && (
            <div style={{marginTop:8, fontSize:11, color:'var(--t4)', fontFamily:'monospace', display:'flex', alignItems:'center', gap:4}}>
              <i className="ti ti-barcode" style={{fontSize:13}}/>{v.barcode}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Prices Tab ─────────────────────────────────
function PricesTab({ variants }: { variants: any[] }) {
  const allPrices = variants.flatMap(v =>
    (v.prices ?? v.variantPrices ?? []).map((p:any) => ({ ...p, _variantName: v.variant_name || v.ref }))
  );
  if (allPrices.length === 0)
    return <div style={{textAlign:'center', color:'var(--t4)', padding:'30px 0', fontSize:13}}>لا توجد أسعار مستويات بعد</div>;
  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>المتغير</th>
            <th>مستوى السعر</th>
            <th style={{textAlign:'left'}}>السعر</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {allPrices.map((p:any,i:number) => (
            <tr key={p.id??i}>
              <td style={{fontSize:12, color:'var(--t3)'}}>{p._variantName}</td>
              <td style={{fontWeight:600}}>{p.relations?.priceLevel?.name ?? p.priceLevel?.name ?? `#${p.price_level_id}`}</td>
              <td style={{fontWeight:700, color:'var(--em)', direction:'ltr', textAlign:'left'}}>{fmtPrice(p.price)}</td>
              <td>
                <span style={{
                  padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:700,
                  background: p.active?'color-mix(in srgb,var(--em) 12%,transparent)':'color-mix(in srgb,var(--t4) 10%,transparent)',
                  color: p.active?'var(--em)':'var(--t4)',
                }}>{p.active?'نشط':'غير نشط'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Discounts Tab ──────────────────────────────
function DiscountsTab({ variants }: { variants: any[] }) {
  const allDisc = variants.flatMap(v =>
    (v.quantityDiscounts ?? v.quantity_discounts ?? []).map((d:any) => ({...d, _variantName: v.variant_name || v.ref}))
  );
  if (allDisc.length === 0)
    return <div style={{textAlign:'center', color:'var(--t4)', padding:'30px 0', fontSize:13}}>لا توجد خصومات كمية بعد</div>;
  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>المتغير</th>
            <th>الكمية الدنيا</th>
            <th>الكمية القصوى</th>
            <th>الخصم</th>
          </tr>
        </thead>
        <tbody>
          {allDisc.map((d:any,i:number) => (
            <tr key={d.id??i}>
              <td style={{fontSize:12, color:'var(--t3)'}}>{d._variantName}</td>
              <td style={{fontWeight:700}}>{d.min_quantity}</td>
              <td style={{color:'var(--t4)'}}>{d.max_quantity ?? '∞'}</td>
              <td style={{fontWeight:700, color:'var(--red)'}}>
                {d.discount_percentage ? `-${d.discount_percentage}%` : fmtPrice(d.discount_per_unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
