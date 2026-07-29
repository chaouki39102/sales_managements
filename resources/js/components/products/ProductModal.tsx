/**
 * ProductModal.tsx — نسخة Enterprise v2.0
 *
 * التحسينات الكاملة:
 *  - استخدام hooks من lookups.ts (useProductLookups + useValuationMethods)
 *  - 8 تابات: الأساسيات | الأسعار | التعبئة | المخزون | الخصومات | الأبعاد | SEO | الصور
 *  - حساب الهامش لحظياً لكل مستوى سعر
 *  - auto-slug من الاسم
 *  - meta_title / meta_description / meta_keywords
 *  - إدارة الصور (gallery) مع upload
 *  - نسخ الباركود بضغطة
 *  - مؤشر اكتمال النموذج (Completeness %)
 *  - Keyboard shortcuts: Esc = إغلاق، Ctrl+S = حفظ، Ctrl+Tab = تاب تالي
 *  - RTL-native بالكامل
 *  - Race condition fix لـ priceLevels
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut } from '@/lib/api/core/client';
import { productsApi } from '@/lib/api/endpoints/products';
import {
  useProductAggregatedLookups,
} from '@/lib/api/endpoints/lookups';
import { tenantKeys }  from '@/lib/api/core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import QuickAddLookupButton from '@/components/ui/QuickAddLookupButton';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import CopyConfigModal from '@/components/products/CopyConfigModal';
import { useProductBarcodes, useBarcodeMutations } from '@/lib/api/endpoints/barcodes';
import type { BarcodeUpdateInput } from '@/lib/api/endpoints/barcodes';
import type { Product, Family, Brand, ProductType, PriceLevel, Barcode } from '@/lib/api/core/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Unit            { id: number; name: string; symbol: string; }
interface TvaRate         { id: number; rate: number; is_default?: boolean; }
interface ValuationMethod { id: number; name: string; method?: string; }

interface ProductPrice {
  price_level_id:  number;
  pricing_method:  'fixed' | 'rate' | 'margin';
  price:           number | null | '';
  rate:            number | null | '';
  margin:          number | null | '';
  active:          boolean;
}

interface ProductPackaging {
  id?:           number;
  code:          string;
  label:         string;
  quantity:      number | '';
  barcode:       string;
  is_default:    boolean;
  active:        boolean;
  display_order: number;
}

interface QuantityDiscount {
  id?:                  number;
  price_level_id:       number;
  min_qty:              number | '';
  max_qty:              number | null | '';
  discount_amount:      number | null | '';
  discount_percentage:  number | null | '';
  tier_order:           number;
  is_blocked:           boolean;
  active:               boolean;
}

interface ProductForm {
  // ── الأساسيات ──
  name:               string;
  slug:               string;
  ref:                string;
  barcode:            string;
  description:        string;
  family_id:          number | null;
  brand_id:           number | null;
  product_type_id:    number | null;
  tva_id:             number | null;
  unit_id:            number | null;
  // ── الأسعار ──
  purchase_price_ht:      number | '';
  current_cost_price:     number | '';
  min_margin_percentage:  number | null | '';
  prices:             ProductPrice[];
  // ── التعبئة ──
  packagings:         ProductPackaging[];
  // ── المخزون ──
  manages_stock:          boolean;
  allow_negative_stock:   boolean;
  has_lots:               boolean;
  has_expiration_date:    boolean;
  min_stock_alert:        number | '';
  max_stock_alert:        number | '';
  manages_quantity_discounts: boolean;
  valuation_method_id:    number | null;
  // ── الخصومات ──
  quantity_discounts:     QuantityDiscount[];
  // ── الأبعاد ──
  weight:   number | null | '';
  volume:   number | null | '';
  length:   number | null | '';
  width:    number | null | '';
  height:   number | null | '';
  specifications: Record<string, string>;
  // ── SEO ──
  meta_title:       string;
  meta_description: string;
  meta_keywords:    string[];
  // ── الصور ──
  images:  string[];
  // ── الوزن ──
  is_sold_by_weight:       boolean;
  // ── الدعم (المواد المدعمة) ──
  is_subsidized:           boolean;
  regulated_product_config_id: number | null;
  // ── عام ──
  active:  boolean;
}

interface ProductModalProps {
  open:       boolean;
  product?:   Product | null;
  onClose:    () => void;
  onSaved:    (product: Product) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'basic',      label: 'الأساسيات', icon: 'ti-info-circle' },
  { id: 'barcodes',   label: 'الباركودات', icon: 'ti-barcode' },
  { id: 'pricing',    label: 'الأسعار',   icon: 'ti-tag' },
  { id: 'packagings', label: 'التعبئة',   icon: 'ti-package' },
  { id: 'stock',      label: 'المخزون',   icon: 'ti-building-warehouse' },
  { id: 'discounts',  label: 'الخصومات',  icon: 'ti-discount' },
  { id: 'dimensions', label: 'الأبعاد',   icon: 'ti-ruler' },
  { id: 'images',     label: 'الصور',     icon: 'ti-photo' },
  { id: 'seo',        label: 'SEO',       icon: 'ti-world' },
] as const;

type TabId = typeof TABS[number]['id'];
const TAB_IDS: TabId[] = TABS.map(t => t.id);

const PRICING_METHODS = [
  { value: 'fixed',  label: 'سعر ثابت',        icon: 'ti-cash',        hint: 'Prix de vente HT مباشرة بالدج' },
  { value: 'rate',   label: 'نسبة فوق الشراء', icon: 'ti-percentage',  hint: 'نسبة % تُضاف على سعر الشراء' },
  { value: 'margin', label: 'هامش ثابت',        icon: 'ti-trending-up', hint: 'مبلغ ثابت بالدج يُضاف للشراء' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const fmtDZD = (n: number | '' | null | undefined) =>
  n !== '' && n !== null && n !== undefined
    ? new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + ' دج'
    : '—';

const fmtPct = (n: number) => n.toFixed(2) + '%';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function computeSellingPrice(pr: ProductPrice, purchasePrice: number): number {
  if (!purchasePrice) return 0;
  if (pr.pricing_method === 'fixed'  && pr.price  !== '' && pr.price  !== null) return Number(pr.price);
  if (pr.pricing_method === 'rate'   && pr.rate   !== '' && pr.rate   !== null) return purchasePrice * (1 + Number(pr.rate) / 100);
  if (pr.pricing_method === 'margin' && pr.margin !== '' && pr.margin !== null) return purchasePrice + Number(pr.margin);
  return 0;
}

function computeMarginPct(sellingPrice: number, purchasePrice: number): number {
  if (!purchasePrice || !sellingPrice) return 0;
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
}

function emptyForm(priceLevels: PriceLevel[] = [], defaultTvaId: number | null = null): ProductForm {
  return {
    name: '', slug: '', ref: '', barcode: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    tva_id: defaultTvaId, unit_id: null,
    purchase_price_ht: '', current_cost_price: '', min_margin_percentage: null,
    manages_stock: true, allow_negative_stock: false,
    has_lots: false, has_expiration_date: false,
    min_stock_alert: '', max_stock_alert: '',
    manages_quantity_discounts: false, valuation_method_id: null,
    weight: '', volume: '', length: '', width: '', height: '',
    specifications: {}, images: [],
    meta_title: '', meta_description: '', meta_keywords: [],
    is_sold_by_weight: false, is_subsidized: false, regulated_product_config_id: null,
    active: true,
    prices: priceLevels.map(pl => ({
      price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true,
    })),
    packagings: [], quantity_discounts: [],
  };
}

function productToForm(p: any, priceLevels: PriceLevel[]): ProductForm {
  return {
    name: p.name ?? '', slug: p.slug ?? '', ref: p.ref ?? '',
    barcode: p.barcode ?? '', description: p.description ?? '',
    family_id: p.family_id ?? null, brand_id: p.brand_id ?? null,
    product_type_id: p.product_type_id ?? null,
    tva_id: p.tva_id ?? null, unit_id: p.unit_id ?? null,
    purchase_price_ht: p.purchase_price_ht ?? '', current_cost_price: p.current_cost_price ?? '',
    min_margin_percentage: p.min_margin_percentage ?? null,
    manages_stock: p.manages_stock ?? true, allow_negative_stock: p.allow_negative_stock ?? false,
    has_lots: p.has_lots ?? false, has_expiration_date: p.has_expiration_date ?? false,
    min_stock_alert: p.min_stock_alert ?? '', max_stock_alert: p.max_stock_alert ?? '',
    manages_quantity_discounts: p.manages_quantity_discounts ?? false,
    valuation_method_id: p.valuation_method_id ?? null,
    weight: p.weight ?? '', volume: p.volume ?? '',
    length: p.length ?? '', width: p.width ?? '', height: p.height ?? '',
    specifications: p.specifications ?? {},
    images: p.images ?? [],
    meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '',
    meta_keywords: Array.isArray(p.meta_keywords) ? p.meta_keywords : (p.meta_keywords ? String(p.meta_keywords).split(',').map((k: string) => k.trim()).filter(Boolean) : []),
    is_sold_by_weight: p.is_sold_by_weight ?? false, is_subsidized: p.is_subsidized ?? false,
    regulated_product_config_id: p.regulated_product_config_id ?? null,
    active: p.active ?? true,
    prices: priceLevels.map(pl => {
      const ex = (p.prices ?? []).find((x: any) => x.price_level_id === pl.id);
      return {
        price_level_id: pl.id,
        pricing_method: ex?.pricing_method ?? 'fixed',
        price: ex?.price ?? '', rate: ex?.rate ?? '', margin: ex?.margin ?? '',
        active: ex?.active !== false,
      };
    }),
    packagings: (p.packagings ?? []).map((pkg: any) => ({
      id: pkg.id, code: pkg.code ?? '', label: pkg.label ?? '',
      quantity: pkg.quantity ?? 1, barcode: pkg.barcode ?? '',
      is_default: pkg.is_default ?? false, active: pkg.active ?? true,
      display_order: pkg.display_order ?? 0,
    })),
    quantity_discounts: (p.quantity_discounts ?? []).map((d: any) => ({
      id: d.id, price_level_id: d.price_level_id, min_qty: d.min_qty ?? '',
      max_qty: d.max_qty ?? null, discount_amount: d.discount_amount ?? null,
      discount_percentage: d.discount_percentage ?? null, tier_order: d.tier_order ?? 0,
      is_blocked: d.is_blocked ?? false, active: d.active ?? true,
    })),
  };
}

function buildPayload(form: ProductForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    ref: form.ref.trim() || null,
    barcode: form.barcode.trim() || null,
    description: form.description.trim() || null,
    family_id: form.family_id, brand_id: form.brand_id,
    product_type_id: form.product_type_id,
    tva_id: form.tva_id, unit_id: form.unit_id,
    purchase_price_ht: form.purchase_price_ht !== '' ? Number(form.purchase_price_ht) : 0,
    min_margin_percentage: form.min_margin_percentage !== '' && form.min_margin_percentage !== null ? Number(form.min_margin_percentage) : null,
    manages_stock: form.manages_stock, allow_negative_stock: form.allow_negative_stock,
    has_lots: form.has_lots, has_expiration_date: form.has_expiration_date,
    min_stock_alert: form.min_stock_alert !== '' ? Number(form.min_stock_alert) : 0,
    max_stock_alert: form.max_stock_alert !== '' ? Number(form.max_stock_alert) : 0,
    manages_quantity_discounts: form.manages_quantity_discounts,
    valuation_method_id: form.valuation_method_id,
    weight: form.weight !== '' ? form.weight : null,
    volume: form.volume !== '' ? form.volume : null,
    length: form.length !== '' ? form.length : null,
    width: form.width !== '' ? form.width : null,
    height: form.height !== '' ? form.height : null,
    specifications: Object.keys(form.specifications).length ? form.specifications : null,
    images: form.images,
    meta_title: form.meta_title.trim() || null,
    meta_description: form.meta_description.trim() || null,
    meta_keywords: form.meta_keywords.length ? form.meta_keywords : null,
    is_sold_by_weight: form.is_sold_by_weight,
    is_subsidized: form.is_subsidized,
    regulated_product_config_id: form.regulated_product_config_id || null,
    active: form.active,
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
  field:   { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label:   { fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const },
  inp: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
    outline: 'none', fontFamily: 'Tajawal, inherit',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box' as const, width: '100%',
  }),
  sel: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
    outline: 'none', fontFamily: 'Tajawal, inherit',
    boxSizing: 'border-box' as const, width: '100%', cursor: 'pointer',
  }),
  row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  row4:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 },
  section: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  divider: { height: 1, background: 'var(--b2)', margin: '4px 0' },
  hint:    { fontSize: 11, color: 'var(--t4)', marginTop: 2, lineHeight: 1.5 },
  errText: { fontSize: 11, color: 'var(--red)', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 },
  card: { padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' },
};

function Field({
  label, error, children, hint, col, required,
}: {
  label: string; error?: string; children: React.ReactNode;
  hint?: string; col?: number; required?: boolean;
}) {
  return (
    <div style={{ ...s.field, gridColumn: col ? `span ${col}` : undefined }}>
      <label style={s.label}>
        {label}{required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
      {hint  && <span style={s.hint}>{hint}</span>}
      {error && <span style={s.errText}>{error}</span>}
    </div>
  );
}

function Toggle({
  checked, onChange, label, disabled,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? 'var(--em)' : 'var(--b3)', transition: 'background .2s',
          flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>}
    </label>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--b2)', marginBottom: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--em)' }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const isEdit    = !!product;
  const slug      = useActiveSlug();
  const qc        = useQueryClient();
  const bodyRef   = useRef<HTMLDivElement>(null);
  const nameRef   = useRef<HTMLInputElement>(null);
  const initDone  = useRef(false);
  const slugEdited = useRef(false); // لمنع auto-slug بعد التعديل اليدوي
  const { confirm, confirmDialogProps } = useConfirm();
  const notify = useNotification();

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form,      setForm]      = useState<ProductForm>(() => emptyForm());
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState('');
  const [isDirty,   setIsDirty]   = useState(false);
  const [specKey,   setSpecKey]   = useState('');
  const [specVal,   setSpecVal]   = useState('');
  const [kwInput,   setKwInput]   = useState('');
  const [copied,    setCopied]    = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [imgUploadPct, setImgUploadPct] = useState(0);
  const imgFileRef = useRef<HTMLInputElement>(null);

  // ── Barcodes ──
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showAddBarcode, setShowAddBarcode] = useState(false);

  // ── اقتراح صورة من الإنترنت ──
  const [showImgSuggest, setShowImgSuggest] = useState(false);
  const [imgQuery,       setImgQuery]       = useState('');
  const [imgResults,     setImgResults]     = useState<{ id: string; thumb: string; full: string; exact?: boolean; label?: string; source?: string | null }[]>([]);
  const [imgLoading,     setImgLoading]     = useState(false);
  const [imgError,       setImgError]       = useState('');
  const imgSearchSeq = useRef(0); // لمنع race condition بين طلبات بحث متتالية

  // ── Lookups — single aggregated request (7 HTTP → 1) ──
  const { data: productLookups, isLoading: lookupsLoading } = useProductAggregatedLookups();
  const families          = productLookups?.families ?? [];
  const brands            = productLookups?.brands ?? [];
  const units             = productLookups?.units ?? [];
  const tvas              = productLookups?.tvas ?? [];
  const priceLevels       = productLookups?.priceLevels ?? [];
  const productTypes      = productLookups?.productTypes ?? [];
  const valuationMethods  = productLookups?.valuationMethods ?? [];
  const regulatedProducts = productLookups?.regulatedProducts ?? [];

  // ── Barcodes for current product (edit mode only) ──
  const productId = isEdit && product ? product.id : null;
  const { data: productBarcodes = [] } = useProductBarcodes(productId);
  const barcodeMutations = useBarcodeMutations(productId);

  const defaultTvaId = useMemo(
    () => (tvas as TvaRate[]).find(t => t.rate === 0)?.id ?? (tvas as TvaRate[]).find(t => t.is_default)?.id ?? null,
    [tvas],
  );

  // ── set helper ──
  const set = useCallback(<K extends keyof ProductForm>(key: K, val: ProductForm[K]) => {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
    // auto-slug من الاسم فقط إذا لم يتم التعديل اليدوي
    if (key === 'name' && !isEdit && !slugEdited.current) {
      setForm(f => ({ ...f, name: val as string, slug: slugify(val as string) }));
    }
  }, [isEdit]);

  // ── بحث الصور ──
  // كل المصادر (Google CSE مقيّد بمواقع جزائرية، متاجر جزائرية عبر WooCommerce
  // Store API، Open Food Facts بالباركود والاسم، Pexels احتياطياً) تُستعلَم من
  // الباك-إند في طلب واحد. سابقاً كنا نستدعي world.openfoodfacts.org مباشرة من
  // المتصفح، وهذا كان يفشل بخطأ CORS لأن ذلك المسار لا يرسل رؤوس
  // Access-Control-Allow-Origin؛ طلبات الخادم لا تخضع لسياسة CORS، لذا هذا
  // الحل هو الصحيح والنهائي.
  const searchProductImages = useCallback(async (queryRaw: string) => {
    const query = queryRaw.trim();
    if (!query || query.length < 2) return;
    const seq = ++imgSearchSeq.current;
    setImgLoading(true);
    setImgError('');
    try {
      const barcode = form.barcode?.trim() || undefined;
      const results = await productsApi.searchImages(query, 1, barcode);
      if (seq !== imgSearchSeq.current) return; // نتيجة بحث قديمة — تجاهل

      const mapped = (results ?? [])
        .filter(r => !!r?.thumb && !!r?.full)
        .map(r => ({
          id:     r.id,
          thumb:  r.thumb as string,
          full:   r.full as string,
          exact:  r.exact,
          label:  r.label ?? undefined,
          source: r.source ?? undefined,
        }));

      setImgResults(mapped);
      if (mapped.length === 0) setImgError('لا توجد نتائج لهذا البحث');
    } catch (e: any) {
      if (seq !== imgSearchSeq.current) return;
      setImgError(e?.message || 'تعذّر البحث عن الصور، تحقق من اتصالك بالإنترنت');
      setImgResults([]);
    } finally {
      if (seq === imgSearchSeq.current) setImgLoading(false);
    }
  }, [form.barcode]);

  function addSuggestedImage(url: string) {
    if (form.images.includes(url)) return;
    set('images', [...form.images, url]);
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !productId) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      notify.error('الملف كبير جداً', 'الحد الأقصى 5 ميغابايت');
      if (imgFileRef.current) imgFileRef.current.value = '';
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      notify.error('صيغة غير مدعومة', 'JPG, PNG, GIF, WebP فقط');
      if (imgFileRef.current) imgFileRef.current.value = '';
      return;
    }
    setImgUploadPct(0);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const updated = await productsApi.uploadImage(productId, fd, p => setImgUploadPct(p));
      if (updated?.images) set('images', updated.images);
    } catch (e) {
      notify.error('فشل رفع الصورة', e instanceof Error ? e.message : undefined);
    }
    setImgUploadPct(0);
    if (imgFileRef.current) imgFileRef.current.value = '';
  }

  function toggleImgSuggest() {
    setShowImgSuggest(v => {
      const next = !v;
      if (next && imgResults.length === 0 && !imgLoading) {
        const q = imgQuery.trim() || form.name.trim();
        if (q) { setImgQuery(q); searchProductImages(q); }
      }
      return next;
    });
  }

  // ── Reset عند الفتح ──
  useEffect(() => {
    if (!open) { initDone.current = false; slugEdited.current = false; return; }
    setErrors({}); setApiError(''); setActiveTab('basic');
    setIsDirty(false); setSpecKey(''); setSpecVal(''); setKwInput('');
    setImageInput(''); setCopied(false);
    setBarcodeInput('');
    setShowImgSuggest(false); setImgQuery(''); setImgResults([]); setImgError(''); setImgLoading(false);

    if ((priceLevels as PriceLevel[]).length > 0) {
      initDone.current = true;
      setForm(
        isEdit && product
          ? productToForm(product, priceLevels as PriceLevel[])
          : emptyForm(priceLevels as PriceLevel[], defaultTvaId),
      );
    } else {
      setForm(emptyForm([], defaultTvaId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Init priceLevels عند تحميلها لأول مرة بعد فتح المودل ──
  useEffect(() => {
    if (!open || initDone.current || (priceLevels as PriceLevel[]).length === 0) return;
    initDone.current = true;
    setForm(
      isEdit && product
        ? productToForm(product, priceLevels as PriceLevel[])
        : emptyForm(priceLevels as PriceLevel[], defaultTvaId),
    );
  }, [priceLevels, open, isEdit, product, defaultTvaId]);

  // ── Focus اسم المنتج عند الفتح ──
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => nameRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ── منع scroll في الصفحة الخلفية عند فتح المودل ──
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // ── Switch Tab مع Scroll للأعلى ──
  function switchTab(id: TabId) {
    setActiveTab(id);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { handleClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); handleSubmit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const idx = TAB_IDS.indexOf(activeTab);
        const next = e.shiftKey ? idx - 1 : idx + 1;
        if (next >= 0 && next < TAB_IDS.length) switchTab(TAB_IDS[next]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, form, isDirty]);

  // ── Price helpers ──
  function updatePrice(levelId: number, key: keyof ProductPrice, val: any) {
    setForm(f => ({
      ...f,
      prices: f.prices.map(p => p.price_level_id === levelId ? { ...p, [key]: val } : p),
    }));
    setIsDirty(true);
  }

  // ── Packaging helpers ──
  function addPackaging() {
    const order = form.packagings.length;
    setForm(f => ({
      ...f,
      packagings: [...f.packagings, {
        code: '', label: '', quantity: 1, barcode: '',
        is_default: order === 0, active: true, display_order: order,
      }],
    }));
    setIsDirty(true);
  }
  function updatePackaging(idx: number, key: keyof ProductPackaging, val: any) {
    setForm(f => {
      const next = f.packagings.map((p, i) => {
        if (i !== idx) return key === 'is_default' ? { ...p, is_default: false } : p;
        return { ...p, [key]: val };
      });
      return { ...f, packagings: next };
    });
    setIsDirty(true);
  }
  function removePackaging(idx: number) {
    setForm(f => ({ ...f, packagings: f.packagings.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }
  function movePackaging(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= form.packagings.length) return;
    setForm(f => {
      const next = [...f.packagings];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { ...f, packagings: next.map((p, i) => ({ ...p, display_order: i })) };
    });
    setIsDirty(true);
  }

  // ── Barcode helpers ──
  function addBarcode() {
    if (!barcodeInput.trim() || !productId) return;
    barcodeMutations.create.mutate({
      product_id: productId,
      barcode: barcodeInput.trim(),
      is_primary: (productBarcodes as Barcode[]).length === 0,
    });
    setBarcodeInput('');
    setShowAddBarcode(false);
  }

  function updateBarcodeItem(id: number, data: BarcodeUpdateInput) {
    barcodeMutations.update.mutate({ id, data });
  }

  function removeBarcodeItem(id: number) {
    barcodeMutations.remove.mutate(id);
  }

  function makePrimaryBarcode(id: number) {
    barcodeMutations.update.mutate({ id, data: { is_primary: true } });
  }

  function copyBarcodeText(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleCopyConfig(result: { copy_packaging: boolean; copy_discounts: boolean; replace_packaging: boolean; replace_discounts: boolean; packagings: any[]; quantity_discounts: any[] }) {
    setForm(f => {
      const next = { ...f };
      if (result.copy_packaging && result.packagings.length > 0) {
        const base = result.replace_packaging ? [] : f.packagings;
        const startOrder = base.length;
        next.packagings = [
          ...base,
          ...result.packagings.map((pkg: any, i: number) => ({
            code: pkg.code ?? '',
            label: pkg.label ?? '',
            quantity: pkg.quantity ?? 1,
            barcode: pkg.barcode ?? '',
            is_default: pkg.is_default ?? false,
            active: pkg.active ?? true,
            display_order: startOrder + i,
          })),
        ];
      }
      if (result.copy_discounts && result.quantity_discounts.length > 0) {
        const base = result.replace_discounts ? [] : f.quantity_discounts;
        next.quantity_discounts = [
          ...base,
          ...result.quantity_discounts.map((d: any) => ({
            price_level_id:      d.price_level_id,
            min_qty:             d.min_qty,
            max_qty:             d.max_qty ?? null,
            discount_amount:     d.discount_amount ?? null,
            discount_percentage: d.discount_percentage ?? null,
            tier_order:          d.tier_order ?? 0,
            is_blocked:          d.is_blocked ?? false,
            active:              d.active ?? true,
          })),
        ];
        next.manages_quantity_discounts = true;
      }
      return next;
    });
    setIsDirty(true);
  }

  // ── Discount helpers ──
  function addDiscount(levelId: number) {
    setForm(f => ({
      ...f,
      quantity_discounts: [...f.quantity_discounts, {
        price_level_id: levelId, min_qty: '', max_qty: null,
        discount_amount: null, discount_percentage: null,
        tier_order: f.quantity_discounts.filter(d => d.price_level_id === levelId).length,
        is_blocked: false, active: true,
      }],
    }));
    setIsDirty(true);
  }
  function updateDiscount(idx: number, key: keyof QuantityDiscount, val: any) {
    setForm(f => ({
      ...f,
      quantity_discounts: f.quantity_discounts.map((d, i) => i === idx ? { ...d, [key]: val } : d),
    }));
    setIsDirty(true);
  }
  function removeDiscount(idx: number) {
    setForm(f => ({ ...f, quantity_discounts: f.quantity_discounts.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? apiPut<any>(`/products/${product.id}`, payload)
        : apiPost<any>('/products', payload),
    onSuccess: (saved) => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
      onSaved(saved);
      onClose();
    },
    onError: (err: any) => {
      setApiError(err?.message ?? 'حدث خطأ أثناء الحفظ');
      if (err?.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(err.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]]),
          ),
        );
      }
    },
  });

  // ── Validation ──
  function validateField(key: string) {
    if (key === 'name') {
      if (!form.name.trim()) setErrors(e => ({ ...e, name: 'اسم المنتج مطلوب' }));
      else setErrors(e => { const x = { ...e }; delete x.name; return x; });
    }
    if (key === 'purchase_price_ht') {
      if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0)
        setErrors(e => ({ ...e, purchase_price_ht: 'سعر الشراء مطلوب (0 أو أكثر)' }));
      else setErrors(e => { const x = { ...e }; delete x.purchase_price_ht; return x; });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0)
      errs.purchase_price_ht = 'سعر الشراء مطلوب (0 أو أكثر)';
    setErrors(errs);
    if (Object.keys(errs).length) { setActiveTab('basic'); return false; }
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    setApiError('');
    mutation.mutate(buildPayload(form));
  }

  async function handleClose() {
    if (isDirty && !mutation.isPending) {
      if (!await confirm('لديك تعديلات غير محفوظة. هل تريد الخروج؟')) return;
    }
    onClose();
  }

  // ── Copy barcode ──
  function copyBarcode() {
    if (!form.barcode) return;
    navigator.clipboard.writeText(form.barcode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Completeness % ──
  const completeness = useMemo(() => {
    let score = 0; const total = 10;
    if (form.name.trim()) score++;
    if (form.purchase_price_ht !== '' && Number(form.purchase_price_ht) >= 0) score++;
    if (form.tva_id) score++;
    if (form.unit_id) score++;
    if (form.family_id) score++;
    if (form.brand_id) score++;
    if (form.ref.trim()) score++;
    if (form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '')) score++;
    if (form.description.trim()) score++;
    if (form.images.length > 0) score++;
    return Math.round((score / total) * 100);
  }, [form]);

  // ── Tab indicators ──
  function tabDot(tabId: TabId): 'done' | 'warn' | 'empty' {
    if (tabId === 'basic')    return (!form.name.trim() || form.purchase_price_ht === '') ? 'warn' : 'done';
    if (tabId === 'pricing')  return form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '') ? 'done' : 'empty';
    if (tabId === 'packagings') return form.packagings.length > 0 ? 'done' : 'empty';
    if (tabId === 'discounts')  return form.manages_quantity_discounts && form.quantity_discounts.length > 0 ? 'done' : 'empty';
    if (tabId === 'images')   return form.images.length > 0 ? 'done' : 'empty';
    if (tabId === 'seo')      return (form.meta_title || form.meta_description) ? 'done' : 'empty';
    return 'empty';
  }
  function tabBadge(tabId: TabId): number | null {
    if (tabId === 'pricing')    return form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length || null;
    if (tabId === 'packagings') return form.packagings.length || null;
    if (tabId === 'discounts')  return form.quantity_discounts.filter(d => d.active).length || null;
    if (tabId === 'images')     return form.images.length || null;
    if (tabId === 'barcodes')   return (productBarcodes as Barcode[]).length || null;
    return null;
  }
  const dotColor = (d: 'done' | 'warn' | 'empty') =>
    d === 'done' ? 'var(--green)' : d === 'warn' ? '#f59e0b' : 'transparent';

  // ═══════════════════════════════════════════════════════════════════════
  // TAB RENDERS
  // ═══════════════════════════════════════════════════════════════════════

  function renderBasic() {
    return (
      <div style={s.section}>
        <SectionHeader icon="ti-info-circle" title="المعلومات الأساسية" subtitle="البيانات الرئيسية للمنتج" />

        {/* اسم + نشط */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <Field label="اسم المنتج" error={errors.name} required>
            <input
              ref={nameRef}
              style={s.inp(!!errors.name)}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onBlur={() => validateField('name')}
              placeholder="مثال: حليب نصف دسم 1 لتر"
            />
          </Field>
          <Toggle checked={form.active} onChange={v => set('active', v)} label="نشط" />
        </div>

        {/* Slug */}
        <Field label="Slug الرابط" hint="يُولَّد تلقائياً من الاسم — اضغط للتعديل اليدوي">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace', fontSize: 12, flex: 1, color: 'var(--t3)' }}
              value={form.slug}
              onChange={e => {
                slugEdited.current = true;
                set('slug', e.target.value);
              }}
              placeholder="my-product-name"
            />
            <button
              type="button"
              onClick={() => { slugEdited.current = false; set('slug', slugify(form.name)); }}
              style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t3)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
              title="إعادة توليد من الاسم"
            >
              <i className="ti ti-refresh" style={{ fontSize: 13 }} />
            </button>
          </div>
        </Field>

        {/* REF + Barcode */}
        <div style={s.row2}>
          <Field label="المرجع (SKU)" hint="مرجع داخلي فريد للمنتج">
            <input style={s.inp()} value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="PROD-001" />
          </Field>
          <Field label="الباركود">
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace', flex: 1 }}
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                placeholder="6121234567890"
              />
              {form.barcode && (
                <button
                  type="button"
                  onClick={copyBarcode}
                  style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: copied ? 'var(--greenb)' : 'var(--bg3)', color: copied ? 'var(--green)' : 'var(--t3)', cursor: 'pointer', fontSize: 12 }}
                  title="نسخ الباركود"
                >
                  <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: 13 }} />
                </button>
              )}
            </div>
          </Field>
        </div>

        {/* الوصف */}
        <Field label="الوصف">
          <textarea
            style={{ ...s.inp(), resize: 'vertical', minHeight: 80 }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="وصف تفصيلي للمنتج، مزاياه، استخداماته..."
          />
          <span style={{ ...s.hint, textAlign: 'end', marginTop: 2 }}>{form.description.length} حرف</span>
        </Field>

        <div style={s.divider} />
        <SectionHeader icon="ti-category" title="التصنيف والتنويع" subtitle="ربط المنتج بالتصنيفات المناسبة" />

        {/* family + brand + type */}
        <div style={s.row3}>
          <Field label="التصنيف (Family)">
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <select style={{ ...s.sel(), flex: 1 }} value={form.family_id ?? ''} onChange={e => set('family_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— لا يوجد —</option>
                {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <QuickAddLookupButton
                title="إضافة تصنيف جديد"
                resourcePath="families"
                fields={[{ name: 'name', label: 'اسم التصنيف', required: true }]}
                onCreated={item => set('family_id', item.id)}
              />
            </div>
          </Field>
          <Field label="العلامة التجارية">
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <select style={{ ...s.sel(), flex: 1 }} value={form.brand_id ?? ''} onChange={e => set('brand_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— لا يوجد —</option>
                {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <QuickAddLookupButton
                title="إضافة علامة تجارية جديدة"
                resourcePath="brands"
                fields={[{ name: 'name', label: 'اسم العلامة التجارية', required: true }]}
                onCreated={item => set('brand_id', item.id)}
              />
            </div>
          </Field>
          <Field label="نوع المنتج">
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <select
                style={{ ...s.sel(), flex: 1 }}
                value={form.product_type_id ?? ''}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const pt = (productTypes as ProductType[]).find(t => t.id === id);
                  setForm(f => ({ ...f, product_type_id: id, manages_stock: pt?.manages_stock ?? f.manages_stock }));
                  setIsDirty(true);
                }}
              >
                <option value="">— اختر —</option>
                {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <QuickAddLookupButton
                title="إضافة نوع منتج جديد"
                resourcePath="product-types"
                fields={[{ name: 'name', label: 'اسم النوع', required: true }]}
                onCreated={item => {
                  set('product_type_id', item.id);
                  if (item.manages_stock !== undefined) {
                    setForm(f => ({ ...f, product_type_id: item.id, manages_stock: item.manages_stock }));
                  }
                }}
              />
            </div>
          </Field>
        </div>

        <div style={s.divider} />
        <SectionHeader icon="ti-package-off" title="الدعم والمواد المدعمة" subtitle="تحديد إذا كان المنتج مدعماً من الدولة وربطه بالمادة المقننة" />

        <div style={s.row2}>
          <Field label="منتج مدعم" hint="المنتجات المدعمة تخضع لضريبة IFU على الهامش (5%) بدلاً من IFU على المشتريات">
            <Toggle checked={form.is_subsidized} onChange={v => {
              set('is_subsidized', v);
              if (!v) set('regulated_product_config_id', null);
            }} label={form.is_subsidized ? 'مدعم' : 'غير مدعم'} />
          </Field>
          {form.is_subsidized && (
            <Field label="المادة المقننة" hint="اختر المادة التي ينتمي إليها هذا المنتج" required>
              <select style={s.sel()} value={form.regulated_product_config_id ?? ''}
                onChange={e => set('regulated_product_config_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— اختر المادة المقننة —</option>
                {regulatedProducts.map((rp: any) => (
                  <option key={rp.id} value={rp.id}>{rp.label} ({rp.unit_label}) — {rp.category}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div style={s.divider} />
        <SectionHeader icon="ti-calculator" title="الأسعار الأساسية والضريبة" subtitle="سعر الشراء ومعدل TVA — يُستخدمان لحساب أسعار البيع" />

        {/* TVA + Unit + سعر الشراء + الهامش الأدنى */}
        <div style={s.row2}>
          <Field label="معدل TVA" error={errors.tva_id} required>
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <select style={{ ...s.sel(!!errors.tva_id), flex: 1 }} value={form.tva_id ?? ''} onChange={e => set('tva_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— اختر —</option>
                {(tvas as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%{t.is_default ? ' ✓' : ''}</option>)}
              </select>
              <QuickAddLookupButton
                title="إضافة معدل TVA جديد"
                resourcePath="tvas"
                fields={[
                  { name: 'rate', label: 'النسبة %', type: 'number', required: true },
                ]}
                onCreated={item => set('tva_id', item.id)}
              />
            </div>
          </Field>
          <Field label="وحدة القياس">
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <select style={{ ...s.sel(), flex: 1 }} value={form.unit_id ?? ''} onChange={e => set('unit_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— اختر —</option>
                {(units as Unit[]).map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              </select>
              <QuickAddLookupButton
                title="إضافة وحدة قياس جديدة"
                resourcePath="units"
                fields={[
                  { name: 'name', label: 'اسم الوحدة', required: true },
                  { name: 'symbol', label: 'الرمز (مثل: كغ، لتر، قطعة)', required: true },
                ]}
                onCreated={item => set('unit_id', item.id)}
              />
            </div>
          </Field>
        </div>

        {/* يُباع بالوزن */}
        <div style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Toggle
              checked={form.is_sold_by_weight}
              onChange={v => set('is_sold_by_weight', v)}
              label="يُباع بالوزن (Weight)"
            />
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, marginRight: 44 }}>في الـ POS يُفتح نافذة إدخال الوزن بدلاً من الكمية — للمنتجات المشروطة والموزونة</div>
          </div>
        </div>

        <div style={s.row2}>
          <Field label="سعر الشراء HT *" error={errors.purchase_price_ht} hint="المبلغ بدون TVA — يُستخدم كأساس لحساب أسعار البيع والهوامش" required>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" step="0.01"
                style={{ ...s.inp(!!errors.purchase_price_ht), paddingLeft: 40 }}
                value={form.purchase_price_ht}
                onChange={e => set('purchase_price_ht', e.target.value === '' ? '' : +e.target.value)}
                onBlur={() => validateField('purchase_price_ht')}
                placeholder="0.00"
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>دج</span>
            </div>
          </Field>
          <Field label="الحد الأدنى لهامش الربح %" hint="تحذير تلقائي عند انخفاض هامش سعر البيع عن هذه النسبة">
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" max="100" step="0.01"
                style={{ ...s.inp(), paddingLeft: 30 }}
                value={form.min_margin_percentage === null ? '' : form.min_margin_percentage}
                onChange={e => set('min_margin_percentage', e.target.value === '' ? null : +e.target.value)}
                placeholder="0.00"
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--t4)' }}>%</span>
            </div>
          </Field>
        </div>

        {/* تكلفة صافية (read-only في حالة التعديل) */}
        {isEdit && product?.current_cost_price > 0 && (
          <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="ti ti-coin" style={{ fontSize: 20, color: 'var(--gold)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>التكلفة الحالية المُحسَبة (PMP/FIFO)</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{fmtDZD(product.current_cost_price)}</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginRight: 'auto' }}>للقراءة فقط — تُحسَب من حركات المخزون</div>
          </div>
        )}
      </div>
    );
  }

  function renderPricing() {
    const lvls = priceLevels as PriceLevel[];
    const purchasePrice = Number(form.purchase_price_ht) || 0;
    const minMargin = form.min_margin_percentage !== null && form.min_margin_percentage !== '' ? Number(form.min_margin_percentage) : null;

    if (!lvls.length) return (
      <div style={{ textAlign: 'center', padding: 56, color: 'var(--t4)' }}>
        <i className="ti ti-tag" style={{ fontSize: 40, opacity: 0.3 }} />
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700 }}>لا توجد مستويات أسعار معرفة</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>أضف مستويات الأسعار من الإعدادات ← مستويات الأسعار</div>
      </div>
    );

    return (
      <div style={s.section}>
        <SectionHeader icon="ti-tag" title="أسعار البيع" subtitle="حدد طريقة حساب السعر لكل مستوى" />

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PRICING_METHODS.map(m => (
            <div key={m.value} style={{ padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className={`ti ${m.icon}`} style={{ fontSize: 16, color: 'var(--em)', marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{m.hint}</div>
              </div>
            </div>
          ))}
        </div>

        {purchasePrice > 0 && (
          <div style={{ ...s.card, background: 'var(--emb)', border: '1px solid var(--embo)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-shopping-cart" style={{ color: 'var(--em)', fontSize: 18 }} />
            <div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>سعر الشراء الأساسي: </span>
              <strong style={{ color: 'var(--em)', fontSize: 14 }}>{fmtDZD(purchasePrice)}</strong>
            </div>
            {minMargin !== null && (
              <div style={{ marginRight: 'auto', fontSize: 11, color: 'var(--t3)' }}>
                الهامش الأدنى: <strong>{minMargin}%</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lvls.map(pl => {
            const pr = form.prices.find(p => p.price_level_id === pl.id) ?? {
              price_level_id: pl.id, pricing_method: 'fixed' as const,
              price: '', rate: '', margin: '', active: true,
            };
            const method = pr.pricing_method;
            const sellingPrice = computeSellingPrice(pr, purchasePrice);
            const marginPct = computeMarginPct(sellingPrice, purchasePrice);
            const marginWarn = minMargin !== null && sellingPrice > 0 && marginPct < minMargin;

            return (
              <div key={pl.id} style={{
                display: 'grid', gridTemplateColumns: '160px 130px 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '12px 16px', borderRadius: 'var(--r2)',
                border: `1px solid ${marginWarn ? 'var(--redbo)' : pr.active ? 'var(--b2)' : 'var(--b1)'}`,
                background: marginWarn ? 'var(--redb)' : pr.active ? 'var(--bg2)' : 'var(--bg3)',
                opacity: pr.active ? 1 : 0.55, transition: 'all .15s',
              }}>
                {/* اسم المستوى + preview */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{pl.name}</div>
                  {sellingPrice > 0 ? (
                    <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--em)', fontWeight: 700 }}>{fmtDZD(sellingPrice)}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 5px', borderRadius: 6, fontWeight: 700,
                        background: marginWarn ? 'var(--redbo)' : 'var(--greenb)',
                        color: marginWarn ? 'var(--red)' : 'var(--green)',
                      }}>
                        {marginPct >= 0 ? '+' : ''}{fmtPct(marginPct)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>غير محدد</div>
                  )}
                </div>

                {/* طريقة الحساب */}
                <select
                  style={{ ...s.sel(), fontSize: 12 }}
                  value={method}
                  onChange={e => updatePrice(pl.id, 'pricing_method', e.target.value as any)}
                >
                  {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                {/* القيمة */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min="0" step="0.01"
                    style={{ ...s.inp(), fontSize: 12, paddingLeft: method === 'rate' ? 28 : 36 }}
                    value={
                      method === 'fixed'  ? (pr.price  ?? '') :
                      method === 'rate'   ? (pr.rate   ?? '') :
                                           (pr.margin  ?? '')
                    }
                    onChange={e => {
                      const k = method === 'fixed' ? 'price' : method === 'rate' ? 'rate' : 'margin';
                      updatePrice(pl.id, k as any, e.target.value === '' ? '' : +e.target.value);
                      if (method === 'fixed')  { updatePrice(pl.id, 'rate', '');  updatePrice(pl.id, 'margin', ''); }
                      if (method === 'rate')   { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'margin', ''); }
                      if (method === 'margin') { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'rate', '');  }
                    }}
                    placeholder={method === 'rate' ? '15' : '0.00'}
                  />
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>
                    {method === 'rate' ? '%' : 'دج'}
                  </span>
                </div>

                {/* تفعيل */}
                <Toggle checked={pr.active} onChange={v => updatePrice(pl.id, 'active', v)} label="" />
              </div>
            );
          })}
        </div>

        {/* ملاحظة TVA */}
        {form.tva_id && (
          <div style={{ fontSize: 11, color: 'var(--t4)', padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <i className="ti ti-receipt-tax" style={{ fontSize: 13, marginLeft: 5 }} />
            الأسعار أعلاه هي <strong>HT</strong> (بدون TVA). سعر TTC = السعر × (1 + نسبة TVA / 100)
          </div>
        )}
      </div>
    );
  }

  function renderPackagings() {
    return (
      <div style={s.section}>
        <SectionHeader icon="ti-package" title="وحدات التعبئة" subtitle="تعريف مختلف وحدات البيع: وحدة، كرتون، باليطة..." />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            {form.packagings.length === 0 ? 'المنتج يُباع بوحدته الأساسية' : `${form.packagings.length} وحدة تعبئة مُعرَّفة`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCopyModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="ti ti-copy" style={{ fontSize: 14 }} /> نسخ من منتج آخر
            </button>
            <button
              onClick={addPackaging}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة تعبئة
            </button>
          </div>
        </div>

        {form.packagings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)' }}>
            <i className="ti ti-package" style={{ fontSize: 40, opacity: 0.3 }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>لا توجد تعبئات مُعرَّفة</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>أمثلة: وحدة (UN, ×1) | فاردو (FD, ×12) | باليطة (PLT, ×240)</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 70px 1fr 90px 1fr 60px 60px 60px auto', gap: 8, padding: '0 10px' }}>
              {['', 'الكود', 'الاسم', 'الكمية', 'الباركود', 'افتراضي', 'نشط', 'الترتيب', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {form.packagings.map((pkg, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '28px 70px 1fr 90px 1fr 60px 60px 60px auto',
                gap: 8, alignItems: 'center', padding: '10px 10px',
                borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)',
              }}>
                {/* رقم الصف */}
                <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</div>
                {/* الكود */}
                <input
                  placeholder="UN"
                  style={{ ...s.inp(), textTransform: 'uppercase', fontSize: 12, fontFamily: 'monospace' }}
                  value={pkg.code}
                  onChange={e => updatePackaging(idx, 'code', e.target.value.toUpperCase())}
                />
                {/* الاسم */}
                <input
                  placeholder="قارورة"
                  style={{ ...s.inp(), fontSize: 12 }}
                  value={pkg.label}
                  onChange={e => updatePackaging(idx, 'label', e.target.value)}
                />
                {/* الكمية */}
                <input
                  type="number" min="0.0001" step="1"
                  placeholder="1"
                  style={{ ...s.inp(), fontSize: 12 }}
                  value={pkg.quantity}
                  onChange={e => updatePackaging(idx, 'quantity', e.target.value ? +e.target.value : '')}
                />
                {/* الباركود */}
                <input
                  placeholder="باركود"
                  style={{ ...s.inp(), fontSize: 11, fontFamily: 'monospace' }}
                  value={pkg.barcode}
                  onChange={e => updatePackaging(idx, 'barcode', e.target.value)}
                />
                {/* افتراضي */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="radio" name="default_pkg" checked={pkg.is_default}
                    onChange={() => updatePackaging(idx, 'is_default', true)}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </div>
                {/* نشط */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Toggle checked={pkg.active} onChange={v => updatePackaging(idx, 'active', v)} label="" />
                </div>
                {/* الترتيب */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <button
                    onClick={() => movePackaging(idx, -1)} disabled={idx === 0}
                    style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--b2)', background: 'var(--bg3)', color: idx === 0 ? 'var(--b3)' : 'var(--t3)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 11 }}
                  ><i className="ti ti-chevron-up" /></button>
                  <button
                    onClick={() => movePackaging(idx, 1)} disabled={idx === form.packagings.length - 1}
                    style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--b2)', background: 'var(--bg3)', color: idx === form.packagings.length - 1 ? 'var(--b3)' : 'var(--t3)', cursor: idx === form.packagings.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11 }}
                  ><i className="ti ti-chevron-down" /></button>
                </div>
                {/* حذف */}
                <button
                  onClick={() => removePackaging(idx)}
                  style={{ padding: '6px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--redbo)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>
        )}

        {form.packagings.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--t4)', padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, marginLeft: 5 }} />
            <strong>الكمية</strong> تمثل عدد الوحدات الأساسية في هذه التعبئة.
            سعر التعبئة = سعر الوحدة × الكمية.
            يجب أن يكون الكود فريداً لكل منتج.
          </div>
        )}
      </div>
    );
  }

  function renderStock() {
    const stockDisabled = !form.manages_stock;
    return (
      <div style={s.section}>
        <SectionHeader icon="ti-building-warehouse" title="إدارة المخزون" subtitle="إعدادات التتبع والتنبيهات والتقييم" />

        {/* toggle manages_stock */}
        <div style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Toggle
              checked={form.manages_stock}
              onChange={v => {
                setForm(f => ({ ...f, manages_stock: v, allow_negative_stock: v ? f.allow_negative_stock : false }));
                setIsDirty(true);
              }}
              label="إدارة المخزون"
            />
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, marginRight: 44 }}>فعّل لتتبع الكميات والتنبيهات وطريقة التقييم</div>
          </div>
          {form.manages_stock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--r2)', background: 'var(--emb)', border: '1px solid var(--embo)' }}>
              <i className="ti ti-check" style={{ fontSize: 14, color: 'var(--em)' }} />
              <span style={{ fontSize: 11, color: 'var(--em)', fontWeight: 700 }}>مفعّل</span>
            </div>
          )}
        </div>

        {/* خيارات المخزون */}
        <div style={{ opacity: stockDisabled ? 0.4 : 1, pointerEvents: stockDisabled ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'allow_negative_stock', label: 'السماح بمخزون سالب', hint: 'يتيح البيع حتى عند نفاد المخزون (للمنتجات المصنوعة عند الطلب)' },
              { key: 'has_lots',             label: 'إدارة الدفعات (Lots)', hint: 'تتبع دفعات الإنتاج والشراء — لازم لـ FIFO و LIFO' },
              { key: 'has_expiration_date',  label: 'تتبع تاريخ الصلاحية', hint: 'متاح فقط عند تفعيل إدارة الدفعات' },
              { key: 'manages_quantity_discounts', label: 'تفعيل خصومات الكمية', hint: 'تحديد خصومات تلقائية عند شراء كميات كبيرة' },
            ].map(opt => (
              <div key={opt.key} style={{ ...s.card }}>
                <Toggle
                  checked={(form as any)[opt.key]}
                  onChange={v => { set(opt.key as any, v); }}
                  label={opt.label}
                  disabled={opt.key === 'has_expiration_date' && !form.has_lots}
                />
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, marginRight: 44 }}>{opt.hint}</div>
              </div>
            ))}
          </div>

          {/* تنبيهات المخزون */}
          <div style={s.divider} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 15, color: '#f59e0b' }} />
            تنبيهات المخزون
          </div>
          <div style={s.row2}>
            <Field label="الحد الأدنى للتنبيه" hint="تنبيه عند الوصول لهذه الكمية أو ما دونها">
              <div style={{ position: 'relative' }}>
                <input
                  type="number" min="0" step="1"
                  style={{ ...s.inp(), paddingLeft: 50 }}
                  value={form.min_stock_alert}
                  onChange={e => set('min_stock_alert', e.target.value === '' ? '' : +e.target.value)}
                  placeholder="10"
                />
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>وحدة</span>
              </div>
            </Field>
            <Field label="الحد الأقصى المخزون" hint="تنبيه عند تجاوز هذه الكمية (اختياري)">
              <div style={{ position: 'relative' }}>
                <input
                  type="number" min="0" step="1"
                  style={{ ...s.inp(), paddingLeft: 50 }}
                  value={form.max_stock_alert}
                  onChange={e => set('max_stock_alert', e.target.value === '' ? '' : +e.target.value)}
                  placeholder="500"
                />
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>وحدة</span>
              </div>
            </Field>
          </div>

          {/* طريقة التقييم */}
          <div style={s.divider} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calculator" style={{ fontSize: 15, color: 'var(--em)' }} />
            طريقة تقييم المخزون
          </div>
          <Field label="طريقة التقييم" hint="تُستخدم لحساب تكلفة البضاعة المباعة وقيمة المخزون">
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <select
                style={{ ...s.sel(), flex: 1 }}
                value={form.valuation_method_id ?? ''}
                onChange={e => set('valuation_method_id', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— استخدام الإعداد الافتراضي للشركة —</option>
                {(valuationMethods as ValuationMethod[]).map(vm => (
                  <option key={vm.id} value={vm.id}>{vm.name}{vm.method ? ` (${vm.method})` : ''}</option>
                ))}
              </select>
              <QuickAddLookupButton
                title="إضافة طريقة تقييم جديدة"
                resourcePath="valuation-methods"
                fields={[{ name: 'name', label: 'اسم الطريقة', required: true }]}
                onCreated={item => set('valuation_method_id', item.id)}
              />
            </div>
          </Field>

          {/* مخزون حالي (read-only عند التعديل) */}
          {isEdit && product?.current_stock !== undefined && (
            <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: product.is_low_stock ? 'var(--redb)' : 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${product.is_low_stock ? 'ti-alert-triangle' : 'ti-box'}`} style={{ fontSize: 18, color: product.is_low_stock ? 'var(--red)' : 'var(--em)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>المخزون الحالي</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: product.is_low_stock ? 'var(--red)' : 'var(--t1)' }}>
                  {Number(product.current_stock).toFixed(2)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--t4)', marginRight: 4 }}>
                    {(units as Unit[]).find(u => u.id === form.unit_id)?.symbol ?? 'وحدة'}
                  </span>
                </div>
                {product.is_low_stock && (
                  <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>⚠ أقل من الحد الأدنى!</div>
                )}
              </div>
              <div style={{ marginRight: 'auto', fontSize: 10, color: 'var(--t4)' }}>للقراءة فقط — يتغير عبر حركات المخزون</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDiscounts() {
    const lvls = priceLevels as PriceLevel[];

    if (!form.manages_quantity_discounts) {
      return (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--t4)' }}>
          <i className="ti ti-discount-off" style={{ fontSize: 40, opacity: 0.3 }} />
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>خصومات الكمية معطّلة</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>فعّل خيار &ldquo;خصومات الكمية&rdquo; في تاب المخزون أولاً</div>
          <button
            onClick={() => switchTab('stock')}
            style={{ marginTop: 16, padding: '8px 20px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <i className="ti ti-settings" style={{ marginLeft: 5 }} /> الذهاب لتاب المخزون
          </button>
        </div>
      );
    }

    return (
      <div style={s.section}>
        <SectionHeader icon="ti-discount" title="خصومات الكمية" subtitle="تحديد خصومات تلقائية حسب الكمية المباعة لكل مستوى سعر" />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setCopyModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="ti ti-copy" style={{ fontSize: 14 }} /> نسخ من منتج آخر
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--t3)', ...s.card }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13, marginLeft: 5 }} />
          يمكن تحديد خصم كمبلغ ثابت (دج) أو كنسبة مئوية (%). إذا حُدِّد كلاهما فالأفضلية للنسبة المئوية.
        </div>

        {lvls.map(pl => {
          const discountsForLevel = form.quantity_discounts.filter(d => d.price_level_id === pl.id);
          return (
            <div key={pl.id} style={{ ...s.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-tag" style={{ fontSize: 15, color: 'var(--em)' }} />
                  {pl.name}
                  {discountsForLevel.length > 0 && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--emb)', color: 'var(--em)', fontWeight: 700 }}>
                      {discountsForLevel.length} شرط
                    </span>
                  )}
                </div>
                <button
                  onClick={() => addDiscount(pl.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> إضافة شرط
                </button>
              </div>

              {discountsForLevel.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '16px 0' }}>لا توجد شروط خصم لهذا المستوى</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 90px 90px 40px 40px auto', gap: 8, padding: '0 4px' }}>
                    {['من كمية', 'حتى كمية', 'خصم (دج)', 'خصم (%)', 'مجمد', 'نشط', ''].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {form.quantity_discounts.map((d, idx) => {
                    if (d.price_level_id !== pl.id) return null;
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 80px 90px 90px 40px 40px auto', gap: 8, alignItems: 'center', padding: '8px', borderRadius: 'var(--r1)', border: '1px solid var(--b1)', background: 'var(--bg2)' }}>
                        <input type="number" min="1" step="1" placeholder="1" style={{ ...s.inp(), fontSize: 12 }} value={d.min_qty ?? ''} onChange={e => updateDiscount(idx, 'min_qty', e.target.value ? +e.target.value : '')} />
                        <input type="number" min="1" step="1" placeholder="—" style={{ ...s.inp(), fontSize: 12 }} value={d.max_qty ?? ''} onChange={e => updateDiscount(idx, 'max_qty', e.target.value ? +e.target.value : null)} />
                        <input type="number" min="0" step="0.01" placeholder="0.00" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_amount ?? ''} onChange={e => updateDiscount(idx, 'discount_amount', e.target.value ? +e.target.value : null)} />
                        <input type="number" min="0" max="100" step="0.1" placeholder="0.0" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_percentage ?? ''} onChange={e => updateDiscount(idx, 'discount_percentage', e.target.value ? +e.target.value : null)} />
                        <div style={{ textAlign: 'center', cursor: 'pointer' }} title={d.is_blocked ? 'مجمد — انقر لإلغاء التجميد' : 'انقر للتجميد'} onClick={() => updateDiscount(idx, 'is_blocked', !d.is_blocked)}>
                          <i className={`ti ${d.is_blocked ? 'ti-lock' : 'ti-lock-open'}`} style={{ fontSize: 15, color: d.is_blocked ? 'var(--red)' : 'var(--t4)' }} />
                        </div>
                        <Toggle checked={d.active} onChange={v => updateDiscount(idx, 'active', v)} label="" />
                        <button onClick={() => removeDiscount(idx)} style={{ padding: '5px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--redbo)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>
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

  function renderImages() {
    return (
      <div style={s.section}>
        <SectionHeader icon="ti-photo" title="صور المنتج" subtitle="إضافة روابط صور المنتج (URL)" />

        {/* إضافة صورة بـ URL */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...s.inp(), flex: 1, direction: 'ltr', fontFamily: 'monospace', fontSize: 12 }}
            value={imageInput}
            onChange={e => setImageInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            onKeyDown={e => {
              if (e.key === 'Enter' && imageInput.trim()) {
                set('images', [...form.images, imageInput.trim()]);
                setImageInput('');
              }
            }}
          />
          <button
            disabled={!imageInput.trim()}
            onClick={() => { if (imageInput.trim()) { set('images', [...form.images, imageInput.trim()]); setImageInput(''); } }}
            style={{ padding: '7px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !imageInput.trim() ? 0.5 : 1 }}
          >
            <i className="ti ti-plus" /> إضافة
          </button>
          <button
            type="button"
            onClick={() => imgFileRef.current?.click()}
            disabled={!!productId === false || imgUploadPct > 0}
            style={{
              padding: '7px 16px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b3)', background: 'var(--bg2)',
              color: 'var(--t2)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: !productId || imgUploadPct > 0 ? 0.5 : 1,
            }}
          >
            {imgUploadPct > 0
              ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {imgUploadPct}%</>
              : <><i className="ti ti-upload" /> من الجهاز</>}
          </button>
          <input
            ref={imgFileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleUploadImage}
          />
          <button
            type="button"
            onClick={toggleImgSuggest}
            style={{
              padding: '7px 16px', borderRadius: 'var(--r2)',
              border: `1px solid ${showImgSuggest ? 'var(--em)' : 'var(--b3)'}`,
              background: showImgSuggest ? 'var(--emb)' : 'var(--bg2)',
              color: showImgSuggest ? 'var(--em)' : 'var(--t2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-sparkles" /> اقتراح صورة
          </button>
        </div>

        {/* لوحة اقتراح الصور من الإنترنت */}
        {showImgSuggest && (
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...s.inp(), flex: 1, fontSize: 13 }}
                value={imgQuery}
                onChange={e => setImgQuery(e.target.value)}
                placeholder="اكتب اسم المنتج أو كلمة بحث..."
                onKeyDown={e => { if (e.key === 'Enter') searchProductImages(imgQuery); }}
              />
              <button
                type="button"
                disabled={!imgQuery.trim() || imgLoading}
                onClick={() => searchProductImages(imgQuery)}
                style={{
                  padding: '7px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--em)',
                  background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: (!imgQuery.trim() || imgLoading) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {imgLoading
                  ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                  : <i className="ti ti-search" />}
                بحث
              </button>
            </div>

            {imgLoading && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    width: 110, height: 110, borderRadius: 'var(--r2)', flexShrink: 0,
                    background: 'var(--bg3)', border: '1px solid var(--b2)',
                  }} />
                ))}
              </div>
            )}

            {!imgLoading && imgError && (
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '10px 0' }}>
                <i className="ti ti-mood-empty" style={{ marginLeft: 6 }} />
                {imgError}
              </div>
            )}

            {!imgLoading && imgResults.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {imgResults.map(r => {
                    const added = form.images.includes(r.full);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => addSuggestedImage(r.full)}
                        title={added ? 'مُضافة بالفعل' : 'اضغط للإضافة إلى المنتج'}
                        style={{
                          position: 'relative', width: 110, height: 110, flexShrink: 0,
                          borderRadius: 'var(--r2)', overflow: 'hidden', padding: 0,
                          border: `2px solid ${added ? 'var(--em)' : r.exact ? 'var(--gold, #c8952c)' : 'var(--b2)'}`,
                          cursor: added ? 'default' : 'pointer', background: 'var(--bg3)',
                        }}
                      >
                        <img
                          src={r.thumb}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }}
                        />
                        {r.exact && !added && (
                          <div style={{
                            position: 'absolute', bottom: 0, insetInline: 0,
                            background: 'rgba(200,149,44,.92)', color: '#fff',
                            fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '2px 0',
                          }}>
                            {r.label ?? 'مطابقة دقيقة'}
                          </div>
                        )}
                        {!r.exact && r.source && !added && (
                          <div style={{
                            position: 'absolute', bottom: 0, insetInline: 0,
                            background: 'rgba(0,0,0,.6)', color: '#fff',
                            fontSize: 9, fontWeight: 600, textAlign: 'center', padding: '2px 4px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {r.source}
                          </div>
                        )}
                        {added && (
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <i className="ti ti-check" style={{ fontSize: 22, color: '#fff' }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 13 }} />
                  اضغط على أي صورة لإضافتها مباشرة إلى صور المنتج. يمكنك اختيار أكثر من صورة.
                </div>
              </>
            )}
          </div>
        )}

        {form.images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--t4)' }}>
            <i className="ti ti-photo-off" style={{ fontSize: 40, opacity: 0.3 }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>لا توجد صور</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>أضف روابط الصور أعلاه</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {form.images.map((img, idx) => (
                <div key={idx} style={{
                  position: 'relative', borderRadius: 'var(--r3)', overflow: 'hidden',
                  border: '1px solid var(--b2)', background: 'var(--bg3)', aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={img}
                    alt={`صورة ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <i className="ti ti-photo" style={{
                    position: 'absolute', fontSize: 28, color: 'var(--t4)', opacity: 0.3,
                    pointerEvents: 'none',
                  }} />
                  {/* Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', opacity: 0, transition: 'opacity .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <a href={img} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,.15)', color: '#fff', textDecoration: 'none', fontSize: 13 }}>
                      <i className="ti ti-external-link" />
                    </a>
                    <button
                      onClick={() => set('images', form.images.filter((_, i) => i !== idx))}
                      style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(212,43,43,.8)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                    ><i className="ti ti-trash" /></button>
                  </div>
                  {/* رقم الصورة */}
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-info-circle" style={{ fontSize: 13 }} />
              {form.images.length} صورة — الصورة الأولى هي الصورة الرئيسية.
              مرر الماوس على الصورة لحذفها أو فتحها.
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSEO() {
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

  function renderBarcodes() {
    const barcodes = (productBarcodes as Barcode[]);
    const isCreating = !isEdit;

    if (isCreating) {
      return (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--t4)' }}>
          <i className="ti ti-barcode" style={{ fontSize: 40, opacity: 0.3 }} />
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>أضف الباركودات بعد إنشاء المنتج</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>احفظ المنتج أولاً ثم أضف الباركودات من تاب التعديل</div>
        </div>
      );
    }

    return (
      <div style={s.section}>
        <SectionHeader icon="ti-barcode" title="باركودات المنتج" subtitle="أضف باركود واحد أو أكثر — الباركود الأول يصبح رئيسي تلقائياً" />

        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            {barcodes.length === 0
              ? 'لا توجد باركودات'
              : `${barcodes.length} باركود`}
          </div>
          {!showAddBarcode && (
            <button
              onClick={() => { setShowAddBarcode(true); setBarcodeInput(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة باركود
            </button>
          )}
        </div>

        {/* Inline Add — single input */}
        {showAddBarcode && (
          <div style={{ ...s.card, border: '1px solid var(--em)', background: 'var(--bg1)', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--em)' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>باركود جديد</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Field label="الباركود" col={1}>
                <input
                  autoFocus
                  style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace' }}
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && barcodeInput.trim()) addBarcode();
                    if (e.key === 'Escape') setShowAddBarcode(false);
                  }}
                  placeholder="6121234567890"
                />
              </Field>
              <div style={{ display: 'flex', gap: 6, paddingBottom: 2 }}>
                <button
                  onClick={addBarcode}
                  disabled={!barcodeInput.trim() || barcodeMutations.create.isPending}
                  style={{ padding: '8px 18px', borderRadius: 'var(--r2)', border: 'none', background: barcodeInput.trim() ? 'var(--em)' : 'var(--b3)', color: barcodeInput.trim() ? '#fff' : 'var(--t4)', fontSize: 12, fontWeight: 600, cursor: barcodeInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, height: 36, whiteSpace: 'nowrap' }}
                >
                  {barcodeMutations.create.isPending
                    ? <i className="ti ti-loader" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />
                    : <i className="ti ti-check" style={{ fontSize: 14 }} />}
                  حفظ
                </button>
                <button
                  onClick={() => setShowAddBarcode(false)}
                  style={{ padding: '8px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', height: 36 }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Cards */}
        {barcodes.length === 0 && !showAddBarcode ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)' }}>
            <i className="ti ti-barcode" style={{ fontSize: 40, opacity: 0.3 }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>لا توجد باركودات مُعرَّفة</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>أضف باركوداً بالضغط على &ldquo;إضافة باركود&rdquo;</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {barcodes.map((bc) => (
              <div key={bc.id} style={{
                padding: '10px 14px',
                borderRadius: 'var(--r3)',
                border: `1px solid ${bc.is_primary ? 'var(--embo)' : 'var(--b2)'}`,
                background: bc.is_primary ? 'var(--emb)' : 'var(--bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                {/* Left: barcode info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: bc.is_primary ? 'var(--gold, #c8952c)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${bc.is_primary ? 'ti-star' : 'ti-barcode'}`} style={{ fontSize: 15, color: bc.is_primary ? '#fff' : 'var(--t4)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: bc.is_primary ? 700 : 500, direction: 'ltr', color: 'var(--t1)', letterSpacing: '0.05em' }}>
                      {bc.barcode}
                    </span>
                    {bc.is_primary && (
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: 'var(--em)', color: '#fff', fontWeight: 700 }}>
                        رئيسي
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => makePrimaryBarcode(bc.id)}
                    disabled={bc.is_primary}
                    title={bc.is_primary ? 'رئيسي بالفعل' : 'تعيين كرئيسي'}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      border: bc.is_primary ? 'none' : '1px solid var(--b3)',
                      background: bc.is_primary ? 'var(--gold, #c8952c)' : 'var(--bg3)',
                      color: bc.is_primary ? '#fff' : 'var(--t4)',
                      cursor: bc.is_primary ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, opacity: bc.is_primary ? 1 : 0.7, transition: 'all .15s',
                    }}
                  >
                    <i className={`ti ${bc.is_primary ? 'ti-star' : 'ti-star-off'}`} />
                  </button>
                  <button
                    onClick={() => copyBarcodeText(bc.barcode)}
                    title="نسخ"
                    style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                  >
                    <i className="ti ti-copy" />
                  </button>
                  <button
                    onClick={() => removeBarcodeItem(bc.id)}
                    disabled={barcodeMutations.remove.isPending}
                    title="حذف"
                    style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--redbo)', background: 'var(--redb)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {barcodes.length > 0 && !showAddBarcode && (
          <div style={{ fontSize: 11, color: 'var(--t4)', padding: '8px 12px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, marginLeft: 5 }} />
            الباركود <strong>الرئيسي</strong> (النجمة الذهبية) يظهر في فواتير البيع.
          </div>
        )}
      </div>
    );
  }

  // ── tabContent map ──
  const tabContent: Record<TabId, () => React.ReactNode> = {
    basic: renderBasic, barcodes: renderBarcodes, pricing: renderPricing, packagings: renderPackagings,
    stock: renderStock, discounts: renderDiscounts, dimensions: renderDimensions,
    images: renderImages, seo: renderSEO,
  };

  const currentTabIdx = TAB_IDS.indexOf(activeTab);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const ovStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9000,
    display: open ? 'flex' : 'none',
    alignItems: 'flex-end', justifyContent: 'center',
    background: open ? 'rgba(0,0,0,.5)' : 'transparent',
    backdropFilter: open ? 'blur(3px)' : 'none',
    paddingTop: '4vh',
    pointerEvents: open ? 'auto' : 'none',
    opacity: open ? 1 : 0,
    transition: 'opacity .25s, background .25s',
  };

  return (
    <div style={ovStyle} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '100%', maxWidth: 900,
        background: 'var(--bg1)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -8px 64px rgba(0,0,0,.25)',
        display: 'flex', flexDirection: 'column',
        height: '96vh', overflow: 'hidden',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--b2)', flexShrink: 0, background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--embo)' }}>
              <i className="ti ti-package" style={{ fontSize: 20, color: 'var(--em)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isEdit ? 'تعديل المنتج' : 'منتج جديد'}
                {isDirty && (
                  <span style={{ fontSize: 10, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>غير محفوظ</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                {form.name.trim()
                  ? <span style={{ color: 'var(--em)', fontWeight: 600 }}>{form.name.length > 40 ? form.name.slice(0, 40) + '…' : form.name}</span>
                  : <span>بدون اسم</span>
                }
                {form.ref && <span style={{ color: 'var(--t4)', marginRight: 8 }}>#{form.ref}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* شريط الاكتمال */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>اكتمال النموذج</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 80, height: 5, borderRadius: 3, background: 'var(--b2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width .3s',
                    background: completeness >= 80 ? 'var(--green)' : completeness >= 50 ? '#f59e0b' : 'var(--red)',
                    width: `${completeness}%`,
                  }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: completeness >= 80 ? 'var(--green)' : completeness >= 50 ? '#f59e0b' : 'var(--red)' }}>
                  {completeness}%
                </span>
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: 'var(--b2)' }} />

            {/* Keyboard hint */}
            <div style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-keyboard" style={{ fontSize: 11 }} /> Ctrl+S
            </div>

            {/* زر الإغلاق */}
            <button
              onClick={handleClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', transition: 'all .15s' }}
              title="إغلاق (Esc)"
            >
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', background: 'var(--bg2)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const dot      = tabDot(tab.id);
            const badge    = tabBadge(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '11px 16px', fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--em)' : 'var(--t3)',
                  background: isActive ? 'var(--emb)' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--em)' : 'transparent'}`,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color .15s, border-color .15s, background .15s',
                }}
              >
                <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
                {tab.label}
                {badge !== null ? (
                  <span style={{ fontSize: 10, background: isActive ? 'var(--em)' : 'var(--b3)', color: isActive ? '#fff' : 'var(--t3)', padding: '0 5px', borderRadius: 10, fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px', height: 16 }}>
                    {badge}
                  </span>
                ) : (
                  dot !== 'empty' && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(dot), flexShrink: 0 }} />
                  )
                )}
              </button>
            );
          })}
        </div>

        {/* ══ BODY ══ */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'thin', background: 'var(--bg1)' }}>
          {/* Loading Lookups */}
          {lookupsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--r2)', background: 'var(--emb)', marginBottom: 16, fontSize: 12, color: 'var(--em)' }}>
              <i className="ti ti-loader" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }} />
              جاري تحميل البيانات...
            </div>
          )}
          {/* API Error */}
          {apiError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r2)', marginBottom: 16, background: 'var(--redb)', border: '1px solid var(--redbo)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{apiError}</span>
              <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          )}
          {tabContent[activeTab]()}
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{ padding: '11px 20px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg2)' }}>
          {/* ملخص سريع */}
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap', alignItems: 'center' }}>
            {form.name.trim() && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> اسم
              </span>
            )}
            {form.purchase_price_ht !== '' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {fmtDZD(form.purchase_price_ht)}
              </span>
            )}
            {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length} أسعار
              </span>
            )}
            {form.packagings.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {form.packagings.length} تعبئة
              </span>
            )}
            {form.images.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {form.images.length} صور
              </span>
            )}
            {isEdit && (productBarcodes as Barcode[]).length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)' }}>
                <i className="ti ti-check" style={{ fontSize: 12 }} /> {(productBarcodes as Barcode[]).length} باركود
              </span>
            )}
          </div>

          {/* أزرار التنقل + الحفظ */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {currentTabIdx > 0 && (
              <button
                onClick={() => switchTab(TAB_IDS[currentTabIdx - 1])}
                style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}
              >
                <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> السابق
              </button>
            )}
            {currentTabIdx < TAB_IDS.length - 1 && (
              <button
                onClick={() => switchTab(TAB_IDS[currentTabIdx + 1])}
                style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}
              >
                التالي <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
              </button>
            )}
            <div style={{ width: 1, height: 22, background: 'var(--b2)', margin: '0 2px' }} />
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              style={{ padding: '8px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Tajawal, inherit' }}
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              style={{
                padding: '8px 24px', borderRadius: 'var(--r2)', border: 'none',
                background: mutation.isPending ? 'var(--b3)' : 'var(--em)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'Tajawal, inherit', transition: 'background .15s',
                boxShadow: mutation.isPending ? 'none' : '0 2px 8px rgba(10,138,92,.3)',
              }}
            >
              {mutation.isPending
                ? <><i className="ti ti-loader" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                : <><i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> {isEdit ? 'حفظ التعديلات' : 'إنشاء المنتج'}</>
              }
            </button>
          </div>
        </div>

      </div>
      <ConfirmDialog {...confirmDialogProps} />
      <CopyConfigModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onApply={handleCopyConfig}
        mode="inline"
      />
    </div>
  );
}
