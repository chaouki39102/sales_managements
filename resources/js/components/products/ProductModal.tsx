// ProductModal.tsx — مودل المنتج المُعاد بناؤه بالكامل
// يتوافق مع: Product model + product_prices + product_packagings + quantity_discounts
// لا variants جدول منفصل — المنتج هو الكيان الرئيسي مباشرة

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES — متوافقة مع DB الحقيقي
// ═══════════════════════════════════════════════════════════════════════════

interface Family     { id: number; name: string; }
interface Brand      { id: number; name: string; }
interface ProductType { id: number; name: string; manages_stock: boolean; }
interface Unit       { id: number; name: string; symbol: string; }
interface TvaRate    { id: number; rate: number; is_default?: boolean; }
interface PriceLevel { id: number; name: string; }
interface ValuationMethod { id: number; name: string; method: string; }

// product_prices row
interface ProductPrice {
  price_level_id: number;
  pricing_method: 'fixed' | 'rate' | 'margin';
  price:   number | null | '';
  rate:    number | null | '';
  margin:  number | null | '';
  active:  boolean;
}

// product_packagings row
interface ProductPackaging {
  id?: number;
  code:          string;  // UN / FD / PLT
  label:         string;  // قارورة / فاردو / باليطة
  quantity:      number | '';
  barcode:       string;
  is_default:    boolean;
  active:        boolean;
  display_order: number;
}

// quantity_discounts row
interface QuantityDiscount {
  id?: number;
  price_level_id:      number;
  min_qty:             number | '';
  max_qty:             number | null | '';
  discount_amount:     number | null | '';
  discount_percentage: number | null | '';
  tier_order:          number;
  is_blocked:          boolean;
  active:              boolean;
}

// النموذج الكامل للمنتج
interface ProductForm {
  name:          string;
  slug:          string;
  ref:           string;
  barcode:       string;
  description:   string;
  family_id:     number | null;
  brand_id:      number | null;
  product_type_id: number | null;
  tva_id:        number | null;
  unit_id:       number | null;
  purchase_price_ht: number | '';
  manages_stock: boolean;
  allow_negative_stock: boolean;
  has_lots:      boolean;
  has_expiration_date: boolean;
  min_stock_alert: number | '';
  max_stock_alert: number | '';
  manages_quantity_discounts: boolean;
  valuation_method_id: number | null;
  weight: number | null | '';
  volume: number | null | '';
  length: number | null | '';
  width:  number | null | '';
  height: number | null | '';
  specifications: Record<string, string>;
  images: string[];
  active: boolean;
  // علاقات مُدارة
  prices:             ProductPrice[];
  packagings:         ProductPackaging[];
  quantity_discounts: QuantityDiscount[];
}

interface ProductModalProps {
  open: boolean;
  product?: any | null;
  onClose: () => void;
  onSaved: (product: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'basic',      label: 'الأساسيات',    icon: 'ti-info-circle' },
  { id: 'pricing',    label: 'الأسعار',       icon: 'ti-tag' },
  { id: 'packagings', label: 'التعبئة',       icon: 'ti-package' },
  { id: 'stock',      label: 'المخزون',       icon: 'ti-building-warehouse' },
  { id: 'discounts',  label: 'الخصومات',      icon: 'ti-discount' },
  { id: 'dimensions', label: 'الأبعاد',       icon: 'ti-ruler' },
  { id: 'meta',       label: 'SEO',           icon: 'ti-world' },
] as const;

type TabId = typeof TABS[number]['id'];

const PRICING_METHODS = [
  { value: 'fixed',  label: 'سعر ثابت',     icon: 'ti-cash', hint: 'Prix de vente HT مباشر' },
  { value: 'rate',   label: 'نسبة فوق الشراء', icon: 'ti-percentage', hint: '% فوق سعر الشراء' },
  { value: 'margin', label: 'هامش ثابت',    icon: 'ti-trending-up', hint: 'هامش بالدج يُضاف للسعر' },
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
    tva_id: defaultTvaId, unit_id: null,
    purchase_price_ht: '',
    manages_stock: true, allow_negative_stock: false,
    has_lots: false, has_expiration_date: false,
    min_stock_alert: '', max_stock_alert: '',
    manages_quantity_discounts: false,
    valuation_method_id: null,
    weight: '', volume: '', length: '', width: '', height: '',
    specifications: {},
    images: [],
    active: true,
    prices: priceLevels.map(pl => ({
      price_level_id: pl.id,
      pricing_method: 'fixed',
      price: '', rate: '', margin: '',
      active: true,
    })),
    packagings: [],
    quantity_discounts: [],
  };
}

