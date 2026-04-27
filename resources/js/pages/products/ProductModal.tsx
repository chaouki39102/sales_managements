// resources/js/components/products/ProductModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';
import apiClient from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Family    { id: number; name: string; }
interface Brand     { id: number; name: string; }
interface ProductType { id: number; name: string; label?: string; }
interface Unit      { id: number; name: string; symbol: string; }
interface TvaRate   { id: number; rate: number; is_default?: boolean; }
interface PriceLevel { id: number; name: string; }

interface VariantPrice {
  price_level_id: number;
  price: number | '';
  valid_from?: string;
  valid_to?: string;
  active: boolean;
}

interface QuantityDiscount {
  min_quantity: number | '';
  max_quantity?: number | null | '';
  discount_percentage?: number | null | '';
  discount_per_unit?: number | null | '';
  tier_order: number;
  active: boolean;
}

// اسم الحقول متوافق مع Backend (ProductService.prepareVariantData)
interface VariantForm {
  id?: number;
  ref: string;
  variant_name: string;
  barcode: string;
  last_purchase_price: number | '';          // اسم DB
  default_selling_price_ht: number | '';     // اسم DB
  tva_id: number | null;
  unit_id: number | null;
  min_stock_alert: number;                   // اسم DB
  active: boolean;
  manages_stock: boolean;
  allow_negative_stock: boolean;
  has_lots: boolean;
  has_expiration_date: boolean;
  manages_quantity_discounts: boolean;
  weight?: number | null;
  volume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  variant_attributes?: Record<string, string>;
  prices: VariantPrice[];
  quantity_discounts: QuantityDiscount[];
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  family_id: number | null;
  brand_id: number | null;
  product_type_id: number | null;
  images: string[];
  active: boolean;
  variants: VariantForm[];
}

interface ProductModalProps {
  open: boolean;
  product?: any | null;
  lookups?: {
    families?: Family[];
    brands?: Brand[];
    priceLevels?: PriceLevel[];
  };
  onClose: () => void;
  onSaved: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants / Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' دج';

const inp = (err?: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', borderRadius: 'var(--r2)',
  border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
  background: 'var(--bg2)', color: 'var(--t1)',
  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
  outline: 'none', transition: 'border-color .15s',
});

const sel: React.CSSProperties = { ...inp(), cursor: 'pointer', appearance: 'menulist' as any };

const STEPS = [
  { label: 'معلومات المنتج', icon: 'ti-info-circle' },
  { label: 'المتغيرات',      icon: 'ti-versions' },
  { label: 'مراجعة',         icon: 'ti-check' },
];

function makeEmptyVariant(priceLevels: PriceLevel[], tvaId: number | null): VariantForm {
  return {
    ref: '', variant_name: '', barcode: '',
    last_purchase_price: '', default_selling_price_ht: '',
    tva_id: tvaId, unit_id: null,
    min_stock_alert: 0,
    active: true, manages_stock: true,
    allow_negative_stock: false, has_lots: false,
    has_expiration_date: false, manages_quantity_discounts: false,
    weight: null, volume: null, length: null, width: null, height: null,
    variant_attributes: {},
    prices: priceLevels.map(pl => ({ price_level_id: pl.id, price: '', active: true })),
    quantity_discounts: [],
  };
}

