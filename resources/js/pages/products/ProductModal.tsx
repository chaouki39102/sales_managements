// ProductModal.tsx — نسخة محسّنة
// التحسينات:
//  1. موضع المودل — paddingTop: 5vh يرفعه عن الأسفل قليلاً
//  2. ارتفاع ثابت height: 95vh — لا يتغير عند تبديل التابات
//  3. Scroll للأعلى تلقائياً عند تبديل التاب
//  4. Validation inline عند onBlur لحقل الاسم وسعر الشراء
//  5. Keyboard: Escape للإغلاق، Ctrl/Cmd+S للحفظ
//  6. رسالة API error تبقى مرئية ولها زر إغلاق
//  7. Race condition في priceLevels مُصلح — useRef يتذكر إذا تم init البيانات
//  8. Lookups: staleTime 10 دقائق بدلاً من Infinity
//  9. isDirty tracking — شارة "غير محفوظ" في الهيدر
// 10. UnsavedChanges warning عند محاولة الإغلاق بعد تعديل
// 11. Tab counter badges (عدد التعبئات، عدد الأسعار)
// 12. حقل الاسم يأخذ focus تلقائياً عند الفتح
// 13. أزرار السابق/التالي في Footer للتنقل بين التابات
// 14. Enter في حقل الخصائص التقنية يضيف مباشرة

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { buildClasses } from '@/hooks/useStyles';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Family          { id: number; name: string; }
interface Brand           { id: number; name: string; }
interface ProductType     { id: number; name: string; manages_stock: boolean; }
interface Unit            { id: number; name: string; symbol: string; }
interface TvaRate         { id: number; rate: number; is_default?: boolean; }
interface PriceLevel      { id: number; name: string; }
interface ValuationMethod { id: number; name: string; method: string; }

interface ProductPrice {
  price_level_id: number;
  pricing_method: 'fixed' | 'rate' | 'margin';
  price:   number | null | '';
  rate:    number | null | '';
  margin:  number | null | '';
  active:  boolean;
}

interface ProductPackaging {
  id?: number;
  code: string; label: string; quantity: number | '';
  barcode: string; is_default: boolean; active: boolean; display_order: number;
}

interface QuantityDiscount {
  id?: number;
  price_level_id: number; min_qty: number | '';
  max_qty: number | null | ''; discount_amount: number | null | '';
  discount_percentage: number | null | ''; tier_order: number;
  is_blocked: boolean; active: boolean;
}

interface ProductForm {
  name: string; slug: string; ref: string; barcode: string; description: string;
  family_id: number | null; brand_id: number | null; product_type_id: number | null;
  tva_id: number | null; unit_id: number | null; purchase_price_ht: number | ''; min_margin_percentage: number | null | '';
  manages_stock: boolean; allow_negative_stock: boolean;
  has_lots: boolean; has_expiration_date: boolean;
  min_stock_alert: number | ''; max_stock_alert: number | '';
  manages_quantity_discounts: boolean; valuation_method_id: number | null;
  weight: number | null | ''; volume: number | null | '';
  length: number | null | ''; width: number | null | ''; height: number | null | '';
  specifications: Record<string, string>; images: string[]; active: boolean;
  prices: ProductPrice[]; packagings: ProductPackaging[]; quantity_discounts: QuantityDiscount[];
}

interface ProductModalProps {
  open: boolean; product?: any | null;
  onClose: () => void; onSaved: (product: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'basic',      label: 'الأساسيات', icon: 'ti-info-circle' },
  { id: 'pricing',    label: 'الأسعار',   icon: 'ti-tag' },
  { id: 'packagings', label: 'التعبئة',   icon: 'ti-package' },
  { id: 'stock',      label: 'المخزون',   icon: 'ti-building-warehouse' },
  { id: 'discounts',  label: 'الخصومات',  icon: 'ti-discount' },
  { id: 'dimensions', label: 'الأبعاد',   icon: 'ti-ruler' },
  { id: 'meta',       label: 'SEO',       icon: 'ti-world' },
] as const;

type TabId = typeof TABS[number]['id'];
const TAB_IDS = TABS.map(t => t.id) as TabId[];

