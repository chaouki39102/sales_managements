// resources/js/components/products/ProductModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
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

interface Family { id: number; name: string; }
interface Brand { id: number; name: string; }
interface ProductType { id: number; name: string; label: string; }
interface Unit { id: number; name: string; symbol: string; }
interface TvaRate { id: number; rate: number; is_default?: boolean; }
interface PriceLevel { id: number; name: string; }

interface VariantPrice {
  price_level_id: number;
  price: number | '';
  valid_from?: string;
  valid_to?: string;
  active: boolean;
}

interface QuantityDiscount {
  min_quantity: number;
  max_quantity?: number | null;
  discount_percentage?: number | null;
  discount_per_unit?: number | null;
  tier_order: number;
  active: boolean;
}

interface VariantForm {
  id?: number;
  ref: string;
  variant_name: string;
  barcode: string;
  purchase_price: number | '';
  price_ht: number | '';
  tva_rate: number;
  tva_id: number | null;
  unit_id: number | null;
  min_stock: number;
  active: boolean;
  prices: VariantPrice[];
  quantity_discounts: QuantityDiscount[];
  manages_quantity_discounts: boolean;
  weight?: number | null;
  volume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  variant_attributes?: Record<string, string>;
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
    families: Family[];
    brands: Brand[];
    productTypes: ProductType[];
    units: Unit[];
    tvaRates: TvaRate[];
    priceLevels: PriceLevel[];
  };
  onClose: () => void;
  onSaved: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatDZD = (amount: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ' دج';

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

// ═══════════════════════════════════════════════════════════════════════════
// Stepper Component
// ═══════════════════════════════════════════════════════════════════════════

function Stepper({ step, steps }: { step: number; steps: { label: string; icon: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const done = i < step;
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
                {done ? <i className="ti ti-check" style={{ fontSize: 15 }} /> : <i className={`ti ${s.icon}`} style={{ fontSize: 14 }} />}
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

// ═══════════════════════════════════════════════════════════════════════════
// Variant Card Component
// ═══════════════════════════════════════════════════════════════════════════

function VariantCard({ variant, index, active, onSelect, onRemove, errors }: {
  variant: VariantForm; index: number; active: boolean;
  onSelect: () => void; onRemove: () => void; errors: Record<string, string>;
}) {
  const hasError = !!errors[`v${index}_ref`];
  const minPrice = variant.price_ht ? Number(variant.price_ht) : 0;

  return (
    <div
      onClick={onSelect}
      style={{
        borderRadius: 'var(--r2)', padding: '9px 12px', cursor: 'pointer',
        border: active ? '1.5px solid var(--em)' : hasError ? '1px solid var(--red)' : '1px solid var(--b2)',
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
          {variant.ref && (
            <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
              {variant.ref}
            </div>
          )}
        </div>
        {hasError && <i className="ti ti-alert-circle" style={{ color: 'var(--red)', fontSize: 14 }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {minPrice > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {formatDZD(minPrice)}
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

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, lookups, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeVariantTab, setActiveVariantTab] = useState<'basic' | 'prices' | 'discounts' | 'dimensions'>('basic');

  const steps = [
    { label: 'معلومات المنتج', icon: 'ti-info-circle' },
    { label: 'المتغيرات', icon: 'ti-versions' },
    { label: 'التسعير', icon: 'ti-tag' },
    { label: 'مراجعة', icon: 'ti-check' },
  ];

  // جلب البيانات المساعدة
  const { data: fetchedFamilies = [] } = useQuery({
    queryKey: ['families'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data?.data || []),
    enabled: open && (!lookups?.families || lookups.families.length === 0),
    staleTime: Infinity,
  });
  const { data: fetchedBrands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data?.data || []),
    enabled: open && (!lookups?.brands || lookups.brands.length === 0),
    staleTime: Infinity,
  });
  const { data: fetchedProductTypes = [] } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => apiClient.get('/product-types', { params: { per_page: 50 } }).then(r => r.data?.data || []),
    enabled: open && (!lookups?.productTypes || lookups.productTypes.length === 0),
    staleTime: Infinity,
  });
  const { data: fetchedUnits = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient.get('/units', { params: { per_page: 100 } }).then(r => r.data?.data || []),
    enabled: open && (!lookups?.units || lookups.units.length === 0),
    staleTime: Infinity,
  });
  const { data: fetchedTvaRates = [] } = useQuery({
    queryKey: ['tvas'],
    queryFn: () => apiClient.get('/tvas', { params: { per_page: 20 } }).then(r => r.data?.data || []),
    enabled: open && (!lookups?.tvaRates || lookups.tvaRates.length === 0),
    staleTime: Infinity,
  });
  const { data: fetchedPriceLevels = [] } = useQuery({
    queryKey: ['price-levels'],
    queryFn: () => apiClient.get('/price-levels', { params: { per_page: 50 } }).then(r => r.data?.data || []),
    enabled: open && (!lookups?.priceLevels || lookups.priceLevels.length === 0),
    staleTime: Infinity,
  });

  const families = lookups?.families || fetchedFamilies || [];
  const brands = lookups?.brands || fetchedBrands || [];
  const productTypes = lookups?.productTypes || fetchedProductTypes || [];
  const units = lookups?.units || fetchedUnits || [];
  const tvaRates = lookups?.tvaRates || fetchedTvaRates || [];
  const priceLevels = lookups?.priceLevels || fetchedPriceLevels || [];

  const defaultTvaId = tvaRates.find((t: TvaRate) => t.is_default)?.id || null;
  const defaultTvaRate = tvaRates.find((t: TvaRate) => t.is_default)?.rate || 19;

  // نموذج البيانات
  const [form, setForm] = useState<ProductFormData>(() => ({
    name: '', slug: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    images: [], active: true, variants: [],
  }));

  // تهيئة النموذج عند الفتح
  useEffect(() => {
    if (!open) return;

    if (product && isEdit) {
      const variants = (product.variants || []).map((v: any) => ({
        id: v.id,
        ref: v.ref || '',
        variant_name: v.variant_name || '',
        barcode: v.barcode || '',
        purchase_price: v.purchase_price ?? '',
        price_ht: v.price_ht ?? '',
        tva_rate: v.tva_rate || defaultTvaRate,
        tva_id: v.tva_id || defaultTvaId,
        unit_id: v.unit_id || null,
        min_stock: v.min_stock ?? 0,
        active: v.active ?? true,
        prices: priceLevels.map((pl: PriceLevel) => {
          const existing = v.prices?.find((p: any) => p.price_level_id === pl.id);
          return {
            price_level_id: pl.id,
            price: existing?.price ?? '',
            valid_from: existing?.valid_from?.split('T')[0] || '',
            valid_to: existing?.valid_to?.split('T')[0] || '',
            active: existing?.active !== false,
          };
        }),
        quantity_discounts: v.quantity_discounts || [],
        manages_quantity_discounts: v.manages_quantity_discounts || false,
        weight: v.weight || null,
        volume: v.volume || null,
        length: v.length || null,
        width: v.width || null,
        height: v.height || null,
        variant_attributes: v.variant_attributes || {},
      }));
      setForm({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        family_id: product.family_id || null,
        brand_id: product.brand_id || null,
        product_type_id: product.product_type_id || null,
        images: product.images || [],
        active: product.active ?? true,
        variants: variants.length ? variants : [],
      });
    } else {
      setForm({
        name: '', slug: '', description: '',
        family_id: null, brand_id: null, product_type_id: null,
        images: [], active: true, variants: [],
      });
    }
    setErrors({});
    setApiError('');
    setStep(0);
    setSelectedVariantIndex(0);
  }, [open, product?.id]);

  // تحديث مستويات الأسعار عند تحميل priceLevels
  useEffect(() => {
    if (!priceLevels.length || form.variants.length === 0) return;
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        prices: priceLevels.map((pl: PriceLevel) => {
          const existing = v.prices.find(p => p.price_level_id === pl.id);
          return existing || { price_level_id: pl.id, price: '', valid_from: '', valid_to: '', active: true };
        }),
      })),
    }));
  }, [priceLevels.length]);

  // دوال المتغيرات
  const addVariant = () => {
    const newVariant: VariantForm = {
      ref: '', variant_name: '', barcode: '',
      purchase_price: '', price_ht: '',
      tva_rate: defaultTvaRate,
      tva_id: defaultTvaId,
      unit_id: null,
      min_stock: 0,
      active: true,
      prices: priceLevels.map((pl: PriceLevel) => ({ price_level_id: pl.id, price: '', valid_from: '', valid_to: '', active: true })),
      quantity_discounts: [],
      manages_quantity_discounts: false,
      weight: null, volume: null, length: null, width: null, height: null,
      variant_attributes: {},
    };
    setForm(f => ({ ...f, variants: [...f.variants, newVariant] }));
    setTimeout(() => setSelectedVariantIndex(form.variants.length), 0);
  };

  const removeVariant = (idx: number) => {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
    setSelectedVariantIndex(prev => Math.max(0, idx - 1 < prev ? prev - 1 : prev));
  };

  const updateVariant = (idx: number, key: keyof VariantForm, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[idx] = { ...variants[idx], [key]: value };
      return { ...f, variants };
    });
  };

  const updateVariantPrice = (vidx: number, plId: number, field: keyof VariantPrice, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      const prices = [...variants[vidx].prices];
      const priceIdx = prices.findIndex(p => p.price_level_id === plId);
      if (priceIdx !== -1) {
        prices[priceIdx] = { ...prices[priceIdx], [field]: value };
      }
      variants[vidx] = { ...variants[vidx], prices };
      return { ...f, variants };
    });
  };

  const addQuantityDiscount = (vidx: number) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = [...variants[vidx].quantity_discounts];
      discounts.push({
        min_quantity: 1,
        max_quantity: null,
        discount_percentage: null,
        discount_per_unit: null,
        tier_order: discounts.length + 1,
        active: true,
      });
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  const removeQuantityDiscount = (vidx: number, didx: number) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = variants[vidx].quantity_discounts.filter((_, i) => i !== didx);
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  const updateQuantityDiscount = (vidx: number, didx: number, field: keyof QuantityDiscount, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = [...variants[vidx].quantity_discounts];
      discounts[didx] = { ...discounts[didx], [field]: value };
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  // التحقق من الصحة
  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim()) newErrors.name = 'اسم المنتج مطلوب';
    }
    if (s === 1) {
      if (form.variants.length === 0) {
        newErrors.general = 'يجب إضافة متغير واحد على الأقل';
      }
      form.variants.forEach((v, i) => {
        if (!v.ref.trim()) newErrors[`v${i}_ref`] = 'المرجع مطلوب';
        if (v.price_ht === '' || Number(v.price_ht) <= 0) newErrors[`v${i}_price`] = 'سعر البيع مطلوب';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // حفظ البيانات
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
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
          last_purchase_price: v.purchase_price !== '' ? parseFloat(String(v.purchase_price)) : null,
          default_selling_price_ht: v.price_ht !== '' ? parseFloat(String(v.price_ht)) : 0,
          tva_id: v.tva_id,
          unit_id: v.unit_id,
          min_stock_alert: v.min_stock,
          active: v.active,
          weight: v.weight,
          volume: v.volume,
          length: v.length,
          width: v.width,
          height: v.height,
          variant_attributes: v.variant_attributes,
          manages_quantity_discounts: v.manages_quantity_discounts,
          prices: v.prices
            .filter(p => p.price !== '' && p.price !== null)
            .map(p => ({
              price_level_id: p.price_level_id,
              price: parseFloat(String(p.price)),
              valid_from: p.valid_from || null,
              valid_to: p.valid_to || null,
              active: p.active,
            })),
          quantity_discounts: v.manages_quantity_discounts
            ? v.quantity_discounts
                .filter(d => d.min_quantity > 0 && (d.discount_percentage || d.discount_per_unit))
                .map((d, idx) => ({
                  min_quantity: d.min_quantity,
                  max_quantity: d.max_quantity || null,
                  discount_percentage: d.discount_percentage || null,
                  discount_per_unit: d.discount_per_unit || null,
                  tier_order: idx + 1,
                  active: d.active,
                }))
            : [],
        })),
      };
      if (isEdit && product) {
        return apiClient.put(`/products/${product.id}`, payload);
      }
      return apiClient.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || Object.values(err?.response?.data?.errors ?? {}).flat().join(' | ')
        || 'فشل الحفظ';
      setApiError(msg);
      setStep(1);
    },
  });

  const handleSave = () => {
    setApiError('');
    if (validateStep(1)) saveMutation.mutate();
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => s + 1); };
  const prevStep = () => { if (step > 0) setStep(s => s - 1); };

  if (!open) return null;

  const isPending = saveMutation.isPending;
  const currentVariant = form.variants[selectedVariantIndex];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      subtitle={`${form.name || 'أدخل اسم المنتج'} • ${form.variants.length} متغير`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={step === 0 ? onClose : prevStep} disabled={isPending}>
            {step === 0 ? 'إلغاء' : <><i className="ti ti-arrow-right" /> رجوع</>}
          </Button>
          {step < steps.length - 1 ? (
            <Button variant="primary" onClick={nextStep}>
              التالي <i className="ti ti-arrow-left" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ الحفظ...</>
              ) : (
                <>{isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</>
              )}
            </Button>
          )}
        </div>
      }
    >
      {apiError && <AlertBar variant="red" style={{ marginBottom: 16 }}>{apiError}</AlertBar>}

      {/* Stepper */}
      <div style={{ padding: '0 0 20px 0', borderBottom: '1px solid var(--b1)', marginBottom: 20 }}>
        <Stepper step={step} steps={steps} />
      </div>

      {/* STEP 0: Basic Info */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fgrid c2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <div>
              <label className="req">اسم المنتج</label>
              <input style={inputStyle(!!errors.name)} value={form.name} placeholder="أدخل اسم المنتج..." onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.name}</span>}
            </div>
            <div>
              <label>الرابط الدائم (Slug)</label>
              <input style={inputStyle()} value={form.slug} placeholder="يُترك لتوليد تلقائي" onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
          </div>

          <div className="fgrid c3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label>الفئة</label>
              <select style={selectStyle} value={form.family_id ?? ''} onChange={e => setForm(f => ({ ...f, family_id: e.target.value ? parseInt(e.target.value) : null }))}>
                <option value="">— بدون فئة —</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label>العلامة التجارية</label>
              <select style={selectStyle} value={form.brand_id ?? ''} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value ? parseInt(e.target.value) : null }))}>
                <option value="">— بدون علامة —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label>نوع المنتج</label>
              <select style={selectStyle} value={form.product_type_id ?? ''} onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value ? parseInt(e.target.value) : null }))}>
                <option value="">— بدون نوع —</option>
                {productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label>الوصف</label>
            <textarea style={{ ...inputStyle(), resize: 'vertical' }} rows={4} placeholder="وصف المنتج..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Images Gallery */}
          <div>
            <label>معرض الصور</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              {form.images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 'var(--r2)', overflow: 'hidden', border: '1px solid var(--b2)' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <label style={{ width: 80, height: 80, borderRadius: 'var(--r2)', border: '2px dashed var(--b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                      const { data } = await apiClient.post('/attachments', fd);
                      setForm(f => ({ ...f, images: [...f.images, data.url || data.path] }));
                    } catch (err) { console.error(err); }
                  }
                }} />
                <i className="ti ti-plus" style={{ fontSize: 24, color: 'var(--t4)' }} />
              </label>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <Switch checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} label={form.active ? 'المنتج نشط ومتاح للبيع' : 'المنتج غير نشط'} />
          </div>
        </div>
      )}

      {/* STEP 1: Variants */}
      {step === 1 && (
        <div style={{ display: 'flex', gap: 16, minHeight: 450 }}>
          {/* Left panel */}
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>المتغيرات ({form.variants.length})</div>
            {form.variants.map((vr, i) => (
              <VariantCard key={i} variant={vr} index={i} active={selectedVariantIndex === i} errors={errors} onSelect={() => setSelectedVariantIndex(i)} onRemove={() => removeVariant(i)} />
            ))}
            <button onClick={addVariant} style={{ padding: '8px 12px', borderRadius: 'var(--r2)', border: '1.5px dashed var(--b3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <i className="ti ti-plus" /> إضافة متغير
            </button>
            {errors.general && <div style={{ color: 'var(--red)', fontSize: 11, padding: '8px', background: 'var(--redb)', borderRadius: 'var(--r2)' }}>{errors.general}</div>}
          </div>

          {/* Right panel */}
          {currentVariant ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--b1)' }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{currentVariant.variant_name || currentVariant.ref || `متغير ${selectedVariantIndex + 1}`}</div>
                <Switch checked={currentVariant.active} onChange={val => updateVariant(selectedVariantIndex, 'active', val)} label={currentVariant.active ? 'نشط' : 'غير نشط'} />
              </div>

              {/* Variant Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--b1)' }}>
                {[
                  ['basic', 'أساسي', 'ti-info-circle'],
                  ['prices', 'أسعار', 'ti-tag'],
                  ['discounts', 'خصومات', 'ti-discount'],
                  ['dimensions', 'أبعاد', 'ti-ruler'],
                ].map(([tab, label, icon]) => (
                  <button key={tab} onClick={() => setActiveVariantTab(tab as any)} style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', color: activeVariantTab === tab ? 'var(--em)' : 'var(--t4)', borderBottom: activeVariantTab === tab ? '2px solid var(--em)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 12 }} /> {label}
                  </button>
                ))}
              </div>

              {/* Tab: Basic */}
              {activeVariantTab === 'basic' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div><label className="req">المرجع</label><input style={inputStyle(!!errors[`v${selectedVariantIndex}_ref`])} value={currentVariant.ref} onChange={e => updateVariant(selectedVariantIndex, 'ref', e.target.value)} />{errors[`v${selectedVariantIndex}_ref`] && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors[`v${selectedVariantIndex}_ref`]}</span>}</div>
                  <div><label>اسم المتغير</label><input style={inputStyle()} value={currentVariant.variant_name} onChange={e => updateVariant(selectedVariantIndex, 'variant_name', e.target.value)} /></div>
                  <div><label>الباركود</label><input style={inputStyle()} value={currentVariant.barcode} onChange={e => updateVariant(selectedVariantIndex, 'barcode', e.target.value)} /></div>
                  <div><label>سعر الشراء</label><input type="number" step="0.01" style={inputStyle()} value={currentVariant.purchase_price} onChange={e => updateVariant(selectedVariantIndex, 'purchase_price', e.target.value)} /></div>
                  <div><label className="req">سعر البيع</label><input type="number" step="0.01" style={inputStyle(!!errors[`v${selectedVariantIndex}_price`])} value={currentVariant.price_ht} onChange={e => updateVariant(selectedVariantIndex, 'price_ht', e.target.value)} />{errors[`v${selectedVariantIndex}_price`] && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors[`v${selectedVariantIndex}_price`]}</span>}</div>
                  <div><label>الوحدة</label><select style={selectStyle} value={currentVariant.unit_id ?? ''} onChange={e => updateVariant(selectedVariantIndex, 'unit_id', e.target.value ? parseInt(e.target.value) : null)}><option value="">— اختر —</option>{units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                  <div><label>الضريبة</label><select style={selectStyle} value={currentVariant.tva_id ?? ''} onChange={e => { const id = e.target.value ? parseInt(e.target.value) : null; const rate = tvaRates.find(t => t.id === id)?.rate || defaultTvaRate; updateVariant(selectedVariantIndex, 'tva_id', id); updateVariant(selectedVariantIndex, 'tva_rate', rate); }}><option value="">— اختر —</option>{tvaRates.map((t: TvaRate) => <option key={t.id} value={t.id}>{t.rate}%</option>)}</select></div>
                  <div><label>الحد الأدنى للمخزون</label><input type="number" min="0" style={inputStyle()} value={currentVariant.min_stock} onChange={e => updateVariant(selectedVariantIndex, 'min_stock', parseInt(e.target.value) || 0)} /></div>
                  <div><label>السمات (JSON)</label><textarea style={{ ...inputStyle(), fontFamily: 'monospace', fontSize: 11 }} rows={2} placeholder='{"اللون": "أحمر"}' value={JSON.stringify(currentVariant.variant_attributes || {}, null, 2)} onChange={e => { try { updateVariant(selectedVariantIndex, 'variant_attributes', JSON.parse(e.target.value)); } catch { } }} /></div>
                </div>
              )}

              {/* Tab: Prices */}
              {activeVariantTab === 'prices' && priceLevels.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {priceLevels.map((pl: PriceLevel) => {
                    const price = currentVariant.prices.find(p => p.price_level_id === pl.id);
                    return (
                      <div key={pl.id} style={{ padding: '10px', background: 'var(--bg3)', borderRadius: 'var(--r2)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{pl.name}</div>
                        <input type="number" step="0.01" style={inputStyle()} placeholder="السعر" value={price?.price ?? ''} onChange={e => updateVariantPrice(selectedVariantIndex, pl.id, 'price', e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <input type="date" style={{ ...inputStyle(), fontSize: 11, padding: '6px 8px', flex: 1 }} value={price?.valid_from?.split('T')[0] || ''} onChange={e => updateVariantPrice(selectedVariantIndex, pl.id, 'valid_from', e.target.value)} />
                          <input type="date" style={{ ...inputStyle(), fontSize: 11, padding: '6px 8px', flex: 1 }} value={price?.valid_to?.split('T')[0] || ''} onChange={e => updateVariantPrice(selectedVariantIndex, pl.id, 'valid_to', e.target.value)} />
                        </div>
                        <label style={{ fontSize: 11, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={price?.active !== false} onChange={e => updateVariantPrice(selectedVariantIndex, pl.id, 'active', e.target.checked)} /> مفعل</label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: Discounts */}
              {activeVariantTab === 'discounts' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>تخفيضات الكميات</span>
                    <Switch checked={currentVariant.manages_quantity_discounts} onChange={val => updateVariant(selectedVariantIndex, 'manages_quantity_discounts', val)} label="تفعيل" />
                  </div>
                  {currentVariant.manages_quantity_discounts && (
                    <>
                      <button onClick={() => addQuantityDiscount(selectedVariantIndex)} style={{ padding: '6px 12px', borderRadius: 'var(--r1)', fontSize: 11, border: '1px solid var(--b3)', background: 'transparent', marginBottom: 12, cursor: 'pointer' }}><i className="ti ti-plus" /> إضافة شريحة</button>
                      {currentVariant.quantity_discounts.map((d, didx) => (
                        <div key={didx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 8 }}>
                          <input type="number" min="1" placeholder="من" style={{ ...inputStyle(), width: 80 }} value={d.min_quantity} onChange={e => updateQuantityDiscount(selectedVariantIndex, didx, 'min_quantity', parseInt(e.target.value) || 0)} />
                          <span>—</span>
                          <input type="number" placeholder="إلى" style={{ ...inputStyle(), width: 80 }} value={d.max_quantity ?? ''} onChange={e => updateQuantityDiscount(selectedVariantIndex, didx, 'max_quantity', e.target.value ? parseInt(e.target.value) : null)} />
                          <input type="number" step="0.1" placeholder="نسبة %" style={{ ...inputStyle(), width: 100 }} value={d.discount_percentage ?? ''} onChange={e => updateQuantityDiscount(selectedVariantIndex, didx, 'discount_percentage', e.target.value ? parseFloat(e.target.value) : null)} />
                          <input type="number" step="0.01" placeholder="خصم ثابت" style={{ ...inputStyle(), width: 100 }} value={d.discount_per_unit ?? ''} onChange={e => updateQuantityDiscount(selectedVariantIndex, didx, 'discount_per_unit', e.target.value ? parseFloat(e.target.value) : null)} />
                          <input type="checkbox" checked={d.active} onChange={e => updateQuantityDiscount(selectedVariantIndex, didx, 'active', e.target.checked)} />
                          <button onClick={() => removeQuantityDiscount(selectedVariantIndex, didx)} style={{ color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer' }}><i className="ti ti-trash" /></button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Tab: Dimensions */}
              {activeVariantTab === 'dimensions' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div><label>الوزن (كغ)</label><input type="number" step="0.001" style={inputStyle()} value={currentVariant.weight ?? ''} onChange={e => updateVariant(selectedVariantIndex, 'weight', e.target.value ? parseFloat(e.target.value) : null)} /></div>
                  <div><label>الحجم (م³)</label><input type="number" step="0.001" style={inputStyle()} value={currentVariant.volume ?? ''} onChange={e => updateVariant(selectedVariantIndex, 'volume', e.target.value ? parseFloat(e.target.value) : null)} /></div>
                  <div><label>الطول (سم)</label><input type="number" step="0.1" style={inputStyle()} value={currentVariant.length ?? ''} onChange={e => updateVariant(selectedVariantIndex, 'length', e.target.value ? parseFloat(e.target.value) : null)} /></div>
                  <div><label>العرض (سم)</label><input type="number" step="0.1" style={inputStyle()} value={currentVariant.width ?? ''} onChange={e => updateVariant(selectedVariantIndex, 'width', e.target.value ? parseFloat(e.target.value) : null)} /></div>
                  <div><label>الارتفاع (سم)</label><input type="number" step="0.1" style={inputStyle()} value={currentVariant.height ?? ''} onChange={e => updateVariant(selectedVariantIndex, 'height', e.target.value ? parseFloat(e.target.value) : null)} /></div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', gap: 10 }}>
              <i className="ti ti-arrow-right" style={{ fontSize: 28 }} />
              <div>اختر متغيراً من القائمة أو أضف جديداً</div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Pricing Summary */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', background: 'var(--bg3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 800 }}>{form.name}</span><Badge variant={form.active ? 'success' : 'danger'}>{form.active ? 'نشط' : 'غير نشط'}</Badge></div>
            <div style={{ fontSize: 12, marginTop: 8 }}><i className="ti ti-folder" /> {families.find(f => f.id === form.family_id)?.name || 'بدون فئة'}</div>
            {form.description && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)' }}>{form.description}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.variants.map((vr, i) => {
              const priceLevelCount = vr.prices.filter(p => p.price !== '' && p.price !== null).length;
              return (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontWeight: 700 }}>{vr.variant_name || vr.ref}</div><div style={{ fontSize: 10, color: 'var(--t4)' }}>{vr.ref}</div></div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}><div style={{ fontSize: 9 }}>سعر البيع</div><div style={{ fontWeight: 700, color: 'var(--em)' }}>{formatDZD(Number(vr.price_ht) || 0)}</div></div>
                    {priceLevelCount > 0 && <div><div style={{ fontSize: 9 }}>مستويات الأسعار</div><div>{priceLevelCount}</div></div>}
                    <Badge variant={vr.active ? 'success' : 'danger'}>{vr.active ? 'نشط' : 'غير نشط'}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', background: 'var(--bg3)', textAlign: 'center' }}>
          <i className="ti ti-check" style={{ fontSize: 40, color: 'var(--em)' }} />
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>جاهز للحفظ</div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginTop: 4 }}>تم إدخال {form.variants.length} متغير و {form.images.length} صورة</div>
        </div>
      )}
    </Modal>
  );
}