// تحويل بيانات المنتج القادمة من API إلى صيغة الفورم
function productToForm(product: any, priceLevels: PriceLevel[]): ProductFormData {
  const variants: VariantForm[] = (product.variants ?? []).map((v: any) => ({
    id: v.id,
    ref: v.ref ?? '',
    variant_name: v.variant_name ?? '',
    barcode: v.barcode ?? '',
    last_purchase_price: v.purchase_price ?? v.last_purchase_price ?? '',
    default_selling_price_ht: v.price_ht ?? v.default_selling_price_ht ?? '',
    tva_id: v.tva_id ?? null,
    unit_id: v.unit_id ?? null,
    min_stock_alert: v.min_stock ?? v.min_stock_alert ?? 0,
    active: v.active ?? true,
    manages_stock: v.manages_stock ?? true,
    allow_negative_stock: v.allow_negative_stock ?? false,
    has_lots: v.has_lots ?? false,
    has_expiration_date: v.has_expiration_date ?? false,
    manages_quantity_discounts: v.manages_quantity_discounts ?? false,
    weight: v.weight ?? null,
    volume: v.volume ?? null,
    length: v.length ?? null,
    width: v.width ?? null,
    height: v.height ?? null,
    variant_attributes: v.variant_attributes ?? {},
    prices: priceLevels.map(pl => {
      const existing = (v.prices ?? []).find((p: any) => p.price_level_id === pl.id);
      return {
        price_level_id: pl.id,
        price: existing?.price ?? '',
        valid_from: existing?.valid_from ?? '',
        valid_to: existing?.valid_to ?? '',
        active: existing?.active !== false,
      };
    }),
    quantity_discounts: (v.quantity_discounts ?? []).map((d: any) => ({
      min_quantity: d.min_quantity,
      max_quantity: d.max_quantity ?? null,
      discount_percentage: d.discount_percentage ?? null,
      discount_per_unit: d.discount_per_unit ?? null,
      tier_order: d.tier_order,
      active: d.active ?? true,
    })),
  }));

  return {
    name: product.name ?? '',
    slug: product.slug ?? '',
    description: product.description ?? '',
    family_id: product.family_id ?? null,
    brand_id: product.brand_id ?? null,
    product_type_id: product.product_type_id ?? null,
    images: product.images ?? [],
    active: product.active ?? true,
    variants,
  };
}