const PRICING_METHODS = [
  { value: 'fixed',  label: 'سعر ثابت',        icon: 'ti-cash',        hint: 'Prix de vente HT مباشر' },
  { value: 'rate',   label: 'نسبة فوق الشراء', icon: 'ti-percentage',  hint: '% فوق سعر الشراء' },
  { value: 'margin', label: 'هامش ثابت',        icon: 'ti-trending-up', hint: 'هامش بالدج يُضاف للسعر' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const fmtDZD = (n: number | '' | null) =>
  n !== '' && n !== null
    ? new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + ' دج'
    : '—';

function emptyForm(priceLevels: PriceLevel[] = [], defaultTvaId: number | null = null): ProductForm {
  return {
    name: '', slug: '', ref: '', barcode: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    tva_id: defaultTvaId, unit_id: null, purchase_price_ht: '', min_margin_percentage: null,
    manages_stock: true, allow_negative_stock: false,
    has_lots: false, has_expiration_date: false,
    min_stock_alert: '', max_stock_alert: '',
    manages_quantity_discounts: false, valuation_method_id: null,
    weight: '', volume: '', length: '', width: '', height: '',
    specifications: {}, images: [], active: true,
    prices: priceLevels.map(pl => ({ price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true })),
    packagings: [], quantity_discounts: [],
  };
}

function productToForm(p: any, priceLevels: PriceLevel[]): ProductForm {
  return {
    name: p.name ?? '', slug: p.slug ?? '', ref: p.ref ?? '',
    barcode: p.barcode ?? '', description: p.description ?? '',
    family_id: p.family_id ?? null, brand_id: p.brand_id ?? null,
    product_type_id: p.product_type_id ?? null, tva_id: p.tva_id ?? null, unit_id: p.unit_id ?? null,
    purchase_price_ht: p.purchase_price_ht ?? '', min_margin_percentage: p.min_margin_percentage ?? null,
    manages_stock: p.manages_stock ?? true, allow_negative_stock: p.allow_negative_stock ?? false,
    has_lots: p.has_lots ?? false, has_expiration_date: p.has_expiration_date ?? false,
    min_stock_alert: p.min_stock_alert ?? '', max_stock_alert: p.max_stock_alert ?? '',
    manages_quantity_discounts: p.manages_quantity_discounts ?? false, valuation_method_id: p.valuation_method_id ?? null,
    weight: p.weight ?? '', volume: p.volume ?? '', length: p.length ?? '', width: p.width ?? '', height: p.height ?? '',
    specifications: p.specifications ?? {}, images: p.images ?? [], active: p.active ?? true,
    prices: priceLevels.map(pl => {
      const ex = (p.prices ?? []).find((x: any) => x.price_level_id === pl.id);
      return { price_level_id: pl.id, pricing_method: ex?.pricing_method ?? 'fixed', price: ex?.price ?? '', rate: ex?.rate ?? '', margin: ex?.margin ?? '', active: ex?.active !== false };
    }),
    packagings: (p.packagings ?? []).map((pkg: any) => ({ id: pkg.id, code: pkg.code ?? '', label: pkg.label ?? '', quantity: pkg.quantity ?? 1, barcode: pkg.barcode ?? '', is_default: pkg.is_default ?? false, active: pkg.active ?? true, display_order: pkg.display_order ?? 0 })),
    quantity_discounts: (p.quantity_discounts ?? []).map((d: any) => ({ id: d.id, price_level_id: d.price_level_id, min_qty: d.min_qty ?? '', max_qty: d.max_qty ?? null, discount_amount: d.discount_amount ?? null, discount_percentage: d.discount_percentage ?? null, tier_order: d.tier_order ?? 0, is_blocked: d.is_blocked ?? false, active: d.active ?? true })),
  };
}

function buildPayload(form: ProductForm) {
  return {
    name: form.name, slug: form.slug || undefined, ref: form.ref || null, barcode: form.barcode || null,
    description: form.description || null, family_id: form.family_id, brand_id: form.brand_id,
    product_type_id: form.product_type_id, tva_id: form.tva_id, unit_id: form.unit_id,
    purchase_price_ht: form.purchase_price_ht !== '' ? Number(form.purchase_price_ht) : 0,
    min_margin_percentage: form.min_margin_percentage !== '' && form.min_margin_percentage !== null ? Number(form.min_margin_percentage) : null,
    manages_stock: form.manages_stock, allow_negative_stock: form.allow_negative_stock,
    has_lots: form.has_lots, has_expiration_date: form.has_expiration_date,
    min_stock_alert: form.min_stock_alert !== '' ? Number(form.min_stock_alert) : 0,
    max_stock_alert: form.max_stock_alert !== '' ? Number(form.max_stock_alert) : 0,
    manages_quantity_discounts: form.manages_quantity_discounts, valuation_method_id: form.valuation_method_id,
    weight: form.weight !== '' ? form.weight : null, volume: form.volume !== '' ? form.volume : null,
    length: form.length !== '' ? form.length : null, width: form.width !== '' ? form.width : null,
    height: form.height !== '' ? form.height : null,
    specifications: Object.keys(form.specifications).length ? form.specifications : null,
    images: form.images, active: form.active,
    prices: form.prices.filter(p => {
      if (p.pricing_method === 'fixed')  return p.price  !== '' && p.price  !== null;
      if (p.pricing_method === 'rate')   return p.rate   !== '' && p.rate   !== null;
      if (p.pricing_method === 'margin') return p.margin !== '' && p.margin !== null;
      return false;
    }),
    packagings: form.packagings.filter(pkg => pkg.code.trim() && pkg.label.trim()),
    quantity_discounts: form.manages_quantity_discounts
      ? form.quantity_discounts.filter(d => d.price_level_id && d.min_qty !== '' && (d.discount_amount !== '' || d.discount_percentage !== ''))
      : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════

const s = {
  field: 'flex flex-col gap-1',
  label: 'text-sm font-semibold text-t3 uppercase tracking-widest',
  inp: (err?: boolean) => buildClasses('px-10 py-2 rounded-md border bg-2 text-base text-t1 font-sans outline-none transition-all', {
    'border-red': err,
    'border-b3': !err,
  }),
  sel: (err?: boolean) => buildClasses('px-10 py-2 rounded-md border bg-2 text-base text-t1 font-sans outline-none cursor-pointer transition-all', {
    'border-red': err,
    'border-b3': !err,
  }),
  row2: 'grid grid-cols-2 gap-3',
  row3: 'grid grid-cols-3 gap-3',
  section: 'flex flex-col gap-14',
  divider: 'h-px bg-b2 my-1',
  hint: 'text-xs text-t4 mt-1',
  errText: 'text-xs text-red mt-1',
};

function Field({ label, error, children, hint, col }: { label: string; error?: string; children: React.ReactNode; hint?: string; col?: number }) {
  return (
    <div className={buildClasses(s.field, { [`col-span-${col}`]: !!col })}>
      <label className={s.label}>{label}</label>
      {children}
      {hint  && <span className={s.hint}>{hint}</span>}
      {error && <span className={s.errText}>{error}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)} className="flex-shrink-0 w-36 h-20 rounded-full transition-colors cursor-pointer" style={{ background: checked ? 'var(--em)' : 'var(--b3)' }}>
        <div className="absolute top-3 w-14 h-14 rounded-full bg-white transition-all" style={{ left: checked ? '19px' : '3px' }} />
      </div>
      {label && <span className="text-base text-t2">{label}</span>}
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const isEdit   = !!product;
  const qc       = useQueryClient();
  const bodyRef  = useRef<HTMLDivElement>(null);
  const nameRef  = useRef<HTMLInputElement>(null);
  const initDone = useRef(false); // لحل race condition في priceLevels

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form,      setForm]      = useState<ProductForm>(() => emptyForm());
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState('');
  const [isDirty,   setIsDirty]   = useState(false);
  const [specKey,   setSpecKey]   = useState('');
  const [specVal,   setSpecVal]   = useState('');

  // ── Lookups ──
  const STALE = 10 * 60_000;
  const fetchOpts = { enabled: open, staleTime: STALE };
  const { data: families         = [] } = useQuery<Family[]>({          queryKey: ['families'],          queryFn: () => apiClient.get('/families',                    { params: { per_page: 200 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: brands           = [] } = useQuery<Brand[]>({           queryKey: ['brands'],            queryFn: () => apiClient.get('/brands',                      { params: { per_page: 200 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: productTypes     = [] } = useQuery<ProductType[]>({     queryKey: ['product-types'],     queryFn: () => apiClient.get('/product-types',              { params: { per_page: 50  } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: units            = [] } = useQuery<Unit[]>({            queryKey: ['units'],             queryFn: () => apiClient.get('/units',                      { params: { per_page: 100 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: tvaRates         = [] } = useQuery<TvaRate[]>({         queryKey: ['tvas'],              queryFn: () => apiClient.get('/tvas',                       { params: { per_page: 20  } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: priceLevels      = [] } = useQuery<PriceLevel[]>({      queryKey: ['price-levels'],      queryFn: () => apiClient.get('/price-levels',               { params: { per_page: 50  } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: valuationMethods = [] } = useQuery<ValuationMethod[]>({ queryKey: ['valuation-methods'], queryFn: () => apiClient.get('/inventory-valuation-methods', { params: { per_page: 20  } }).then(r => r.data.data ?? []), ...fetchOpts });

  const defaultTvaId = (tvaRates as TvaRate[]).find(t => t.is_default)?.id ?? null;

  // ── Reset عند الفتح ──
  useEffect(() => {
    if (!open) { initDone.current = false; return; }
    setErrors({}); setApiError(''); setActiveTab('basic');
    setIsDirty(false); setSpecKey(''); setSpecVal('');
    if (priceLevels.length > 0) {
      initDone.current = true;
      setForm(isEdit && product ? productToForm(product, priceLevels as PriceLevel[]) : emptyForm(priceLevels as PriceLevel[], defaultTvaId));
    } else {
      setForm(isEdit && product ? productToForm(product, []) : emptyForm([], defaultTvaId));
    }
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [open, product?.id]); // eslint-disable-line

  // ── Sync priceLevels أول مرة فقط (race condition fix) ──
  useEffect(() => {
    if (!priceLevels.length || !open || initDone.current) return;
    initDone.current = true;
    setForm(f => {
      if (isEdit && product) return productToForm(product, priceLevels as PriceLevel[]);
      return {
        ...f,
        tva_id: f.tva_id ?? defaultTvaId,
        prices: (priceLevels as PriceLevel[]).map(pl => {
          const ex = f.prices.find(p => p.price_level_id === pl.id);
          return ex ?? { price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true };
        }),
      };
    });
  }, [priceLevels.length, open]); // eslint-disable-line

  // ── Keyboard: Escape + Ctrl/Cmd+S ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')                          { handleClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's')  { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isDirty]); // eslint-disable-line

  // ── تبديل التاب مع scroll للأعلى ──
  const switchTab = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 30);
  }, []);

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? apiClient.put(`/products/${product.id}`, payload).then(r => r.data)
        : apiClient.post('/products', payload).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setIsDirty(false);
      onSaved(data);
      onClose();
    },
    onError: (e: any) => {
      const msg  = e?.response?.data?.message ?? 'حدث خطأ غير متوقع';
      const errs = e?.response?.data?.errors ?? {};
      setApiError(msg);
      setErrors(errs);
      if (errs.name || errs.purchase_price_ht) setActiveTab('basic');
    },
  });

  // ── Form helpers ──
  function set<K extends keyof ProductForm>(key: K, val: ProductForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
    if (errors[key]) setErrors(e => { const x = { ...e }; delete x[key]; return x; });
  }

  function updatePrice(plId: number, key: keyof ProductPrice, val: any) {
    setForm(f => ({ ...f, prices: f.prices.map(p => p.price_level_id === plId ? { ...p, [key]: val } : p) }));
    setIsDirty(true);
  }

  function addPackaging() {
    setForm(f => ({ ...f, packagings: [...f.packagings, { code: '', label: '', quantity: 1, barcode: '', is_default: f.packagings.length === 0, active: true, display_order: f.packagings.length }] }));
    setIsDirty(true);
  }

  function updatePackaging(idx: number, key: keyof ProductPackaging, val: any) {
    setForm(f => {
      const pkgs = [...f.packagings];
      pkgs[idx] = { ...pkgs[idx], [key]: val };
      if (key === 'is_default' && val) pkgs.forEach((p, i) => { if (i !== idx) pkgs[i] = { ...p, is_default: false }; });
      return { ...f, packagings: pkgs };
    });
    setIsDirty(true);
  }

  function removePackaging(idx: number) { setForm(f => ({ ...f, packagings: f.packagings.filter((_, i) => i !== idx) })); setIsDirty(true); }

  function addDiscount(plId: number) {
    setForm(f => ({ ...f, quantity_discounts: [...f.quantity_discounts, { price_level_id: plId, min_qty: 1, max_qty: null, discount_amount: null, discount_percentage: null, tier_order: f.quantity_discounts.filter(d => d.price_level_id === plId).length + 1, is_blocked: false, active: true }] }));
    setIsDirty(true);
  }

  function updateDiscount(idx: number, key: keyof QuantityDiscount, val: any) {
    setForm(f => { const ds = [...f.quantity_discounts]; ds[idx] = { ...ds[idx], [key]: val }; return { ...f, quantity_discounts: ds }; });
    setIsDirty(true);
  }

  function removeDiscount(idx: number) { setForm(f => ({ ...f, quantity_discounts: f.quantity_discounts.filter((_, i) => i !== idx) })); setIsDirty(true); }

  // ── Validation inline onBlur ──
  function validateField(key: string) {
    if (key === 'name') {
      if (!form.name.trim()) setErrors(e => ({ ...e, name: 'اسم المنتج مطلوب' }));
      else setErrors(e => { const x = { ...e }; delete x.name; return x; });
    }
    if (key === 'purchase_price_ht') {
      if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0) setErrors(e => ({ ...e, purchase_price_ht: 'سعر الشراء مطلوب (0 أو أكثر)' }));
      else setErrors(e => { const x = { ...e }; delete x.purchase_price_ht; return x; });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0) errs.purchase_price_ht = 'سعر الشراء مطلوب (0 أو أكثر)';
    setErrors(errs);
    if (Object.keys(errs).length) { setActiveTab('basic'); return false; }
    return true;
  }

  function handleSubmit() { if (!validate()) return; setApiError(''); mutation.mutate(buildPayload(form)); }

  function handleClose() {
    if (isDirty && !mutation.isPending) {
      if (!window.confirm('لديك تعديلات غير محفوظة. هل تريد الخروج؟')) return;
    }
    onClose();
  }

  if (!open) return null;

  // ── Tab indicators ──
  function tabDot(tabId: TabId): 'done' | 'warn' | 'empty' {
    if (tabId === 'basic')    { return (!form.name.trim() || form.purchase_price_ht === '') ? 'warn' : 'done'; }
    if (tabId === 'pricing')  { return form.prices.some(p => (p.pricing_method === 'fixed' && p.price !== '' && p.price !== null) || (p.pricing_method === 'rate' && p.rate !== '' && p.rate !== null) || (p.pricing_method === 'margin' && p.margin !== '' && p.margin !== null)) ? 'done' : 'empty'; }
    if (tabId === 'packagings') return form.packagings.length > 0 ? 'done' : 'empty';
    if (tabId === 'discounts')  return form.manages_quantity_discounts && form.quantity_discounts.length > 0 ? 'done' : 'empty';
    return 'empty';
  }

  function tabBadge(tabId: TabId): number | null {
    if (tabId === 'pricing')    return form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length || null;
    if (tabId === 'packagings') return form.packagings.length || null;
    if (tabId === 'discounts')  return form.quantity_discounts.filter(d => d.active).length || null;
    return null;
  }

  const dotColor = (d: ReturnType<typeof tabDot>) =>
    d === 'done' ? 'var(--green)' : d === 'warn' ? '#f59e0b' : 'transparent';

  // ═════════════════════════════════════════
  // TAB RENDERS
  // ═════════════════════════════════════════

  function renderBasic() {
    return (
      <div className={s.section}>
        <div className="grid grid-cols-auto gap-3 items-end">
          <Field label="اسم المنتج *" error={errors.name}>
            <input ref={nameRef} className={s.inp(!!errors.name)} value={form.name}
              onChange={e => set('name', e.target.value)}
              onBlur={() => validateField('name')}
              placeholder="مثال: حليب نصف دسم 1 لتر" />
          </Field>
          <Toggle checked={form.active} onChange={v => set('active', v)} label="نشط" />
        </div>

        <div className={s.row2}>
          <Field label="المرجع (SKU)" hint="مرجع داخلي فريد">
            <input className={s.inp()} value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="EX-001" />
          </Field>
          <Field label="الباركود">
            <input className={s.inp()} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="6121234567890" />
          </Field>
        </div>

        <Field label="الوصف">
          <textarea className={buildClasses(s.inp(), 'resize-vertical')} style={{ minHeight: '72px' }} value={form.description}
            onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للمنتج..." />
        </Field>

        <div className={s.divider} />

        <div className={s.row3}>
          <Field label="التصنيف">
            <select className={s.sel()} value={form.family_id ?? ''} onChange={e => set('family_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="العلامة التجارية">
            <select className={s.sel()} value={form.brand_id ?? ''} onChange={e => set('brand_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="نوع المنتج">
            <select className={s.sel()} value={form.product_type_id ?? ''} onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null;
              const pt = (productTypes as ProductType[]).find(t => t.id === id);
              setForm(f => ({ ...f, product_type_id: id, manages_stock: pt?.manages_stock ?? f.manages_stock }));
              setIsDirty(true);
            }}>
              <option value="">— اختر —</option>
              {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>

        <div className={s.row3}>
          <Field label="معدل TVA" error={errors.tva_id}>
            <select className={s.sel()} value={form.tva_id ?? ''} onChange={e => set('tva_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(tvaRates as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%{t.is_default ? ' (افتراضي)' : ''}</option>)}
            </select>
          </Field>
          <Field label="وحدة القياس">
            <select className={s.sel()} value={form.unit_id ?? ''} onChange={e => set('unit_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(units as Unit[]).map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </select>
          </Field>
          <Field label="سعر الشراء HT *" error={errors.purchase_price_ht} hint="يُستخدم أساساً لحساب الأسعار">
            <input type="number" min="0" step="0.01" className={s.inp(!!errors.purchase_price_ht)}
              value={form.purchase_price_ht}
              onChange={e => set('purchase_price_ht', e.target.value === '' ? '' : +e.target.value)}
              onBlur={() => validateField('purchase_price_ht')}
              placeholder="0.00" />
          </Field>
          <Field label="الحد الأدنى لنسبة هامش الربح %" hint="تحذير عندما يكون هامش البيع أقل من هذه النسبة">
            <input type="number" min="0" max="100" step="0.01" className={s.inp()}
              value={form.min_margin_percentage === null ? '' : form.min_margin_percentage}
              onChange={e => set('min_margin_percentage', e.target.value === '' ? null : +e.target.value)}
              placeholder="5.00" />
          </Field>
        </div>
      </div>
    );
  }

  function renderPricing() {
    const lvls = priceLevels as PriceLevel[];
    if (!lvls.length) return (
      <div className="text-center py-56 text-t4">
        <i className="ti ti-tag text-5xl opacity-30" />
        <div className="mt-10 text-base">لا توجد مستويات أسعار معرفة</div>
        <div className="text-sm mt-1">أضف مستويات الأسعار من الإعدادات أولاً</div>
      </div>
    );

    const purchasePrice = Number(form.purchase_price_ht) || 0;
    return (
      <div className={s.section}>
        <div className="grid grid-cols-3 gap-2">
          {PRICING_METHODS.map(m => (
            <div key={m.value} className="px-3 py-10 rounded-md border border-b2 bg-3 flex items-start gap-2">
              <i className={`ti ${m.icon} text-base text-em mt-1 flex-shrink-0`} />
              <div>
                <div className="text-md font-bold text-t2">{m.label}</div>
                <div className="text-xs text-t4 mt-1">{m.hint}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {lvls.map(pl => {
            const pr = form.prices.find(p => p.price_level_id === pl.id) ?? { price_level_id: pl.id, pricing_method: 'fixed' as const, price: '', rate: '', margin: '', active: true };
            const method = pr.pricing_method;
            let preview = 0;
            if (method === 'fixed'  && pr.price  !== '' && pr.price  !== null) preview = Number(pr.price);
            if (method === 'rate'   && pr.rate   !== '' && pr.rate   !== null) preview = purchasePrice * (1 + Number(pr.rate) / 100);
            if (method === 'margin' && pr.margin !== '' && pr.margin !== null) preview = purchasePrice + Number(pr.margin);

            return (
              <div key={pl.id} className="grid gap-10 items-center px-14 py-10 rounded-md border transition-opacity" style={{ gridTemplateColumns: '140px 1fr 1fr 60px auto', opacity: pr.active ? 1 : 0.55, borderColor: pr.active ? 'var(--b2)' : 'var(--b1)', background: pr.active ? 'var(--bg2)' : 'var(--bg3)' }}>
                <div>
                  <div className="text-base font-bold text-t1">{pl.name}</div>
                  {preview > 0 && <div className="text-sm text-em mt-1 font-semibold">≈ {fmtDZD(preview)}</div>}
                </div>
                <select className={buildClasses(s.sel(), 'text-sm')} value={method} onChange={e => updatePrice(pl.id, 'pricing_method', e.target.value as any)}>
                  {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input type="number" min="0" step="0.01" className={buildClasses(s.inp(), 'text-sm')}
                  value={method === 'fixed' ? (pr.price ?? '') : method === 'rate' ? (pr.rate ?? '') : (pr.margin ?? '')}
                  onChange={e => {
                    const k = method === 'fixed' ? 'price' : method === 'rate' ? 'rate' : 'margin';
                    updatePrice(pl.id, k as any, e.target.value === '' ? '' : +e.target.value);
                    if (method === 'fixed')  { updatePrice(pl.id, 'rate', '');  updatePrice(pl.id, 'margin', ''); }
                    if (method === 'rate')   { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'margin', ''); }
                    if (method === 'margin') { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'rate', ''); }
                  }}
                  placeholder={method === 'rate' ? '% فوق الشراء' : method === 'margin' ? 'هامش دج' : 'سعر دج'} />
                <div className="text-xs text-t4 text-center">{method === 'rate' ? '%' : 'دج'}</div>
                <Toggle checked={pr.active} onChange={v => updatePrice(pl.id, 'active', v)} label="" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderPackagings() {
    return (
      <div style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>التعبئات تمثل وحدات البيع المختلفة (وحدة، كرتون، باليطة...)</div>
          <button onClick={addPackaging} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة تعبئة
          </button>
        </div>

        {form.packagings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)' }}>
            <i className="ti ti-package" style={{ fontSize: 36, opacity: 0.3 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>لا توجد تعبئات — المنتج يُباع بوحدته الأساسية</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr 90px 60px 60px auto', gap: 8, padding: '0 12px' }}>
              {['الكود', 'الاسم', 'الكمية', 'الباركود', 'افتراضي', 'نشط', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {form.packagings.map((pkg, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr 90px 60px 60px auto', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
                <input placeholder="UN" style={{ ...s.inp(), textTransform: 'uppercase', fontSize: 12 }} value={pkg.code} onChange={e => updatePackaging(idx, 'code', e.target.value.toUpperCase())} />
                <input placeholder="قارورة" style={{ ...s.inp(), fontSize: 12 }} value={pkg.label} onChange={e => updatePackaging(idx, 'label', e.target.value)} />
                <input type="number" min="0.0001" step="1" placeholder="الكمية" style={{ ...s.inp(), fontSize: 12 }} value={pkg.quantity} onChange={e => updatePackaging(idx, 'quantity', e.target.value ? +e.target.value : '')} />
                <input placeholder="باركود" style={{ ...s.inp(), fontSize: 11 }} value={pkg.barcode} onChange={e => updatePackaging(idx, 'barcode', e.target.value)} />
                <div style={{ textAlign: 'center' }}><input type="radio" name="default_pkg" checked={pkg.is_default} onChange={() => updatePackaging(idx, 'is_default', true)} /></div>
                <div style={{ textAlign: 'center' }}><Toggle checked={pkg.active} onChange={v => updatePackaging(idx, 'active', v)} label="" /></div>
                <button onClick={() => removePackaging(idx)} style={{ padding: '6px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStock() {
    const dis = !form.manages_stock;
    return (
      <div style={s.section}>
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' }}>
          <Toggle checked={form.manages_stock} onChange={v => { setForm(f => ({ ...f, manages_stock: v, allow_negative_stock: v ? f.allow_negative_stock : false })); setIsDirty(true); }} label="إدارة المخزون" />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>فعّل هذا الخيار لتتبع الكميات والتنبيهات</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, opacity: dis ? 0.4 : 1, pointerEvents: dis ? 'none' : 'auto' }}>
          {[
            { key: 'allow_negative_stock', label: 'السماح بمخزون سالب', hint: 'يتيح البيع حتى عند نفاد المخزون' },
            { key: 'has_lots',             label: 'إدارة الدفعات (Lots)', hint: 'تتبع دفعات الإنتاج والشراء' },
            { key: 'has_expiration_date',  label: 'تتبع تاريخ الصلاحية', hint: 'يتطلب تفعيل الدفعات أيضاً' },
          ].map(opt => (
            <div key={opt.key} style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
              <Toggle checked={(form as any)[opt.key]} onChange={v => set(opt.key as any, v)} label={opt.label} />
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>{opt.hint}</div>
            </div>
          ))}
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
            <Field label="طريقة التقييم">
              <select style={s.sel()} value={form.valuation_method_id ?? ''} onChange={e => set('valuation_method_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— افتراضي الشركة —</option>
                {(valuationMethods as ValuationMethod[]).map(m => <option key={m.id} value={m.id}>{m.name} ({m.method})</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div style={{ opacity: dis ? 0.4 : 1, pointerEvents: dis ? 'none' : 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>تنبيهات المخزون</div>
          <div style={s.row2}>
            <Field label="الحد الأدنى للتنبيه" hint="تنبيه عند الوصول لهذه الكمية">
              <input type="number" min="0" step="1" style={s.inp()} value={form.min_stock_alert} onChange={e => set('min_stock_alert', e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="الحد الأقصى المطلوب" hint="لأغراض الطلب وإعادة التموين">
              <input type="number" min="0" step="1" style={s.inp()} value={form.max_stock_alert} onChange={e => set('max_stock_alert', e.target.value === '' ? '' : +e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  function renderDiscounts() {
    const lvls = priceLevels as PriceLevel[];
    return (
      <div style={s.section}>
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' }}>
          <Toggle checked={form.manages_quantity_discounts} onChange={v => set('manages_quantity_discounts', v)} label="تفعيل خصومات الكميات" />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>أسعار خاصة بناءً على الكمية المطلوبة لكل مستوى سعر</div>
        </div>

        {form.manages_quantity_discounts && lvls.map(pl => {
          const plDiscounts = form.quantity_discounts.filter(d => d.price_level_id === pl.id);
          return (
            <div key={pl.id} style={{ border: '1px solid var(--b2)', borderRadius: 'var(--r3)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderBottom: plDiscounts.length ? '1px solid var(--b2)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-tag" style={{ fontSize: 14, color: 'var(--em)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pl.name}</span>
                  {plDiscounts.length > 0 && (
                    <span style={{ fontSize: 10, background: 'var(--emb)', color: 'var(--em)', padding: '1px 7px', borderRadius: 12, fontWeight: 700 }}>{plDiscounts.length}</span>
                  )}
                </div>
                <button onClick={() => addDiscount(pl.id)} style={{ padding: '5px 12px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--em)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> إضافة شريحة
                </button>
              </div>

              {plDiscounts.length > 0 && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 100px 100px auto auto auto', gap: 8, padding: '0 4px' }}>
                    {['من كمية', 'إلى كمية', 'خصم دج', 'خصم %', 'مجمد', 'نشط', ''].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {form.quantity_discounts.map((d, idx) => {
                    if (d.price_level_id !== pl.id) return null;
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 80px 100px 100px auto auto auto', gap: 8, alignItems: 'center', padding: '8px 4px', borderRadius: 'var(--r1)', background: d.is_blocked ? 'var(--bg3)' : undefined, opacity: d.active ? 1 : 0.5 }}>
                        <input type="number" min="0" step="1" placeholder="1"    style={{ ...s.inp(), fontSize: 12 }} value={d.min_qty} onChange={e => updateDiscount(idx, 'min_qty', e.target.value ? +e.target.value : '')} />
                        <input type="number" min="0" step="1" placeholder="∞"    style={{ ...s.inp(), fontSize: 12 }} value={d.max_qty ?? ''} onChange={e => updateDiscount(idx, 'max_qty', e.target.value ? +e.target.value : null)} />
                        <input type="number" min="0" step="0.01" placeholder="دج" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_amount ?? ''} onChange={e => updateDiscount(idx, 'discount_amount', e.target.value ? +e.target.value : null)} />
                        <input type="number" min="0" max="100" step="0.1" placeholder="%" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_percentage ?? ''} onChange={e => updateDiscount(idx, 'discount_percentage', e.target.value ? +e.target.value : null)} />
                        <div title="تجميد مؤقت" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => updateDiscount(idx, 'is_blocked', !d.is_blocked)}>
                          <i className={`ti ${d.is_blocked ? 'ti-lock' : 'ti-lock-open'}`} style={{ fontSize: 16, color: d.is_blocked ? 'var(--red)' : 'var(--t4)' }} />
                        </div>
                        <Toggle checked={d.active} onChange={v => updateDiscount(idx, 'active', v)} label="" />
                        <button onClick={() => removeDiscount(idx)} style={{ padding: '5px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
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

  function renderDimensions() {
    const dims = [
      { key: 'weight', label: 'الوزن',    unit: 'كغ', step: '0.001' },
      { key: 'volume', label: 'الحجم',    unit: 'م³', step: '0.001' },
      { key: 'length', label: 'الطول',    unit: 'سم', step: '0.1'   },
      { key: 'width',  label: 'العرض',    unit: 'سم', step: '0.1'   },
      { key: 'height', label: 'الارتفاع', unit: 'سم', step: '0.1'   },
    ] as const;

    function addSpec() {
      if (!specKey.trim() || !specVal.trim()) return;
      set('specifications', { ...form.specifications, [specKey.trim()]: specVal.trim() });
      setSpecKey(''); setSpecVal('');
    }

    return (
      <div style={s.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {dims.map(d => (
            <Field key={d.key} label={`${d.label} (${d.unit})`}>
              <input type="number" step={d.step} min="0" style={s.inp()}
                value={(form as any)[d.key] ?? ''}
                onChange={e => set(d.key as any, e.target.value === '' ? '' : +e.target.value)}
                placeholder="0" />
            </Field>
          ))}
        </div>

        <div style={s.divider} />

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>الخصائص التقنية</div>

          {Object.keys(form.specifications).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--t4)', padding: '8px 0 12px', textAlign: 'center' }}>لا توجد خصائص — أضف مثل اللون، المادة، الطاقة...</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(form.specifications).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ ...s.inp(), flex: 1, fontSize: 12, fontWeight: 600 }} defaultValue={k}
                  onBlur={e => {
                    const newKey = e.target.value.trim();
                    if (!newKey || newKey === k) return;
                    const sp = { ...form.specifications }; const val = sp[k]; delete sp[k]; sp[newKey] = val;
                    set('specifications', sp);
                  }} placeholder="الخاصية" />
                <input style={{ ...s.inp(), flex: 1, fontSize: 12 }} value={v}
                  onChange={e => set('specifications', { ...form.specifications, [k]: e.target.value })}
                  placeholder="القيمة" />
                <button onClick={() => { const sp = { ...form.specifications }; delete sp[k]; set('specifications', sp); }}
                  style={{ padding: '6px 8px', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>

          {/* إضافة خاصية */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px dashed var(--b3)', background: 'var(--bg3)' }}>
            <input placeholder="الخاصية (مثال: اللون)" style={{ ...s.inp(), flex: 1, fontSize: 12, background: 'var(--bg2)' }}
              value={specKey} onChange={e => setSpecKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSpec(); }} />
            <input placeholder="القيمة (مثال: أحمر)" style={{ ...s.inp(), flex: 1, fontSize: 12, background: 'var(--bg2)' }}
              value={specVal} onChange={e => setSpecVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSpec(); }} />
            <button onClick={addSpec} style={{ padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <i className="ti ti-plus" /> إضافة
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>اضغط Enter لإضافة الخاصية بسرعة</div>
        </div>
      </div>
    );
  }

  function renderMeta() {
    return (
      <div style={s.section}>
        <Field label="slug الرابط" hint="يُولّد تلقائياً من الاسم — يمكن تخصيصه">
          <input style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace' }} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="my-product" />
        </Field>
        <div style={{ fontSize: 11, color: 'var(--t4)', padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)', lineHeight: 1.7 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, marginLeft: 6 }} />
          حقول <strong>meta_title</strong> و <strong>meta_description</strong> و <strong>meta_keywords</strong> تُعدل مستقبلاً عبر واجهة متخصصة.
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // MODAL RENDER
  // ═════════════════════════════════════════

  const tabContent: Record<TabId, () => React.ReactNode> = {
    basic: renderBasic, pricing: renderPricing, packagings: renderPackagings,
    stock: renderStock, discounts: renderDiscounts, dimensions: renderDimensions, meta: renderMeta,
  };

  const currentTabIdx = TAB_IDS.indexOf(activeTab);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,.5)',
        backdropFilter: 'blur(3px)',
        // ✅ المودل يظهر أعلى قليلاً من حافة الشاشة السفلية
        paddingTop: '5vh',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 840,
        background: 'var(--bg1)',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -8px 48px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column',
        // ✅ ارتفاع ثابت = لا يتغير بتبديل التاب
        height: '95vh',
        overflow: 'hidden',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--b2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-package" style={{ fontSize: 20, color: 'var(--em)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
                {isEdit ? 'تعديل المنتج' : 'منتج جديد'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {form.name.trim()
                  ? <span style={{ color: form.purchase_price_ht !== '' ? 'var(--em)' : '#f59e0b', fontWeight: 600 }}>{form.name.length > 32 ? form.name.slice(0, 32) + '…' : form.name}</span>
                  : <span>بدون اسم</span>
                }
                {/* ✅ شارة "غير محفوظ" */}
                {isDirty && (
                  <span style={{ fontSize: 10, background: '#f59e0b', color: '#fff', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>غير محفوظ</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* ✅ Keyboard hint */}
            <div style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--b2)' }}>
              Ctrl+S للحفظ
            </div>
            <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const dot      = tabDot(tab.id);
            const badge    = tabBadge(tab.id);
            return (
              <button key={tab.id} onClick={() => switchTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 14px', fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--em)' : 'var(--t3)', background: 'transparent', border: 'none', borderBottom: `2px solid ${isActive ? 'var(--em)' : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .15s, border-color .15s' }}>
                <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
                {tab.label}
                {/* ✅ عداد */}
                {badge !== null && (
                  <span style={{ fontSize: 10, background: isActive ? 'var(--em)' : 'var(--b3)', color: isActive ? '#fff' : 'var(--t3)', padding: '0 5px', borderRadius: 10, fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px', height: 16 }}>
                    {badge}
                  </span>
                )}
                {/* نقطة الحالة */}
                {dot !== 'empty' && badge === null && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(dot), flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ══ BODY ══ */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'thin' }}>
          {/* ✅ API Error مع زر إغلاق */}
          {apiError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r2)', marginBottom: 16, background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.3)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{apiError}</span>
              <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 0, opacity: 0.7 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          )}
          {tabContent[activeTab]()}
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{ padding: '11px 20px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg2)' }}>
          {/* ملخص */}
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap' }}>
            {form.name.trim() && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> اسم</span>}
            {form.purchase_price_ht !== '' && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> {fmtDZD(form.purchase_price_ht)}</span>}
            {form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '') && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length} أسعار</span>}
            {form.packagings.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> {form.packagings.length} تعبئة</span>}
          </div>

          {/* ✅ أزرار التنقل + الحفظ */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {currentTabIdx > 0 && (
              <button onClick={() => switchTab(TAB_IDS[currentTabIdx - 1])} style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}>
                <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> السابق
              </button>
            )}
            {currentTabIdx < TAB_IDS.length - 1 && (
              <button onClick={() => switchTab(TAB_IDS[currentTabIdx + 1])} style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}>
                التالي <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
              </button>
            )}
            <div style={{ width: 1, height: 22, background: 'var(--b2)', margin: '0 2px' }} />
            <button onClick={handleClose} disabled={mutation.isPending} style={{ padding: '8px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Tajawal, inherit' }}>
              إلغاء
            </button>
            <button onClick={handleSubmit} disabled={mutation.isPending} style={{ padding: '8px 22px', borderRadius: 'var(--r2)', border: 'none', background: mutation.isPending ? 'var(--b3)' : 'var(--em)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: mutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Tajawal, inherit', transition: 'background .15s', boxShadow: mutation.isPending ? 'none' : '0 2px 8px rgba(0,0,0,.15)' }}>
              {mutation.isPending
                ? <><i className="ti ti-loader" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                : <><i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> {isEdit ? 'حفظ التعديلات' : 'إنشاء المنتج'}</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