function productToForm(p: any, priceLevels: PriceLevel[]): ProductForm {
  return {
    name: p.name ?? '',
    slug: p.slug ?? '',
    ref:  p.ref  ?? '',
    barcode: p.barcode ?? '',
    description: p.description ?? '',
    family_id: p.family_id ?? null,
    brand_id:  p.brand_id  ?? null,
    product_type_id: p.product_type_id ?? null,
    tva_id:  p.tva_id  ?? null,
    unit_id: p.unit_id ?? null,
    purchase_price_ht: p.purchase_price_ht ?? '',
    manages_stock: p.manages_stock ?? true,
    allow_negative_stock: p.allow_negative_stock ?? false,
    has_lots: p.has_lots ?? false,
    has_expiration_date: p.has_expiration_date ?? false,
    min_stock_alert: p.min_stock_alert ?? '',
    max_stock_alert: p.max_stock_alert ?? '',
    manages_quantity_discounts: p.manages_quantity_discounts ?? false,
    valuation_method_id: p.valuation_method_id ?? null,
    weight: p.weight ?? '', volume: p.volume ?? '',
    length: p.length ?? '', width: p.width  ?? '', height: p.height ?? '',
    specifications: p.specifications ?? {},
    images: p.images ?? [],
    active: p.active ?? true,
    prices: priceLevels.map(pl => {
      const ex = (p.prices ?? []).find((x: any) => x.price_level_id === pl.id);
      return {
        price_level_id:  pl.id,
        pricing_method:  ex?.pricing_method ?? 'fixed',
        price:   ex?.price  ?? '',
        rate:    ex?.rate   ?? '',
        margin:  ex?.margin ?? '',
        active:  ex?.active !== false,
      };
    }),
    packagings: (p.packagings ?? []).map((pkg: any) => ({
      id:            pkg.id,
      code:          pkg.code ?? '',
      label:         pkg.label ?? '',
      quantity:      pkg.quantity ?? 1,
      barcode:       pkg.barcode ?? '',
      is_default:    pkg.is_default ?? false,
      active:        pkg.active ?? true,
      display_order: pkg.display_order ?? 0,
    })),
    quantity_discounts: (p.quantity_discounts ?? []).map((d: any) => ({
      id:                  d.id,
      price_level_id:      d.price_level_id,
      min_qty:             d.min_qty ?? '',
      max_qty:             d.max_qty ?? null,
      discount_amount:     d.discount_amount ?? null,
      discount_percentage: d.discount_percentage ?? null,
      tier_order:          d.tier_order ?? 0,
      is_blocked:          d.is_blocked ?? false,
      active:              d.active ?? true,
    })),
  };
}

function buildPayload(form: ProductForm) {
  return {
    name:        form.name,
    slug:        form.slug || undefined,
    ref:         form.ref  || null,
    barcode:     form.barcode || null,
    description: form.description || null,
    family_id:   form.family_id,
    brand_id:    form.brand_id,
    product_type_id: form.product_type_id,
    tva_id:      form.tva_id,
    unit_id:     form.unit_id,
    purchase_price_ht: form.purchase_price_ht !== '' ? Number(form.purchase_price_ht) : 0,
    manages_stock:         form.manages_stock,
    allow_negative_stock:  form.allow_negative_stock,
    has_lots:              form.has_lots,
    has_expiration_date:   form.has_expiration_date,
    min_stock_alert: form.min_stock_alert !== '' ? Number(form.min_stock_alert) : 0,
    max_stock_alert: form.max_stock_alert !== '' ? Number(form.max_stock_alert) : 0,
    manages_quantity_discounts: form.manages_quantity_discounts,
    valuation_method_id: form.valuation_method_id,
    weight: form.weight !== '' ? form.weight : null,
    volume: form.volume !== '' ? form.volume : null,
    length: form.length !== '' ? form.length : null,
    width:  form.width  !== '' ? form.width  : null,
    height: form.height !== '' ? form.height : null,
    specifications: Object.keys(form.specifications).length ? form.specifications : null,
    images: form.images,
    active: form.active,
    prices: form.prices.filter(p => {
      if (p.pricing_method === 'fixed')  return p.price  !== '' && p.price  !== null;
      if (p.pricing_method === 'rate')   return p.rate   !== '' && p.rate   !== null;
      if (p.pricing_method === 'margin') return p.margin !== '' && p.margin !== null;
      return false;
    }),
    packagings: form.packagings.filter(pkg => pkg.code.trim() && pkg.label.trim()),
    quantity_discounts: form.manages_quantity_discounts
      ? form.quantity_discounts.filter(d =>
          d.price_level_id &&
          d.min_qty !== '' &&
          (d.discount_amount !== '' || d.discount_percentage !== '')
        )
      : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════

const s = {
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const },
  inp: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)',
    fontSize: 13, outline: 'none', fontFamily: 'Tajawal, inherit',
    transition: 'border-color .15s',
    boxSizing: 'border-box' as const, width: '100%',
  }),
  sel: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)',
    fontSize: 13, outline: 'none', fontFamily: 'Tajawal, inherit',
    boxSizing: 'border-box' as const, width: '100%', cursor: 'pointer',
  }),
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  section: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  divider: { height: 1, background: 'var(--b2)', margin: '4px 0' },
  hint: { fontSize: 11, color: 'var(--t4)', marginTop: 2 },
  errText: { fontSize: 11, color: 'var(--red)', marginTop: 2 },
};