function emptyForm(): ProductFormData {
  return {
    name: '', slug: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    images: [], active: true, variants: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Stepper
// ═══════════════════════════════════════════════════════════════════════════

function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const cur  = i === step;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--em)' : cur ? 'var(--emb)' : 'var(--bg3)',
                color: done ? '#fff' : cur ? 'var(--em)' : 'var(--t4)',
                border: cur ? '2px solid var(--em)' : '2px solid transparent',
                fontSize: 14, transition: 'all .2s',
              }}>
                {done
                  ? <i className="ti ti-check" style={{ fontSize: 15 }} />
                  : <i className={`ti ${s.icon}`} style={{ fontSize: 14 }} />
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: cur ? 'var(--em)' : done ? 'var(--t3)' : 'var(--t4)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--em)' : 'var(--b2)', margin: '0 4px', marginBottom: 18, transition: 'background .3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Variant Sidebar Card
// ═══════════════════════════════════════════════════════════════════════════

function VariantCard({ v, index, active, onSelect, onRemove, hasError }: {
  v: VariantForm; index: number; active: boolean;
  onSelect: () => void; onRemove: () => void; hasError: boolean;
}) {
  return (
    <div onClick={onSelect} style={{
      borderRadius: 'var(--r2)', padding: '9px 12px', cursor: 'pointer',
      border: active ? '1.5px solid var(--em)' : hasError ? '1px solid var(--red)' : '1px solid var(--b2)',
      background: active ? 'var(--emb)' : 'var(--bg3)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'all .12s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: active ? 'var(--em)' : 'var(--bg4)',
          color: active ? '#fff' : 'var(--t4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>{index + 1}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {v.variant_name || v.ref || `متغير ${index + 1}`}
          </div>
          {v.ref && <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{v.ref}</div>}
        </div>
        {hasError && <i className="ti ti-alert-circle" style={{ color: 'var(--red)', fontSize: 14 }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {Number(v.default_selling_price_ht) > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--em)' }}>
            {formatDZD(Number(v.default_selling_price_ht))}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--b2)', cursor: 'pointer', background: 'var(--bg3)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
        >
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, lookups, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProductFormData>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [selVariant, setSelVariant] = useState(0);
  const [variantTab, setVariantTab] = useState<'basic' | 'prices' | 'discounts' | 'dimensions'>('basic');

  // ── جلب بيانات المساعدة ──
  const fetchOpts = { enabled: open, staleTime: Infinity };

  const { data: families = [] } = useQuery({
    queryKey: ['families'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
    initialData: lookups?.families?.length ? lookups.families : undefined,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
    initialData: lookups?.brands?.length ? lookups.brands : undefined,
  });

  const { data: productTypes = [] } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => apiClient.get('/product-types', { params: { per_page: 50 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient.get('/units', { params: { per_page: 100 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
  });

  const { data: tvaRates = [] } = useQuery({
    queryKey: ['tvas'],
    queryFn: () => apiClient.get('/tvas', { params: { per_page: 20 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
  });

  const { data: priceLevels = [] } = useQuery({
    queryKey: ['price-levels'],
    queryFn: () => apiClient.get('/price-levels', { params: { per_page: 50 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
    initialData: lookups?.priceLevels?.length ? lookups.priceLevels : undefined,
  });

  const defaultTvaId = (tvaRates as TvaRate[]).find(t => t.is_default)?.id ?? null;

  // ── تهيئة الفورم عند الفتح ──
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError('');
    setStep(0);
    setSelVariant(0);
    setVariantTab('basic');

    if (isEdit && product && priceLevels.length >= 0) {
      setForm(productToForm(product, priceLevels as PriceLevel[]));
    } else {
      setForm(emptyForm());
    }
  }, [open, product?.id]);

  // ── عند تحميل priceLevels: أضف الأسعار الناقصة للمتغيرات الموجودة ──
  useEffect(() => {
    if (!priceLevels.length || !open) return;
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        prices: (priceLevels as PriceLevel[]).map(pl => {
          const existing = v.prices.find(p => p.price_level_id === pl.id);
          return existing ?? { price_level_id: pl.id, price: '', active: true };
        }),
      })),
    }));
  }, [priceLevels.length, open]);

  // ── Variant helpers ──
  const addVariant = useCallback(() => {
    const newV = makeEmptyVariant(priceLevels as PriceLevel[], defaultTvaId);
    setForm(f => ({ ...f, variants: [...f.variants, newV] }));
    setSelVariant(form.variants.length);
    setVariantTab('basic');
  }, [priceLevels, defaultTvaId, form.variants.length]);

  const removeVariant = (idx: number) => {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
    setSelVariant(s => Math.max(0, s >= idx ? s - 1 : s));
  };

  const updateVariant = (idx: number, key: keyof VariantForm, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[idx] = { ...variants[idx], [key]: value };
      return { ...f, variants };
    });
  };

  const updatePrice = (vidx: number, plId: number, field: keyof VariantPrice, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      const prices = variants[vidx].prices.map(p =>
        p.price_level_id === plId ? { ...p, [field]: value } : p
      );
      variants[vidx] = { ...variants[vidx], prices };
      return { ...f, variants };
    });
  };

  const addDiscount = (vidx: number) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = [...variants[vidx].quantity_discounts, {
        min_quantity: 1, max_quantity: null,
        discount_percentage: null, discount_per_unit: null,
        tier_order: variants[vidx].quantity_discounts.length + 1, active: true,
      }];
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  const removeDiscount = (vidx: number, didx: number) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[vidx] = { ...variants[vidx], quantity_discounts: variants[vidx].quantity_discounts.filter((_, i) => i !== didx) };
      return { ...f, variants };
    });
  };

  const updateDiscount = (vidx: number, didx: number, field: keyof QuantityDiscount, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = [...variants[vidx].quantity_discounts];
      discounts[didx] = { ...discounts[didx], [field]: value };
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  // ── Validation ──
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.variants.length === 0) errs.variants = 'يجب إضافة متغير واحد على الأقل';
    form.variants.forEach((v, i) => {
      if (!v.ref.trim()) errs[`v${i}_ref`] = 'المرجع مطلوب';
      if (v.default_selling_price_ht === '' || Number(v.default_selling_price_ht) < 0)
        errs[`v${i}_price`] = 'سعر البيع مطلوب';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 0 && !form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (s === 1) {
      if (form.variants.length === 0) errs.variants = 'يجب إضافة متغير واحد على الأقل';
      form.variants.forEach((v, i) => {
        if (!v.ref.trim()) errs[`v${i}_ref`] = 'المرجع مطلوب';
        if (v.default_selling_price_ht === '' || Number(v.default_selling_price_ht) < 0)
          errs[`v${i}_price`] = 'سعر البيع مطلوب';
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Build Payload ──
  function buildPayload() {
    return {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      family_id: form.family_id,
      brand_id: form.brand_id,
      product_type_id: form.product_type_id,
      active: form.active,
      images: form.images,
      variants: form.variants.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        ref: v.ref,
        variant_name: v.variant_name || null,
        barcode: v.barcode || null,
        last_purchase_price: v.last_purchase_price !== '' ? Number(v.last_purchase_price) : null,
        default_selling_price_ht: v.default_selling_price_ht !== '' ? Number(v.default_selling_price_ht) : 0,
        tva_id: v.tva_id,
        unit_id: v.unit_id,
        min_stock_alert: Number(v.min_stock_alert) || 0,
        active: v.active,
        manages_stock: v.manages_stock,
        allow_negative_stock: v.allow_negative_stock,
        has_lots: v.has_lots,
        has_expiration_date: v.has_expiration_date,
        manages_quantity_discounts: v.manages_quantity_discounts,
        weight: v.weight || null,
        volume: v.volume || null,
        length: v.length || null,
        width: v.width || null,
        height: v.height || null,
        variant_attributes: v.variant_attributes || {},
        prices: v.prices
          .filter(p => p.price !== '' && p.price !== null && Number(p.price) > 0)
          .map(p => ({
            price_level_id: p.price_level_id,
            price: Number(p.price),
            valid_from: p.valid_from || null,
            valid_to: p.valid_to || null,
            active: p.active,
          })),
        quantity_discounts: v.manages_quantity_discounts
          ? v.quantity_discounts
              .filter(d => d.min_quantity !== '' && Number(d.min_quantity) >= 0
                && (d.discount_percentage || d.discount_per_unit))
              .map((d, idx) => ({
                min_quantity: Number(d.min_quantity),
                max_quantity: d.max_quantity !== '' && d.max_quantity != null ? Number(d.max_quantity) : null,
                discount_percentage: d.discount_percentage ? Number(d.discount_percentage) : null,
                discount_per_unit: d.discount_per_unit ? Number(d.discount_per_unit) : null,
                tier_order: idx + 1,
                active: d.active,
              }))
          : [],
      })),
    };
  }

  // ── Mutation ──
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      return isEdit && product
        ? apiClient.put(`/products/${product.id}`, payload)
        : apiClient.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const msg = data?.message
        || Object.values(data?.errors ?? {}).flat().join(' | ')
        || 'فشل الحفظ، يرجى المحاولة مرة أخرى';
      setApiError(msg);
      // إذا كانت أخطاء في المتغيرات، ارجع لخطوة المتغيرات
      if (data?.errors && Object.keys(data.errors).some(k => k.startsWith('variants'))) {
        setStep(1);
      }
    },
  });

  function handleSave() {
    setApiError('');
    if (validate()) saveMutation.mutate();
  }

  if (!open) return null;

  const isPending = saveMutation.isPending;
  const cv = form.variants[selVariant];

  // ── Render ──
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      subtitle={`${form.name || 'أدخل اسم المنتج'} • ${form.variants.length} متغير`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={step === 0 ? onClose : () => setStep(s => s - 1)} disabled={isPending}>
            {step === 0 ? 'إلغاء' : <><i className="ti ti-arrow-right" /> رجوع</>}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => { if (validateStep(step)) setStep(s => s + 1); }}>
              التالي <i className="ti ti-arrow-left" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={isPending}>
              {isPending
                ? <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ الحفظ...</>
                : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'
              }
            </Button>
          )}
        </div>
      }
    >
      {apiError && <AlertBar variant="red" style={{ marginBottom: 16 }}>{apiError}</AlertBar>}

      {/* Stepper */}
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--b1)', marginBottom: 20 }}>
        <Stepper step={step} />
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 0 — معلومات المنتج                               */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fgrid c2" style={{ gap: 14 }}>
            <div className="fg s2">
              <label className="req">اسم المنتج</label>
              <input
                style={inp(!!errors.name)}
                value={form.name}
                placeholder="أدخل اسم المنتج..."
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.name}</span>}
            </div>
            <div className="fg">
              <label>الرابط الدائم (Slug)</label>
              <input
                style={inp()}
                value={form.slug}
                placeholder="يُوَلَّد تلقائياً"
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              />
            </div>
          </div>

          <div className="fgrid c3" style={{ gap: 14 }}>
            <div className="fg">
              <label>الفئة</label>
              <select style={sel} value={form.family_id ?? ''} onChange={e => setForm(f => ({ ...f, family_id: e.target.value ? +e.target.value : null }))}>
                <option value="">— بدون فئة —</option>
                {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>العلامة التجارية</label>
              <select style={sel} value={form.brand_id ?? ''} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value ? +e.target.value : null }))}>
                <option value="">— بدون علامة —</option>
                {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>نوع المنتج</label>
              <select style={sel} value={form.product_type_id ?? ''} onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value ? +e.target.value : null }))}>
                <option value="">— بدون نوع —</option>
                {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="fg">
            <label>الوصف</label>
            <textarea
              style={{ ...inp(), resize: 'vertical' }}
              rows={4}
              placeholder="وصف المنتج..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* معرض الصور */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>معرض الصور</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {form.images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 'var(--r2)', overflow: 'hidden', border: '1px solid var(--b2)' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              ))}
              <label style={{ width: 80, height: 80, borderRadius: 'var(--r2)', border: '2px dashed var(--b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData(); fd.append('image', file);
                  try {
                    const { data } = await apiClient.post('/attachments', fd);
                    setForm(f => ({ ...f, images: [...f.images, data.url] }));
                  } catch { /* silent */ }
                }} />
                <i className="ti ti-plus" style={{ fontSize: 24, color: 'var(--t4)' }} />
              </label>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <Switch
              checked={form.active}
              onChange={v => setForm(f => ({ ...f, active: v }))}
              label={form.active ? 'المنتج نشط ومتاح للبيع' : 'المنتج غير نشط'}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 1 — المتغيرات                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={{ display: 'flex', gap: 16, minHeight: 460 }}>
          {/* Sidebar */}
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 2 }}>
              المتغيرات ({form.variants.length})
            </div>
            {form.variants.map((v, i) => (
              <VariantCard
                key={i} v={v} index={i} active={selVariant === i}
                hasError={!!(errors[`v${i}_ref`] || errors[`v${i}_price`])}
                onSelect={() => { setSelVariant(i); setVariantTab('basic'); }}
                onRemove={() => removeVariant(i)}
              />
            ))}
            <button
              onClick={addVariant}
              style={{ padding: '8px 12px', borderRadius: 'var(--r2)', cursor: 'pointer', border: '1.5px dashed var(--b3)', background: 'transparent', color: 'var(--t4)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}
            >
              <i className="ti ti-plus" /> إضافة متغير
            </button>
            {errors.variants && (
              <div style={{ color: 'var(--red)', fontSize: 11, padding: 8, background: 'var(--redb)', borderRadius: 'var(--r2)' }}>
                {errors.variants}
              </div>
            )}
          </div>

          {/* Details */}
          {cv ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--b1)' }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {cv.variant_name || cv.ref || `متغير ${selVariant + 1}`}
                </div>
                <Switch
                  checked={cv.active}
                  onChange={v => updateVariant(selVariant, 'active', v)}
                  label={cv.active ? 'نشط' : 'غير نشط'}
                />
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--b1)' }}>
                {(['basic', 'prices', 'discounts', 'dimensions'] as const).map(tab => {
                  const labels: Record<string, [string, string]> = {
                    basic: ['أساسي', 'ti-info-circle'],
                    prices: ['أسعار', 'ti-tag'],
                    discounts: ['خصومات', 'ti-discount'],
                    dimensions: ['أبعاد', 'ti-ruler'],
                  };
                  const [label, icon] = labels[tab];
                  return (
                    <button key={tab} onClick={() => setVariantTab(tab)} style={{
                      padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 700, color: variantTab === tab ? 'var(--em)' : 'var(--t4)',
                      borderBottom: variantTab === tab ? '2px solid var(--em)' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 12 }} /> {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab: Basic */}
              {variantTab === 'basic' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label className="req">المرجع (SKU)</label>
                    <input
                      style={inp(!!errors[`v${selVariant}_ref`])}
                      value={cv.ref}
                      placeholder="REF-001"
                      onChange={e => updateVariant(selVariant, 'ref', e.target.value)}
                    />
                    {errors[`v${selVariant}_ref`] && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors[`v${selVariant}_ref`]}</span>}
                  </div>
                  <div>
                    <label>اسم المتغير</label>
                    <input style={inp()} value={cv.variant_name} placeholder="مثال: أحمر L" onChange={e => updateVariant(selVariant, 'variant_name', e.target.value)} />
                  </div>
                  <div>
                    <label>الباركود</label>
                    <input style={inp()} value={cv.barcode} placeholder="6191..." onChange={e => updateVariant(selVariant, 'barcode', e.target.value)} />
                  </div>
                  <div>
                    <label>سعر الشراء (HT)</label>
                    <input type="number" min="0" step="0.01" style={inp()} value={cv.last_purchase_price} placeholder="0.00" onChange={e => updateVariant(selVariant, 'last_purchase_price', e.target.value)} />
                  </div>
                  <div>
                    <label className="req">سعر البيع (HT)</label>
                    <input
                      type="number" min="0" step="0.01"
                      style={inp(!!errors[`v${selVariant}_price`])}
                      value={cv.default_selling_price_ht}
                      placeholder="0.00"
                      onChange={e => updateVariant(selVariant, 'default_selling_price_ht', e.target.value)}
                    />
                    {errors[`v${selVariant}_price`] && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors[`v${selVariant}_price`]}</span>}
                  </div>
                  <div>
                    <label>معدل TVA</label>
                    <select style={sel} value={cv.tva_id ?? ''} onChange={e => {
                      const id = e.target.value ? +e.target.value : null;
                      updateVariant(selVariant, 'tva_id', id);
                    }}>
                      <option value="">— اختر —</option>
                      {(tvaRates as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label>وحدة القياس</label>
                    <select style={sel} value={cv.unit_id ?? ''} onChange={e => updateVariant(selVariant, 'unit_id', e.target.value ? +e.target.value : null)}>
                      <option value="">— اختر —</option>
                      {(units as Unit[]).map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </select>
                  </div>
                  <div>
                    <label>الحد الأدنى للمخزون</label>
                    <input type="number" min="0" style={inp()} value={cv.min_stock_alert} onChange={e => updateVariant(selVariant, 'min_stock_alert', +e.target.value || 0)} />
                  </div>
                  <div>
                    <label>السمات (JSON)</label>
                    <textarea
                      style={{ ...inp(), fontFamily: 'monospace', fontSize: 11 }}
                      rows={2}
                      placeholder='{"اللون":"أحمر","المقاس":"XL"}'
                      value={JSON.stringify(cv.variant_attributes ?? {}, null, 0)}
                      onChange={e => {
                        try { updateVariant(selVariant, 'variant_attributes', JSON.parse(e.target.value)); } catch { /* ignore */ }
                      }}
                    />
                  </div>
                  {/* Toggles */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
                    {[
                      ['manages_stock', 'إدارة المخزون'],
                      ['allow_negative_stock', 'السماح بالسالب'],
                      ['has_lots', 'دفعات (Lots)'],
                      ['has_expiration_date', 'تاريخ انتهاء'],
                    ].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(cv as any)[key]}
                          onChange={e => updateVariant(selVariant, key as any, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Prices */}
              {variantTab === 'prices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>
                    <i className="ti ti-chart-pie" style={{ marginLeft: 4 }} /> مستويات الأسعار
                  </div>
                  {(priceLevels as PriceLevel[]).length === 0 ? (
                    <div style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      <i className="ti ti-info-circle" /> لا توجد مستويات أسعار مُعرَّفة
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                      {(priceLevels as PriceLevel[]).map(pl => {
                        const price = cv.prices.find(p => p.price_level_id === pl.id);
                        return (
                          <div key={pl.id} style={{ padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r2)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>{pl.name}</div>
                            <input
                              type="number" min="0" step="0.01" style={inp()}
                              placeholder="السعر (0 = بدون مستوى)"
                              value={price?.price ?? ''}
                              onChange={e => updatePrice(selVariant, pl.id, 'price', e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <input
                                type="date" style={{ ...inp(), fontSize: 11, padding: '6px 8px', flex: 1 }}
                                value={price?.valid_from?.split('T')[0] ?? ''}
                                onChange={e => updatePrice(selVariant, pl.id, 'valid_from', e.target.value)}
                              />
                              <input
                                type="date" style={{ ...inp(), fontSize: 11, padding: '6px 8px', flex: 1 }}
                                value={price?.valid_to?.split('T')[0] ?? ''}
                                onChange={e => updatePrice(selVariant, pl.id, 'valid_to', e.target.value)}
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11 }}>
                              <input type="checkbox" checked={price?.active !== false} onChange={e => updatePrice(selVariant, pl.id, 'active', e.target.checked)} />
                              مفعل
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Discounts */}
              {variantTab === 'discounts' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>تخفيضات الكميات</div>
                    <Switch
                      checked={cv.manages_quantity_discounts}
                      onChange={v => updateVariant(selVariant, 'manages_quantity_discounts', v)}
                      label="تفعيل التخفيضات"
                    />
                  </div>
                  {cv.manages_quantity_discounts && (
                    <>
                      <button onClick={() => addDiscount(selVariant)} style={{ padding: '6px 12px', borderRadius: 'var(--r1)', fontSize: 11, border: '1px solid var(--b3)', background: 'transparent', marginBottom: 12, cursor: 'pointer' }}>
                        <i className="ti ti-plus" /> إضافة شريحة
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cv.quantity_discounts.map((d, di) => (
                          <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r2)', flexWrap: 'wrap' }}>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>من</label>
                              <input type="number" min="0" style={{ ...inp(), width: 80 }} value={d.min_quantity} onChange={e => updateDiscount(selVariant, di, 'min_quantity', e.target.value)} />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>إلى</label>
                              <input type="number" min="0" style={{ ...inp(), width: 80 }} value={d.max_quantity ?? ''} onChange={e => updateDiscount(selVariant, di, 'max_quantity', e.target.value || null)} />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>نسبة %</label>
                              <input type="number" step="0.1" min="0" max="100" style={{ ...inp(), width: 90 }} value={d.discount_percentage ?? ''} onChange={e => updateDiscount(selVariant, di, 'discount_percentage', e.target.value || null)} />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>خصم ثابت</label>
                              <input type="number" step="0.01" min="0" style={{ ...inp(), width: 90 }} value={d.discount_per_unit ?? ''} onChange={e => updateDiscount(selVariant, di, 'discount_per_unit', e.target.value || null)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <input type="checkbox" checked={d.active} onChange={e => updateDiscount(selVariant, di, 'active', e.target.checked)} />
                              مفعل
                            </label>
                            <button onClick={() => removeDiscount(selVariant, di)} style={{ color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 'auto' }}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab: Dimensions */}
              {variantTab === 'dimensions' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    ['weight', 'الوزن (كغ)', '0.001'],
                    ['volume', 'الحجم (م³)', '0.001'],
                    ['length', 'الطول (سم)', '0.1'],
                    ['width',  'العرض (سم)', '0.1'],
                    ['height', 'الارتفاع (سم)', '0.1'],
                  ].map(([field, label, step]) => (
                    <div key={field}>
                      <label>{label}</label>
                      <input
                        type="number" step={step} min="0" style={inp()}
                        value={(cv as any)[field] ?? ''}
                        onChange={e => updateVariant(selVariant, field as any, e.target.value ? +e.target.value : null)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', gap: 10 }}>
              <i className="ti ti-versions" style={{ fontSize: 32 }} />
              <div style={{ fontSize: 13 }}>أضف متغيراً أو اختر من القائمة</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 2 — مراجعة وإرسال                               */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Product Summary */}
          <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{form.name}</div>
              <Badge variant={form.active ? 'success' : 'danger'}>{form.active ? 'نشط' : 'غير نشط'}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t3)', flexWrap: 'wrap' }}>
              {form.family_id && <span><i className="ti ti-folder" style={{ marginLeft: 4 }} />{(families as Family[]).find(f => f.id === form.family_id)?.name}</span>}
              {form.brand_id && <span><i className="ti ti-award" style={{ marginLeft: 4 }} />{(brands as Brand[]).find(b => b.id === form.brand_id)?.name}</span>}
              {form.product_type_id && <span><i className="ti ti-category" style={{ marginLeft: 4 }} />{(productTypes as ProductType[]).find(t => t.id === form.product_type_id)?.name}</span>}
            </div>
            {form.description && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)', lineHeight: 1.6 }}>{form.description}</div>}
          </div>

          {/* Variants Summary */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)' }}>{form.variants.length} متغير</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.variants.map((v, i) => {
              const price = Number(v.default_selling_price_ht) || 0;
              const priceLvls = v.prices.filter(p => p.price !== '' && Number(p.price) > 0).length;
              return (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{v.variant_name || v.ref}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                      {v.ref}{v.barcode ? ` · ${v.barcode}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--t4)' }}>سعر البيع HT</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)' }}>{price > 0 ? formatDZD(price) : '—'}</div>
                    </div>
                    {priceLvls > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t4)' }}>مستويات الأسعار</div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{priceLvls} مستوى</div>
                      </div>
                    )}
                    {v.manages_quantity_discounts && v.quantity_discounts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t4)' }}>خصومات</div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{v.quantity_discounts.length} شريحة</div>
                      </div>
                    )}
                    <Badge variant={v.active ? 'success' : 'danger'}>{v.active ? 'نشط' : 'غير نشط'}</Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning if no variants */}
          {form.variants.length === 0 && (
            <AlertBar variant="orange">
              ⚠️ لم تضف أي متغير — يرجى العودة لإضافة متغير واحد على الأقل
            </AlertBar>
          )}
        </div>
      )}
    </Modal>
  );
}