function Field({ label, error, children, hint, col }: {
  label: string; error?: string; children: React.ReactNode; hint?: string; col?: number;
}) {
  return (
    <div style={{ ...s.field, gridColumn: col ? `span ${col}` : undefined }}>
      <label style={s.label}>{label}</label>
      {children}
      {hint && <span style={s.hint}>{hint}</span>}
      {error && <span style={s.errText}>{error}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? 'var(--em)' : 'var(--b3)',
          transition: 'background .2s', flexShrink: 0, cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const qc = useQueryClient();
  const bodyRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form, setForm] = useState<ProductForm>(() => emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');

  // ── Lookups ──
  const fetchOpts = { enabled: open, staleTime: Infinity };

  const { data: families        = [] } = useQuery<Family[]>({ queryKey: ['families'],        queryFn: () => apiClient.get('/families',       { params: { per_page: 200 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: brands          = [] } = useQuery<Brand[]>({ queryKey: ['brands'],           queryFn: () => apiClient.get('/brands',         { params: { per_page: 200 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: productTypes    = [] } = useQuery<ProductType[]>({ queryKey: ['product-types'], queryFn: () => apiClient.get('/product-types', { params: { per_page: 50 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: units           = [] } = useQuery<Unit[]>({ queryKey: ['units'],             queryFn: () => apiClient.get('/units',          { params: { per_page: 100 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: tvaRates        = [] } = useQuery<TvaRate[]>({ queryKey: ['tvas'],           queryFn: () => apiClient.get('/tvas',           { params: { per_page: 20 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: priceLevels     = [] } = useQuery<PriceLevel[]>({ queryKey: ['price-levels'], queryFn: () => apiClient.get('/price-levels',  { params: { per_page: 50 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: valuationMethods= [] } = useQuery<ValuationMethod[]>({ queryKey: ['valuation-methods'], queryFn: () => apiClient.get('/inventory-valuation-methods', { params: { per_page: 20 } }).then(r => r.data.data ?? []), ...fetchOpts });

  const defaultTvaId = (tvaRates as TvaRate[]).find(t => t.is_default)?.id ?? null;
  const activeProductType = (productTypes as ProductType[]).find(t => t.id === form.product_type_id);

  // ── Reset on open ──
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError('');
    setActiveTab('basic');
    if (isEdit && product && priceLevels.length >= 0) {
      setForm(productToForm(product, priceLevels as PriceLevel[]));
    } else {
      setForm(emptyForm(priceLevels as PriceLevel[], defaultTvaId));
    }
  }, [open, product?.id]);

  // ── Sync priceLevels when they load ──
  useEffect(() => {
    if (!priceLevels.length || !open) return;
    setForm(f => ({
      ...f,
      prices: (priceLevels as PriceLevel[]).map(pl => {
        const ex = f.prices.find(p => p.price_level_id === pl.id);
        return ex ?? { price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true };
      }),
    }));
  }, [priceLevels.length, open]);

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? apiClient.put(`/products/${product.id}`, payload).then(r => r.data)
        : apiClient.post('/products', payload).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onSaved(data);
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'حدث خطأ غير متوقع';
      setApiError(msg);
      const errs = e?.response?.data?.errors ?? {};
      setErrors(errs);
    },
  });

  // ── Form helpers ──
  function set<K extends keyof ProductForm>(key: K, val: ProductForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const x = { ...e }; delete x[key]; return x; });
  }

  function updatePrice(plId: number, key: keyof ProductPrice, val: any) {
    setForm(f => ({
      ...f,
      prices: f.prices.map(p => p.price_level_id === plId ? { ...p, [key]: val } : p),
    }));
  }

  // ── Packaging helpers ──
  function addPackaging() {
    const newPkg: ProductPackaging = {
      code: '', label: '', quantity: 1, barcode: '',
      is_default: form.packagings.length === 0,
      active: true,
      display_order: form.packagings.length,
    };
    setForm(f => ({ ...f, packagings: [...f.packagings, newPkg] }));
  }

  function updatePackaging(idx: number, key: keyof ProductPackaging, val: any) {
    setForm(f => {
      const pkgs = [...f.packagings];
      pkgs[idx] = { ...pkgs[idx], [key]: val };
      if (key === 'is_default' && val) {
        pkgs.forEach((p, i) => { if (i !== idx) pkgs[i] = { ...p, is_default: false }; });
      }
      return { ...f, packagings: pkgs };
    });
  }

  function removePackaging(idx: number) {
    setForm(f => ({ ...f, packagings: f.packagings.filter((_, i) => i !== idx) }));
  }

  // ── Discount helpers ──
  function addDiscount(plId: number) {
    setForm(f => ({
      ...f,
      quantity_discounts: [...f.quantity_discounts, {
        price_level_id: plId,
        min_qty: 1, max_qty: null,
        discount_amount: null, discount_percentage: null,
        tier_order: f.quantity_discounts.filter(d => d.price_level_id === plId).length + 1,
        is_blocked: false, active: true,
      }],
    }));
  }

  function updateDiscount(idx: number, key: keyof QuantityDiscount, val: any) {
    setForm(f => {
      const ds = [...f.quantity_discounts];
      ds[idx] = { ...ds[idx], [key]: val };
      return { ...f, quantity_discounts: ds };
    });
  }

  function removeDiscount(idx: number) {
    setForm(f => ({ ...f, quantity_discounts: f.quantity_discounts.filter((_, i) => i !== idx) }));
  }

  // ── Validation ──
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0) errs.purchase_price_ht = 'سعر الشراء مطلوب';
    setErrors(errs);
    if (Object.keys(errs).length) {
      setActiveTab('basic');
      return false;
    }
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    setApiError('');
    mutation.mutate(buildPayload(form));
  }

  if (!open) return null;

  // ═════════════════════════════════════════
  // RENDER HELPERS — لكل تاب
  // ═════════════════════════════════════════

  function renderBasic() {
    return (
      <div style={s.section}>
        {/* اسم + حالة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <Field label="اسم المنتج *" error={errors.name}>
            <input
              style={s.inp(!!errors.name)}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="مثال: حليب نصف دسم 1 لتر"
            />
          </Field>
          <Toggle checked={form.active} onChange={v => set('active', v)} label="نشط" />
        </div>

        {/* المرجع + الباركود */}
        <div style={s.row2}>
          <Field label="المرجع (SKU)" hint="مرجع داخلي فريد">
            <input style={s.inp()} value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="EX-001" />
          </Field>
          <Field label="الباركود">
            <input style={s.inp()} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="6121234567890" />
          </Field>
        </div>

        {/* الوصف */}
        <Field label="الوصف">
          <textarea
            style={{ ...s.inp(), resize: 'vertical', minHeight: 70 }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="وصف مختصر للمنتج..."
          />
        </Field>

        <div style={s.divider} />

        {/* التصنيف + العلامة + النوع */}
        <div style={s.row3}>
          <Field label="التصنيف">
            <select style={s.sel()} value={form.family_id ?? ''} onChange={e => set('family_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="العلامة التجارية">
            <select style={s.sel()} value={form.brand_id ?? ''} onChange={e => set('brand_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="نوع المنتج">
            <select style={s.sel()} value={form.product_type_id ?? ''} onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null;
              const pt = (productTypes as ProductType[]).find(t => t.id === id);
              setForm(f => ({ ...f, product_type_id: id, manages_stock: pt?.manages_stock ?? f.manages_stock }));
            }}>
              <option value="">— اختر —</option>
              {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>

        {/* ضريبة + وحدة + سعر الشراء */}
        <div style={s.row3}>
          <Field label="معدل TVA" error={errors.tva_id}>
            <select style={s.sel()} value={form.tva_id ?? ''} onChange={e => set('tva_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(tvaRates as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%{t.is_default ? ' (افتراضي)' : ''}</option>)}
            </select>
          </Field>
          <Field label="وحدة القياس">
            <select style={s.sel()} value={form.unit_id ?? ''} onChange={e => set('unit_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(units as Unit[]).map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </select>
          </Field>
          <Field label="سعر الشراء HT *" error={errors.purchase_price_ht} hint="يستخدم كأساس لحساب الأسعار">
            <input
              type="number" min="0" step="0.01"
              style={s.inp(!!errors.purchase_price_ht)}
              value={form.purchase_price_ht}
              onChange={e => set('purchase_price_ht', e.target.value === '' ? '' : +e.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>
      </div>
    );
  }

  function renderPricing() {
    const lvls = priceLevels as PriceLevel[];
    if (!lvls.length) return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
        <i className="ti ti-tag" style={{ fontSize: 32 }} />
        <div style={{ marginTop: 8 }}>لا توجد مستويات أسعار معرفة</div>
      </div>
    );

    const purchasePrice = Number(form.purchase_price_ht) || 0;

    return (
      <div style={s.section}>
        {/* شرح طرق التسعير */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PRICING_METHODS.map(m => (
            <div key={m.value} style={{
              padding: '10px 12px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg3)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <i className={`ti ${m.icon}`} style={{ fontSize: 16, color: 'var(--em)', marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{m.hint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* جدول الأسعار */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lvls.map(pl => {
            const pr = form.prices.find(p => p.price_level_id === pl.id) ?? { price_level_id: pl.id, pricing_method: 'fixed' as const, price: '', rate: '', margin: '', active: true };
            const method = pr.pricing_method;

            // حساب السعر المتوقع
            let preview = 0;
            if (method === 'fixed'  && pr.price  !== '' && pr.price  !== null) preview = Number(pr.price);
            if (method === 'rate'   && pr.rate   !== '' && pr.rate   !== null) preview = purchasePrice * (1 + Number(pr.rate) / 100);
            if (method === 'margin' && pr.margin !== '' && pr.margin !== null) preview = purchasePrice + Number(pr.margin);

            return (
              <div key={pl.id} style={{
                display: 'grid', gridTemplateColumns: '140px 1fr 1fr 80px auto',
                gap: 10, alignItems: 'center',
                padding: '10px 14px', borderRadius: 'var(--r2)',
                border: `1px solid ${pr.active ? 'var(--b2)' : 'var(--b1)'}`,
                background: pr.active ? 'var(--bg2)' : 'var(--bg3)',
                opacity: pr.active ? 1 : 0.6,
              }}>
                {/* اسم المستوى */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{pl.name}</div>
                  {preview > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--em)', marginTop: 2, fontWeight: 600 }}>
                      ≈ {fmtDZD(preview)}
                    </div>
                  )}
                </div>

                {/* طريقة التسعير */}
                <select style={{ ...s.sel(), fontSize: 12 }} value={method} onChange={e => updatePrice(pl.id, 'pricing_method', e.target.value as any)}>
                  {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                {/* القيمة */}
                <input
                  type="number" min="0" step="0.01"
                  style={{ ...s.inp(), fontSize: 12 }}
                  value={method === 'fixed' ? (pr.price ?? '') : method === 'rate' ? (pr.rate ?? '') : (pr.margin ?? '')}
                  onChange={e => {
                    const k = method === 'fixed' ? 'price' : method === 'rate' ? 'rate' : 'margin';
                    updatePrice(pl.id, k as any, e.target.value === '' ? '' : +e.target.value);
                    // نصفر الباقي
                    if (method === 'fixed')  { updatePrice(pl.id, 'rate',   ''); updatePrice(pl.id, 'margin', ''); }
                    if (method === 'rate')   { updatePrice(pl.id, 'price',  ''); updatePrice(pl.id, 'margin', ''); }
                    if (method === 'margin') { updatePrice(pl.id, 'price',  ''); updatePrice(pl.id, 'rate',   ''); }
                  }}
                  placeholder={method === 'rate' ? '% فوق الشراء' : method === 'margin' ? 'هامش دج' : 'سعر دج'}
                />

                {/* وحدة */}
                <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center' }}>
                  {method === 'rate' ? '%' : 'دج'}
                </div>

                {/* تفعيل */}
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
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            التعبئات تمثل وحدات البيع المختلفة (وحدة، كرتون، باليطة...)
          </div>
          <button
            onClick={addPackaging}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة تعبئة
          </button>
        </div>

        {form.packagings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t4)' }}>
            <i className="ti ti-package" style={{ fontSize: 32 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>لا توجد تعبئات — المنتج يُباع بوحدته الأساسية</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 1fr 80px 70px 70px auto', gap: 8, padding: '0 12px' }}>
              {['الكود', 'الاسم', 'الكمية', 'الباركود', 'افتراضي', 'نشط', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {form.packagings.map((pkg, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '70px 100px 1fr 80px 70px 70px auto',
                gap: 8, alignItems: 'center',
                padding: '10px 12px', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)', background: 'var(--bg2)',
              }}>
                <input placeholder="UN" style={{ ...s.inp(), textTransform: 'uppercase', fontSize: 12 }}
                  value={pkg.code} onChange={e => updatePackaging(idx, 'code', e.target.value.toUpperCase())} />
                <input placeholder="قارورة" style={{ ...s.inp(), fontSize: 12 }}
                  value={pkg.label} onChange={e => updatePackaging(idx, 'label', e.target.value)} />
                <input type="number" min="0.0001" step="1" placeholder="الكمية"
                  style={{ ...s.inp(), fontSize: 12 }}
                  value={pkg.quantity} onChange={e => updatePackaging(idx, 'quantity', e.target.value ? +e.target.value : '')} />
                <input placeholder="باركود" style={{ ...s.inp(), fontSize: 11 }}
                  value={pkg.barcode} onChange={e => updatePackaging(idx, 'barcode', e.target.value)} />
                <div style={{ textAlign: 'center' }}>
                  <input type="radio" name="default_pkg" checked={pkg.is_default}
                    onChange={() => updatePackaging(idx, 'is_default', true)} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Toggle checked={pkg.active} onChange={v => updatePackaging(idx, 'active', v)} label="" />
                </div>
                <button onClick={() => removePackaging(idx)}
                  style={{ padding: '6px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>
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
    const stockDisabled = !form.manages_stock;
    return (
      <div style={s.section}>
        {/* تفعيل إدارة المخزون */}
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' }}>
          <Toggle checked={form.manages_stock} onChange={v => {
            setForm(f => ({ ...f, manages_stock: v, allow_negative_stock: v ? f.allow_negative_stock : false }));
          }} label="إدارة المخزون" />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
            فعّل هذا الخيار لتتبع الكميات والتنبيهات
          </div>
        </div>

        {/* خيارات المخزون */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, opacity: stockDisabled ? 0.4 : 1, pointerEvents: stockDisabled ? 'none' : 'auto' }}>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
            <Toggle checked={form.allow_negative_stock} onChange={v => set('allow_negative_stock', v)} label="السماح بمخزون سالب" />
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>يتيح البيع حتى عند نفاد المخزون</div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
            <Toggle checked={form.has_lots} onChange={v => set('has_lots', v)} label="إدارة الدفعات (Lots)" />
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>تتبع دفعات الإنتاج والشراء</div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
            <Toggle checked={form.has_expiration_date} onChange={v => set('has_expiration_date', v)} label="تتبع تاريخ الصلاحية" />
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>يتطلب تفعيل الدفعات أيضاً</div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)', gridColumn: 'span 1' }}>
            <Field label="طريقة التقييم">
              <select style={s.sel()} value={form.valuation_method_id ?? ''} onChange={e => set('valuation_method_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— افتراضي الشركة —</option>
                {(valuationMethods as ValuationMethod[]).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.method})</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* تنبيهات المخزون */}
        <div style={{ opacity: stockDisabled ? 0.4 : 1, pointerEvents: stockDisabled ? 'none' : 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>
            تنبيهات المخزون
          </div>
          <div style={s.row2}>
            <Field label="الحد الأدنى للتنبيه" hint="تنبيه عند الوصول لهذه الكمية">
              <input type="number" min="0" step="1" style={s.inp()}
                value={form.min_stock_alert} onChange={e => set('min_stock_alert', e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="الحد الأقصى المطلوب" hint="لأغراض الطلب وإعادة التموين">
              <input type="number" min="0" step="1" style={s.inp()}
                value={form.max_stock_alert} onChange={e => set('max_stock_alert', e.target.value === '' ? '' : +e.target.value)} />
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
        {/* تفعيل */}
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' }}>
          <Toggle checked={form.manages_quantity_discounts} onChange={v => set('manages_quantity_discounts', v)} label="تفعيل خصومات الكميات" />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>أسعار خاصة بناءً على الكمية المطلوبة لكل مستوى سعر</div>
        </div>

        {form.manages_quantity_discounts && (
          <>
            {lvls.map(pl => {
              const plDiscounts = form.quantity_discounts.filter(d => d.price_level_id === pl.id);
              return (
                <div key={pl.id} style={{ border: '1px solid var(--b2)', borderRadius: 'var(--r3)', overflow: 'hidden' }}>
                  {/* رأس المستوى */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg3)',
                    borderBottom: plDiscounts.length ? '1px solid var(--b2)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="ti ti-tag" style={{ fontSize: 14, color: 'var(--em)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{pl.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>({plDiscounts.length} شريحة)</span>
                    </div>
                    <button
                      onClick={() => addDiscount(pl.id)}
                      style={{ padding: '5px 12px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--em)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                    >
                      <i className="ti ti-plus" style={{ fontSize: 12 }} /> إضافة شريحة
                    </button>
                  </div>

                  {/* الشرائح */}
                  {plDiscounts.length > 0 && (
                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 100px 100px auto auto auto', gap: 8, padding: '0 4px' }}>
                        {['من كمية', 'إلى كمية', 'خصم دج', 'خصم %', 'مجمد', 'نشط', ''].map((h, i) => (
                          <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
                        ))}
                      </div>
                      {form.quantity_discounts.map((d, idx) => {
                        if (d.price_level_id !== pl.id) return null;
                        return (
                          <div key={idx} style={{
                            display: 'grid', gridTemplateColumns: '80px 80px 100px 100px auto auto auto',
                            gap: 8, alignItems: 'center',
                            padding: '8px 4px', borderRadius: 'var(--r1)',
                            background: d.is_blocked ? 'var(--bg3)' : undefined,
                            opacity: d.active ? 1 : 0.5,
                          }}>
                            <input type="number" min="0" step="1" placeholder="1" style={{ ...s.inp(), fontSize: 12 }}
                              value={d.min_qty} onChange={e => updateDiscount(idx, 'min_qty', e.target.value ? +e.target.value : '')} />
                            <input type="number" min="0" step="1" placeholder="∞" style={{ ...s.inp(), fontSize: 12 }}
                              value={d.max_qty ?? ''} onChange={e => updateDiscount(idx, 'max_qty', e.target.value ? +e.target.value : null)} />
                            <input type="number" min="0" step="0.01" placeholder="0.00 دج" style={{ ...s.inp(), fontSize: 12 }}
                              value={d.discount_amount ?? ''} onChange={e => updateDiscount(idx, 'discount_amount', e.target.value ? +e.target.value : null)} />
                            <input type="number" min="0" max="100" step="0.1" placeholder="0.00 %" style={{ ...s.inp(), fontSize: 12 }}
                              value={d.discount_percentage ?? ''} onChange={e => updateDiscount(idx, 'discount_percentage', e.target.value ? +e.target.value : null)} />
                            <div title="تجميد مؤقت" style={{ textAlign: 'center', cursor: 'pointer' }}
                              onClick={() => updateDiscount(idx, 'is_blocked', !d.is_blocked)}>
                              <i className={`ti ${d.is_blocked ? 'ti-lock' : 'ti-lock-open'}`} style={{ fontSize: 16, color: d.is_blocked ? 'var(--red)' : 'var(--t4)' }} />
                            </div>
                            <Toggle checked={d.active} onChange={v => updateDiscount(idx, 'active', v)} label="" />
                            <button onClick={() => removeDiscount(idx)}
                              style={{ padding: '5px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
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
          </>
        )}
      </div>
    );
  }

  function renderDimensions() {
    const dims = [
      { key: 'weight', label: 'الوزن', unit: 'كغ',  step: '0.001' },
      { key: 'volume', label: 'الحجم', unit: 'م³',  step: '0.001' },
      { key: 'length', label: 'الطول', unit: 'سم',  step: '0.1'   },
      { key: 'width',  label: 'العرض', unit: 'سم',  step: '0.1'   },
      { key: 'height', label: 'الارتفاع', unit: 'سم', step: '0.1' },
    ] as const;

    return (
      <div style={s.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {dims.map(d => (
            <Field key={d.key} label={`${d.label} (${d.unit})`}>
              <input type="number" step={d.step} min="0" style={s.inp()}
                value={(form as any)[d.key] ?? ''}
                onChange={e => set(d.key as any, e.target.value === '' ? '' : +e.target.value)}
                placeholder="0"
              />
            </Field>
          ))}
        </div>

        <div style={s.divider} />

        {/* الخصائص التقنية */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>
            الخصائص التقنية
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(form.specifications).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r1)', background: 'var(--bg3)', fontSize: 12, fontWeight: 600 }}>{k}</div>
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r1)', background: 'var(--bg3)', fontSize: 12 }}>{v}</div>
                <button onClick={() => {
                  const sp = { ...form.specifications };
                  delete sp[k];
                  set('specifications', sp);
                }} style={{ padding: '6px 8px', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>

          {/* إضافة خاصية */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input placeholder="الخاصية (مثال: اللون)" style={{ ...s.inp(), flex: 1, fontSize: 12 }}
              value={specKey} onChange={e => setSpecKey(e.target.value)} />
            <input placeholder="القيمة (مثال: أحمر)" style={{ ...s.inp(), flex: 1, fontSize: 12 }}
              value={specVal} onChange={e => setSpecVal(e.target.value)} />
            <button
              onClick={() => {
                if (!specKey.trim() || !specVal.trim()) return;
                set('specifications', { ...form.specifications, [specKey.trim()]: specVal.trim() });
                setSpecKey(''); setSpecVal('');
              }}
              style={{ padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <i className="ti ti-plus" /> إضافة
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMeta() {
    return (
      <div style={s.section}>
        <Field label="عنوان SEO" hint="إذا تركته فارغاً يُستخدم اسم المنتج">
          <input style={s.inp()} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="my-product-slug" />
        </Field>
        <Field label="slug الرابط" hint="يُولّد تلقائياً من الاسم — يمكن تخصيصه">
          <input style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace' }} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="my-product" />
        </Field>

        <div style={{ fontSize: 11, color: 'var(--t4)', padding: '10px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, marginLeft: 6 }} />
          حقول meta_title و meta_description و meta_keywords تُعدل مستقبلاً عبر واجهة متخصصة
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // TAB COMPLETION INDICATOR
  // ══════════════════════════════════════════════════════════
  function tabDot(tabId: TabId): 'done' | 'warn' | 'empty' {
    if (tabId === 'basic') {
      if (!form.name.trim() || form.purchase_price_ht === '') return 'warn';
      return 'done';
    }
    if (tabId === 'pricing') {
      const filled = form.prices.some(p =>
        (p.pricing_method === 'fixed'  && p.price  !== '' && p.price  !== null) ||
        (p.pricing_method === 'rate'   && p.rate   !== '' && p.rate   !== null) ||
        (p.pricing_method === 'margin' && p.margin !== '' && p.margin !== null)
      );
      return filled ? 'done' : 'empty';
    }
    if (tabId === 'packagings') return form.packagings.length ? 'done' : 'empty';
    if (tabId === 'discounts')  return form.manages_quantity_discounts && form.quantity_discounts.length ? 'done' : 'empty';
    return 'empty';
  }

  const dotColor = (d: ReturnType<typeof tabDot>) =>
    d === 'done' ? 'var(--green)' : d === 'warn' ? 'var(--red)' : 'transparent';

  // ═════════════════════════════════════════════════
  // MODAL RENDER
  // ═════════════════════════════════════════════════

  const tabContent: Record<TabId, () => React.ReactNode> = {
    basic:      renderBasic,
    pricing:    renderPricing,
    packagings: renderPackagings,
    stock:      renderStock,
    discounts:  renderDiscounts,
    dimensions: renderDimensions,
    meta:       renderMeta,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,.45)',
      backdropFilter: 'blur(2px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        width: '100%', maxWidth: 820,
        background: 'var(--bg1)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '92vh',
        overflow: 'hidden',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--b2)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-package" style={{ fontSize: 20, color: 'var(--em)' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
                {isEdit ? 'تعديل المنتج' : 'منتج جديد'}
              </div>
              {isEdit && product?.name && (
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{product.name}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* مؤشر الكمال */}
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>
              {form.name.trim() ? (
                <span style={{ color: form.purchase_price_ht !== '' ? 'var(--em)' : 'var(--red)', fontWeight: 600 }}>
                  {form.name.length > 24 ? form.name.slice(0, 24) + '…' : form.name}
                </span>
              ) : (
                <span style={{ color: 'var(--t4)' }}>بدون اسم</span>
              )}
            </div>
            <button onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)',
          overflowX: 'auto', flexShrink: 0,
          scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const dot = tabDot(tab.id);
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '11px 16px', fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? 'var(--em)' : 'var(--t3)',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${active ? 'var(--em)' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color .15s, border-color .15s',
                position: 'relative',
              }}>
                <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
                {tab.label}
                {dot !== 'empty' && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: dotColor(dot),
                    flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ══ BODY ══ */}
        <div ref={bodyRef} style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          scrollbarWidth: 'thin',
        }}>
          {apiError && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--r2)', marginBottom: 14,
              background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.25)',
              color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
              {apiError}
            </div>
          )}
          {tabContent[activeTab]()}
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          {/* معلومات ملخصة */}
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--t4)' }}>
            {form.name.trim() && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--green)' }} />
                اسم المنتج
              </span>
            )}
            {form.purchase_price_ht !== '' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--green)' }} />
                سعر الشراء: {fmtDZD(form.purchase_price_ht)}
              </span>
            )}
            {form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '') && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--green)' }} />
                {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length} أسعار بيع
              </span>
            )}
          </div>

          {/* أزرار */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={mutation.isPending}
              style={{ padding: '8px 18px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Tajawal, inherit' }}>
              إلغاء
            </button>
            <button onClick={handleSubmit} disabled={mutation.isPending}
              style={{
                padding: '8px 22px', borderRadius: 'var(--r2)', border: 'none',
                background: mutation.isPending ? 'var(--b3)' : 'var(--em)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'Tajawal, inherit',
                transition: 'background .15s',
              }}>
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
