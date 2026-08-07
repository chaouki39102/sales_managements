// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersPage.tsx — وصل طلب سلعة (كتالوج + سلة + طلباتي)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalCatalogItem, type PortalCatalogPackaging, type PortalCatalogDiscount, type PortalOrderStatus, type PortalOrder } from '@/lib/api/portal/portal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import OrderPipeline from './OrderPipeline';
import {
  fmtMoney, fmtMoneySigned, fmtDate, Pager,
  PortalLoading, PortalError, PortalEmpty,
} from './portalUtils';

const STATUS_STYLE: Record<PortalOrderStatus, string> = {
  pending:   'badge--gray',
  preparing: 'badge--y',
  confirmed: 'badge--b',
  processed: 'badge--purple',
  shipped:   'badge--z',
  delivered: 'badge--g',
  returned:  'badge--r',
  cancelled: 'badge--gray',
  completed: 'badge--g',
};

const STATUS_TABS: { key: PortalOrderStatus | ''; label: string }[] = [
  { key: '', label: 'الكل' },
  { key: 'preparing', label: 'قيد الاعداد' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'processed', label: 'تم المعالجة' },
  { key: 'shipped',   label: 'الشحن' },
  { key: 'delivered', label: 'تم التسليم' },
  { key: 'returned',  label: 'مرتجع' },
  { key: 'cancelled', label: 'ملغى' },
];

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

interface CartEntry {
  product_id:   number;
  packaging_id: number | null;
  quantity:     number;
}

const cartKey = (productId: number, packagingId: number | null) =>
  `${productId}:${packagingId ?? 0}`;

export default function PortalOrdersPage({ mode = 'portal' }: { mode?: 'portal' | 'public' } = {}) {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  // وضع الطلب العام (بدون حساب بوابة): يُعرض الكتالوج + السلة فقط، مع حقول
  // بيانات الزبون (الاسم/الهاتف/العنوان) بدل «طلباتي» وبدل قائمة الطلبات.
  const isPublic = mode === 'public';

  const [search, setSearch] = useState('');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [pkg, setPkg] = useState<Record<number, number | null>>({});
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PortalOrderStatus | ''>('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [toast, setToast] = useState('');
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);

  // قفل تمرير الصفحة خلف درج السلة عندما يكون مفتوحاً (نفس سلوك Modal المشترك).
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const { confirm, confirmDialogProps } = useConfirm();

  const handleRemoveItem = async (key: string, name: string) => {
    const ok = await confirm(`إزالة «${name}» من سلة الطلب؟`, {
      title: 'إزالة من السلة',
      confirmText: 'إزالة',
      cancelText: 'إلغاء',
      variant: 'danger',
      icon: 'ti-trash',
    });
    if (ok) updateCartQty(key, 0);
  };

  // تأكيد الطلب من الزبون — نافذة واضحة لا تحتاج إعادة النقر خلال مهلة زمنية.
  const handleValidateOrder = async (o: PortalOrder) => {
    const ok = await confirm(
      `تأكيد الطلب «${o.reference}»؟\nبعد التأكيد يدخل الطلب مرحلة تحليل المسؤول ولا يمكنك التعديل عليه.`,
      {
        title: 'تأكيد الطلب',
        confirmText: 'تأكيد الطلب',
        cancelText: 'تراجع',
        variant: 'warning',
        icon: 'ti-circle-check',
      },
    );
    if (ok) validateOrder.mutate(o.id);
  };

  // إلغاء الطلب — نافذة تأكيد صريحة بدل أسلوب النقرتين المتلاشي.
  const handleCancelOrder = async (o: PortalOrder) => {
    const ok = await confirm(`إلغاء الطلب «${o.reference}»؟`, {
      title: 'إلغاء الطلب',
      confirmText: 'إلغاء الطلب',
      cancelText: 'تراجع',
      variant: 'danger',
      icon: 'ti-x',
    });
    if (ok) cancelOrder.mutate(o.id);
  };

  const debouncedSearch = useDebounce(search, 350);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const catalogQuery = useQuery({
    queryKey: ['portal', slug, 'orders', 'catalog', debouncedSearch, catalogPage],
    queryFn: () => portalApi.catalog({ page: catalogPage, per_page: 24, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const ordersQuery = useQuery({
    queryKey: ['portal', slug, 'orders', 'list', page, statusFilter],
    queryFn: () => portalApi.orders({ page, per_page: 10, status: statusFilter || undefined }),
    placeholderData: keepPreviousData,
    enabled: !isPublic,
  });

  const createOrder = useMutation({
    mutationFn: ({ items, note }: { items: { product_id: number; quantity: number; packaging_id?: number | null }[]; note?: string }) =>
      isPublic
        ? portalApi.createPublicOrder(
            items,
            {
              customer_name:    customerName.trim(),
              customer_phone:   customerPhone.trim(),
              customer_address: customerAddress.trim() || null,
            },
            note,
          )
        : portalApi.createOrder(items, note),
    onSuccess: (order) => {
      resetCart();
      setEditingId(null);
      setSubmitted(order.id);
      setPage(1);
      setDrawerOpen(false);
      setCheckoutStep(false);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم إرسال طلب السلعة بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر إرسال الطلب'),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, items, note }: { id: number; items: { product_id: number; quantity: number; packaging_id?: number | null }[]; note?: string }) =>
      portalApi.updateOrder(id, items, note),
    onSuccess: (order) => {
      resetCart();
      setEditingId(null);
      setSubmitted(order.id);
      setDrawerOpen(false);
      setCheckoutStep(false);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم تحديث طلب السلعة بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تحديث الطلب'),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: number) => portalApi.cancelOrder(id),
    onSuccess: (order) => {
      setSubmitted(order.id);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم إلغاء الطلب');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر إلغاء الطلب'),
  });

  // تأكيد الطلب من الزبون (قيد الاعداد → مؤكد) — الطريقة الاحترافية:
  // بعد التأكيد يدخل الطلب مرحلة تحليل المسؤول ولا يعود للزبون تصرف.
  const validateOrder = useMutation({
    mutationFn: (id: number) => portalApi.validateOrder(id),
    onSuccess: (order) => {
      setSubmitted(order.id);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم تأكيد طلبك — أصبح في انتظار تحليل المسؤول');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تأكيد الطلب'),
  });

  const byId = useMemo(() => {
    const m = new Map<number, PortalCatalogItem>();
    (catalogQuery.data?.data ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [catalogQuery.data]);

  // السعر الفعلي لوحدة الطلب (وحدة أساسية أو تعبئة مختارة)
  const unitPriceFor = (product: PortalCatalogItem, packagingId: number | null): number => {
    if (packagingId) {
      const pk = product.packagings?.find((x) => x.id === packagingId);
      return pk ? pk.pack_price_ht : product.unit_price_ht;
    }
    return product.unit_price_ht;
  };

  const packFactorFor = (product: PortalCatalogItem, packagingId: number | null): number => {
    if (packagingId) {
      const pk = product.packagings?.find((x) => x.id === packagingId);
      return pk ? pk.quantity : 1;
    }
    return 1;
  };

  // الوحدة الافتراضية للمنتج — تُعرض دائماً (symbol ← name ← «وحدة»).
  const unitOf = (product: PortalCatalogItem): string =>
    product.unit ? (product.unit.symbol || product.unit.name || 'وحدة') : 'وحدة';

  // وحدة العرض حسب التعبئة المختارة: التعبئة لها اسمها الخاص (مثل «كوليسة»)،
  // وإلا تُعرض الوحدة الأساسية للمنتج.
  const unitLabelFor = (product: PortalCatalogItem, packagingId: number | null): string => {
    if (packagingId) {
      const pk = product.packagings?.find((x) => x.id === packagingId);
      if (pk && (pk.label || pk.code)) return pk.label || (pk.code as string) || '';
    }
    return unitOf(product);
  };

  // التعبئة الافتراضية — تعكس تماماً Product::defaultPackaging() في الخادم:
  // is_default أولاً، وإلا أصغر كمية. الخادم يطبّقها تلقائياً عند إرسال طلب
  // دون packaging_id، لذلك يجب أن تُعرض مسبقاً في الكتالوج ليُطابق السعر المعروض.
  const defaultPackagingFor = (product: PortalCatalogItem): PortalCatalogPackaging | null => {
    if (!product.packagings?.length) return null;
    return (
      product.packagings.find((x) => x.is_default) ??
      product.packagings.reduce((a, b) => (b.quantity < a.quantity ? b : a))
    );
  };

  // شريحة الخصم المطبَّقة لكمية معينة — تعكس تماماً applicableDiscount في الخادم:
  // الشريحة النشطة ذات min_qty الأعلى التي تقع الكمية ضمن نطاقها (بالوحدات الأساسية).
  const discountTierFor = (product: PortalCatalogItem, baseQty: number): PortalCatalogDiscount | null => {
    if (!product.manages_quantity_discounts || !product.discounts?.length || baseQty <= 0) return null;
    let best: PortalCatalogDiscount | null = null;
    for (const d of product.discounts) {
      if (baseQty < d.min_qty) continue;
      if (d.max_qty !== null && d.max_qty !== undefined && baseQty > d.max_qty) continue;
      if (!best || d.min_qty > best.min_qty) best = d;
    }
    return best;
  };

  // حساب السطر الكامل (الوحدة × الكمية × الخصم) بنفس معادلات الخادم:
  //   خصم نسبة   = gross × pct%
  //   خصم مبلغ   = discount_amount × baseQty
  // الخادم يطبّق الشريحة تلقائياً عند إنشاء الطلب (createDocumentLines).
  const lineCalc = (product: PortalCatalogItem, packagingId: number | null, quantity: number) => {
    const unitPrice = unitPriceFor(product, packagingId);
    const factor    = packFactorFor(product, packagingId);
    const qty       = Math.max(0, Number(quantity) || 0);
    const baseQty   = qty * factor;
    const gross     = unitPrice * qty;
    const tier      = discountTierFor(product, baseQty);
    let discount    = 0;
    if (tier) {
      if (tier.discount_amount !== null && tier.discount_amount > 0) {
        discount = tier.discount_amount * baseQty;
      } else if (tier.discount_percentage !== null && tier.discount_percentage > 0) {
        discount = gross * (tier.discount_percentage / 100);
      }
    }
    const ht  = Math.max(0, gross - discount);
    const tva = partyIsTvaExempt ? 0 : ht * (product.tva_rate / 100);
    return { unitPrice, factor, baseQty, gross, discount, tier, ht, tva, ttc: ht + tva };
  };

  const discountLabel = (d: PortalCatalogDiscount): string =>
    d.discount_amount !== null && d.discount_amount > 0
      ? `خصم ${fmtMoney(d.discount_amount)} دج/وحدة`
      : `خصم ${d.discount_percentage}%`;

  // زبون معفى جبائياً (من back-office: is_tva_exempt) — المحرك يخزّن tva_rate=0
  // على الأسطر، لذلك يجب أن تُصفَّر TVA في المعاينة أيضاً وإلا ظهر مبلغ أكبر
  // مما سيُحتسب فعلاً.
  const partyIsTvaExempt = catalogQuery.data?.data[0]?.party_is_tva_exempt ?? false;

  const tierHint = (d: PortalCatalogDiscount): string => {
    const to = d.max_qty !== null && d.max_qty !== undefined ? d.max_qty : null;
    return to !== null && to > d.min_qty ? `${d.min_qty}–${to}` : `من ${d.min_qty}`;
  };

  const cartEntries = useMemo(() => {
    return Object.entries(cart).map(([key, entry]) => {
      const product = byId.get(entry.product_id);
      if (!product) return null;
      return { key, product, entry };
    }).filter((x): x is { key: string; product: PortalCatalogItem; entry: CartEntry } => x !== null);
  }, [cart, byId]);

  const totals = cartEntries.reduce(
    (acc, { product, entry }) => {
      const c = lineCalc(product, entry.packaging_id, entry.quantity);
      acc.gross    += c.gross;
      acc.discount += c.discount;
      acc.ht       += c.ht;
      acc.tva      += c.tva;
      acc.ttc      += c.ttc;
      return acc;
    },
    { gross: 0, discount: 0, ht: 0, tva: 0, ttc: 0 },
  );

  const addToCart = (productId: number, quantity: number, packagingId: number | null) => {
    const n = Math.max(0, quantity);
    const key = cartKey(productId, packagingId);
    setCart((prev) => {
      const next = { ...prev };
      if (n <= 0) {
        delete next[key];
      } else {
        next[key] = { product_id: productId, packaging_id: packagingId, quantity: n };
      }
      return next;
    });
    if (n > 0) setQty((prev) => ({ ...prev, [productId]: n }));
  };

  const updateCartQty = (key: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[key];
      } else if (next[key]) {
        next[key] = { ...next[key], quantity };
      }
      return next;
    });
  };

  const resetCart = () => {
    setCart({});
    setQty({});
    setPkg({});
    setNotes('');
  };

  const startEdit = (order: PortalOrder) => {
    const items = order.lines ?? [];
    if (items.length === 0) return;
    const nextCart: Record<string, CartEntry> = {};
    const nextQty: Record<number, number> = {};
    const nextPkg: Record<number, number | null> = {};
    items.forEach((it) => {
      const key = cartKey(it.product_id, it.packaging_id ?? null);
      nextCart[key] = { product_id: it.product_id, packaging_id: it.packaging_id ?? null, quantity: it.quantity };
      nextQty[it.product_id] = it.quantity;
      nextPkg[it.product_id] = it.packaging_id ?? null;
    });
    setCart(nextCart);
    setQty(nextQty);
    setPkg(nextPkg);
    setNotes(order.notes ?? '');
    setEditingId(order.id);
    setSubmitted(null);
    setCheckoutStep(false);
    setDrawerOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitCart = () => {
    const items = Object.values(cart).map((e) => ({
      product_id: e.product_id,
      quantity: e.quantity,
      packaging_id: e.packaging_id ?? undefined,
    }));
    if (items.length === 0) {
      showToast('السلة فارغة — أضف منتجاً أولاً');
      return;
    }
    // الطلب العام: الاسم + الهاتف إلزاميان (الخادم يرفض بدونهما أيضاً)
    if (isPublic) {
      if (!customerName.trim()) {
        showToast('اكتب اسمك لإرسال الطلب');
        return;
      }
      if (!customerPhone.trim()) {
        showToast('اكتب رقم هاتفك لإرسال الطلب');
        return;
      }
    }
    if (editingId) {
      updateOrder.mutate({ id: editingId, items, note: notes.trim() || undefined });
    } else {
      createOrder.mutate({ items, note: notes.trim() || undefined });
    }
  };

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;

  const catalogMeta = catalogQuery.data?.meta;
  const catalogFrom = catalogMeta ? catalogMeta.per_page * (catalogMeta.current_page - 1) + 1 : 0;
  const catalogTo = catalogMeta ? Math.min(catalogMeta.per_page * catalogMeta.current_page, catalogMeta.total) : 0;

  const pendingSubmit = createOrder.isPending || updateOrder.isPending;

  return (
    <section className={cartEntries.length > 0 ? 'portal-order-has-cart' : undefined}>
      <div className="portal-order-main">
          {/* ─── كتالوج المنتجات ─── */}
          <div className="portal-store">
        <div className="portal-store-hd">
          <div className="portal-store-hd-t">
            <h2><i className="ti ti-building-store" /> كتالوج المنتجات</h2>
            <p>{catalogQuery.data ? `${catalogQuery.data.meta.total} منتج متوفر` : 'تصفّح المنتجات واختر ما يناسبك'}</p>
          </div>
          <div className="portal-search portal-search--lg">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="ابحث عن منتج بالاسم أو المرجع..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCatalogPage(1); }}
            />
            {search && (
              <button className="portal-search-x" onClick={() => { setSearch(''); setCatalogPage(1); }} type="button">
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        </div>

        {catalogQuery.isLoading ? (
          <PortalLoading text="جاري تحميل الكتالوج..." />
        ) : catalogQuery.isError || !catalogQuery.data ? (
          <PortalError message="تعذر تحميل كتالوج المنتجات" />
        ) : catalogQuery.data.data.length === 0 ? (
          <PortalEmpty icon="ti-package" text={search ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات'} />
        ) : (
          <>
            <div className="portal-catalog">
              {catalogQuery.data.data.map((p) => {
                const defaultPack = defaultPackagingFor(p);
                const selectedPack =
                  pkg[p.id] !== undefined ? pkg[p.id] : (defaultPack?.id ?? null);
                const factor = packFactorFor(p, selectedPack);
                const q = qty[p.id] ?? 1;
                const cl = lineCalc(p, selectedPack, q);
                const key = cartKey(p.id, selectedPack);
                const inCart = !!cart[key];
                const cartQty = inCart ? cart[key].quantity : q;
                const outOfStock = p.manages_stock && p.current_stock !== null && p.current_stock <= 0;
                const lowStock =
                  !outOfStock && p.manages_stock && p.current_stock !== null && p.current_stock <= 8;
                return (
                  <div key={p.id} className={`portal-prod${inCart ? ' on' : ''}${outOfStock ? ' oos' : ''}`}>
                    <div className={`portal-prod-img${outOfStock ? ' oos' : ''}`}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
                      )}
                      {cl.discount > 0 && cl.tier ? (
                        <span className="portal-prod-badge">
                          <i className="ti ti-discount-2" />
                          {cl.tier.discount_percentage !== null && cl.tier.discount_percentage > 0
                            ? `خصم ${cl.tier.discount_percentage}%`
                            : discountLabel(cl.tier)}
                        </span>
                      ) : null}
                      {inCart && (
                        <span className="portal-prod-incart">
                          <i className="ti ti-check" /> في السلة
                        </span>
                      )}
                      {outOfStock && (
                        <div className="portal-prod-oos">
                          <i className="ti ti-basket-off" /> نفد المخزون
                        </div>
                      )}
                      <div className="portal-prod-add">
                        {outOfStock ? (
                          <button
                            className="portal-prod-fab portal-prod-fab--off"
                            type="button"
                            disabled
                            aria-label="غير متوفر حالياً"
                          >
                            <i className="ti ti-basket-off" />
                          </button>
                        ) : inCart ? (
                          <div className="portal-prod-qty">
                            <button
                              type="button"
                              onClick={() => addToCart(p.id, cartQty - 1, selectedPack)}
                              disabled={cartQty <= 1}
                              aria-label="تقليل الكمية"
                            >
                              <i className="ti ti-minus" />
                            </button>
                            <input value={cartQty} readOnly tabIndex={-1} aria-label="الكمية" />
                            <button
                              type="button"
                              onClick={() => addToCart(p.id, cartQty + 1, selectedPack)}
                              aria-label="زيادة الكمية"
                            >
                              <i className="ti ti-plus" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="portal-prod-fab"
                            type="button"
                            onClick={() => addToCart(p.id, q, selectedPack)}
                            aria-label="أضف إلى السلة"
                          >
                            <i className="ti ti-plus" />
                            <span className="portal-prod-fab-txt">أضف إلى السلة</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="portal-prod-body">
                      <div className="portal-prod-name">{p.name}</div>
                      {p.ref && <div className="portal-prod-ref">{p.ref}</div>}

                      <div className="portal-prod-foot">
                        <div className="portal-prod-price">
                          {cl.discount > 0 && cl.tier ? (
                            <>
                              <span className="portal-prod-price-now">
                                {fmtMoney(cl.unitPrice - cl.discount / Math.max(1, q))}
                              </span>
                              <span className="portal-prod-price-old">{fmtMoney(cl.unitPrice)}</span>
                            </>
                          ) : (
                            <span className="portal-prod-price-now">{fmtMoney(cl.unitPrice)}</span>
                          )}
                          <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>
                        </div>
                        {cl.discount > 0 && cl.tier && (
                          <span className="portal-prod-save">
                            <i className="ti ti-discount-2" /> وفّر {fmtMoney(cl.discount)}
                          </span>
                        )}
                        <div className="portal-prod-meta">
                          {partyIsTvaExempt ? (
                            <span className="portal-prod-exempt">
                              <i className="ti ti-shield-check" /> معفى من TVA
                            </span>
                          ) : p.tva_rate > 0 ? (
                            <span className="portal-prod-tva">TVA {p.tva_rate}%</span>
                          ) : null}
                          {p.manages_stock && p.current_stock !== null && (
                            outOfStock ? (
                              <span className="portal-prod-stock out">
                                <i className="ti ti-alert-circle" /> نفد المخزون
                              </span>
                            ) : lowStock ? (
                              <span className="portal-prod-stock low">
                                <i className="ti ti-alert-triangle" /> كمية محدودة: {p.current_stock}
                              </span>
                            ) : (
                              <span className="portal-prod-stock">
                                <i className="ti ti-check" /> متوفر: {p.current_stock}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {p.has_packaging && p.packagings.length > 0 && (
                      <select
                        className="portal-prod-pkg"
                        value={selectedPack ?? ''}
                        disabled={outOfStock}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPkg((prev) => ({ ...prev, [p.id]: val === '' ? null : Number(val) }));
                        }}
                      >
                        <option value="">وحدة ({unitOf(p)})</option>
                        {p.packagings.map((pk) => (
                          <option key={pk.id} value={pk.id}>
                            {pk.label || pk.code || `×${pk.quantity}`} — {fmtMoney(pk.pack_price_ht)}
                          </option>
                        ))}
                      </select>
                    )}
                    {factor > 1 && !outOfStock && (
                      <div className="portal-prod-packinfo">
                        {cartQty} {selectedPack ? `×${factor}` : ''} = {cartQty * factor} {unitOf(p)}
                      </div>
                    )}
                    {p.discounts.length > 0 && (
                      <div className="portal-prod-discs">
                        {p.discounts.map((d) => {
                          const active = cl.tier?.id === d.id;
                          return (
                            <span key={d.id} className={`portal-disc-chip${active ? ' on' : ''}`}>
                              <i className="ti ti-discount-2" /> {discountLabel(d)} {tierHint(d)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {catalogMeta && catalogMeta.last_page > 1 && (
              <div className="portal-mt-16">
                <Pager
                  page={catalogMeta.current_page}
                  lastPage={catalogMeta.last_page}
                  total={catalogMeta.total}
                  from={catalogFrom}
                  to={catalogTo}
                  onChange={setCatalogPage}
                />
              </div>
            )}
          </>
        )}
      </div>

          {/* ─── تأكيد إرسال الطلب العام ─── */}
          {isPublic && submitted && createOrder.data && (
            <div className="portal-card portal-mt-16">
          <div className="portal-submit-ok">
            <i className="ti ti-circle-check" />
            <b>تم إرسال طلبك بنجاح</b>
            <div>
              رقم طلبك:{' '}
              <span className="portal-submit-ref">{createOrder.data.reference}</span>
            </div>
            <OrderPipeline status={createOrder.data.status} />
            <div className="portal-submit-hint">
              يمكنك متابعة حالة طلبك لاحقاً من صفحة{' '}
              <Link to={`/portal/${slug}/track`}>تتبع طلبك</Link> برقم هاتفك
              {createOrder.data.notes ? <> — ملاحظتك مسجّلة: «{createOrder.data.notes}»</> : null}
            </div>
          </div>
          </div>
        )}
        </div>

      {/* ─── سلة الطلب — درج جانبي منزلق كتصاميم المتاجر ─── */}
      {drawerOpen && (
        <div className="portal-drawer">
          <div className="portal-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="portal-cart-drawer" role="dialog" aria-modal="true" aria-label="سلة الطلب">
            <div className="portal-drawer-hd">
              <h3>
                <i className={checkoutStep ? 'ti ti-shopping-cart-check' : 'ti ti-basket'} />
                {checkoutStep
                  ? (editingId ? 'حفظ التعديلات' : 'إتمام الطلب')
                  : (editingId ? 'تعديل الطلب' : 'سلة الطلب')}
                {!checkoutStep && cartEntries.length > 0 && (
                  <span className="portal-drawer-count">{cartEntries.length}</span>
                )}
              </h3>
              <button className="portal-drawer-x" type="button" onClick={() => setDrawerOpen(false)} aria-label="إغلاق السلة">
                <i className="ti ti-x" />
              </button>
            </div>

            {checkoutStep ? (
              <div className="portal-drawer-body">
                {/* الخطوة التالية: بيانات الزبون + الملاحظات */}
                {isPublic && (
                  <div className="portal-customer-fields">
                    <div className="portal-customer-field">
                      <input
                        className="portal-form-input"
                        placeholder="الاسم الكامل *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="portal-customer-field">
                      <input
                        className="portal-form-input"
                        placeholder="رقم الهاتف *"
                        dir="ltr"
                        inputMode="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div className="portal-customer-field">
                      <input
                        className="portal-form-input"
                        placeholder="العنوان (اختياري)"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <textarea
                  className="portal-form-input"
                  placeholder="ملاحظات (اختياري): مثلاً تاريخ التسليم المفضل..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
                <div className="portal-checkout-review">
                  {cartEntries.map(({ key, product, entry }) => {
                    const cl = lineCalc(product, entry.packaging_id, entry.quantity);
                    return (
                      <div key={key} className="portal-cart-item portal-cart-item--ro">
                        <div className="portal-cart-thumb">
                          {product.image ? (
                            <img src={product.image} alt="" loading="lazy" />
                          ) : (
                            <i className="ti ti-package" />
                          )}
                        </div>
                        <div className="portal-cart-info">
                          <div className="portal-prod-name">{product.name}</div>
                          <div className="portal-prod-ref">
                            {entry.quantity} × {fmtMoney(cl.unitPrice)}
                            {cl.factor > 1 ? ` ×${cl.factor}` : ''}
                            {`/${unitLabelFor(product, entry.packaging_id)}`}
                          </div>
                        </div>
                        <div className="portal-cart-total">{fmtMoney(cl.ttc)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="portal-cart-actions">
                  <button
                    className="portal-btn portal-btn--ghost"
                    disabled={pendingSubmit}
                    onClick={() => setCheckoutStep(false)}
                    type="button"
                  >
                    <i className="ti ti-arrow-right" /> رجوع إلى السلة
                  </button>
                  <button
                    className="portal-btn portal-btn--em"
                    disabled={pendingSubmit || cartEntries.length === 0}
                    onClick={submitCart}
                    type="button"
                  >
                    {pendingSubmit ? (
                      <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</>
                    ) : editingId ? (
                      <><i className="ti ti-device-floppy" /> حفظ التعديلات</>
                    ) : (
                      <><i className="ti ti-send" /> إرسال الطلب</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="portal-cart-scroll">
                  {cartEntries.length === 0 ? (
                    <PortalEmpty icon="ti-basket" text={editingId ? 'هذا الطلب لا يحتوي على منتجات' : 'لم تضف أي منتج بعد'} />
                  ) : (
                    <div className="portal-cart">
                      {cartEntries.map(({ key, product, entry }) => {
                        const cl = lineCalc(product, entry.packaging_id, entry.quantity);
                        return (
                          <div key={key} className="portal-cart-item">
                            <div className="portal-cart-thumb">
                              {product.image ? (
                                <img src={product.image} alt="" loading="lazy" />
                              ) : (
                                <i className="ti ti-package" />
                              )}
                            </div>
                            <div className="portal-cart-info">
                              <div className="portal-prod-name">{product.name}</div>
                              <div className="portal-prod-ref">
                                {fmtMoney(cl.unitPrice)}
                                {cl.factor > 1 ? ` ×${cl.factor}` : ''}
                                {`/${unitLabelFor(product, entry.packaging_id)}`}
                                {partyIsTvaExempt ? ' • معفى من TVA' : product.tva_rate > 0 ? ` • TVA ${product.tva_rate}%` : ''}
                              </div>
                              {cl.discount > 0 && cl.tier && (
                                <div className="portal-cart-disc">
                                  <i className="ti ti-discount-2" />
                                  خصم {discountLabel(cl.tier)} <span>-{fmtMoney(cl.discount)}</span>
                                </div>
                              )}
                            </div>
                            <div className="portal-prod-qty">
                              <button type="button" onClick={() => updateCartQty(key, entry.quantity - 1)} disabled={entry.quantity <= 1}>
                                <i className="ti ti-minus" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={entry.quantity}
                                onChange={(e) => updateCartQty(key, Number(e.target.value))}
                              />
                              <button type="button" onClick={() => updateCartQty(key, entry.quantity + 1)}>
                                <i className="ti ti-plus" />
                              </button>
                            </div>
                            <div className="portal-cart-total">{fmtMoney(cl.ttc)}</div>
                            <button className="portal-cart-x" type="button" onClick={() => handleRemoveItem(key, product.name)} title="إزالة">
                              <i className="ti ti-x" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="portal-drawer-foot">
                  <div className="portal-checkout-total">
                    <span>المجموع (TTC)</span>
                    <b>{fmtMoney(totals.ttc)}</b>
                  </div>
                  <button
                    className="portal-btn portal-btn--em portal-btn--block"
                    type="button"
                    disabled={cartEntries.length === 0}
                    onClick={() => setCheckoutStep(true)}
                  >
                    <i className="ti ti-shopping-cart-check" />
                    {editingId ? 'متابعة الحفظ' : 'إتمام الطلب'}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {cartEntries.length > 0 && (
        <button className="portal-mobile-cart-bar" onClick={() => { setCheckoutStep(false); setDrawerOpen(true); }} type="button">
          <i className="ti ti-basket" />
          <span>{cartEntries.length} صنف</span>
          <b>{fmtMoney(totals.ttc)}</b>
          <span className="portal-mobile-cart-bar-go"><i className="ti ti-shopping-cart" /> عرض السلة</span>
        </button>
      )}

      {/* ─── طلباتي ─── */}
      {!isPublic && (
      <div className="portal-card portal-mt-22">
        <div className="portal-card-hd">
          <h3><i className="ti ti-clipboard-list" /> طلباتي</h3>
          <span className="portal-hd-count">{meta?.total ?? 0} طلب</span>
        </div>

        <div className="portal-toolbar portal-toolbar--tight">
          <div className="portal-filters" role="tablist" aria-label="تصفية حسب الحالة">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`portal-tab${statusFilter === tab.key ? ' on' : ''}`}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <PortalLoading text="جاري تحميل طلباتك..." />
        ) : ordersQuery.isError || !ordersQuery.data ? (
          <PortalError message="تعذر تحميل الطلبات" />
        ) : orders.length === 0 ? (
          <PortalEmpty icon="ti-clipboard-list" text="لا توجد طلبات بهذه الحالة" />
        ) : (
          <>
            <div className="portal-order-list">
              {orders.map((o) => (
                <div key={o.id} className="portal-order">
                  <button
                    className="portal-order-hd"
                    type="button"
                    onClick={() => setSubmitted(submitted === o.id ? null : o.id)}
                  >
                    <div className="portal-order-info">
                      <div className="portal-order-ref">{o.reference}</div>
                      <div className="portal-prod-ref">{fmtDate(o.requested_at || o.created_at)} • {o.items_count} صنف</div>
                    </div>
                    <div className="portal-order-side">
                      <span className={`badge ${STATUS_STYLE[o.status]}`}>{o.status_label}</span>
                      <span className="portal-order-amt">{fmtMoneySigned(o.total_ttc)}</span>
                      <i className={`ti ti-chevron-${submitted === o.id ? 'up' : 'down'}`} />
                    </div>
                  </button>
                  {submitted === o.id && (
                    <div className="portal-order-detail">
                      <OrderPipeline status={o.status} />
                      {(o.lines ?? []).map((it) => {
                        const factor = it.pack_qty > 1 ? it.pack_qty : 1;
                        return (
                          <div key={`${it.product_id}-${it.packaging_id ?? 0}`} className="portal-cart-item portal-cart-item--ro">
                            <div className="portal-cart-info">
                              <div className="portal-prod-name">{it.product_name}</div>
                              <div className="portal-prod-ref">
                                {fmtMoney(it.unit_price_ht)}
                                {factor > 1 ? ` ×${factor}` : ''}
                                {`/${it.unit_name || 'وحدة'}`}
                                {it.tva_rate > 0 ? ` • TVA ${it.tva_rate}%` : ''} • ×{it.quantity}
                              </div>
                              {it.discount_percentage > 0 || it.total_discount_amount > 0 ? (
                                <div className="portal-cart-disc">
                                  <i className="ti ti-discount-2" />
                                  خصم {it.discount_percentage > 0 ? `${it.discount_percentage}%` : ''}
                                  {it.total_discount_amount > 0 ? (
                                    <span>-{fmtMoney(it.total_discount_amount)}</span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className="portal-cart-total">{fmtMoney(it.total_ttc)}</div>
                          </div>
                        );
                      })}
                      {o.total_discount > 0 && (
                        <div className="portal-order-disc">
                          <i className="ti ti-discount-2" />
                          إجمالي الخصم في الطلب: <b>-{fmtMoney(o.total_discount)}</b>
                        </div>
                      )}
                      {o.notes && <div className="portal-order-notes">ملاحظات: {o.notes}</div>}

                      {(o.status === 'preparing') && (
                        <div className="portal-order-actions">
                          <button
                            className="portal-btn portal-btn--sm portal-btn--em"
                            onClick={() => handleValidateOrder(o)}
                            type="button"
                            disabled={validateOrder.isPending}
                          >
                            <i className="ti ti-circle-check" /> تأكيد الطلب
                          </button>
                          <button
                            className="portal-btn portal-btn--sm"
                            onClick={() => startEdit(o)}
                            type="button"
                            disabled={pendingSubmit}
                          >
                            <i className="ti ti-edit" /> تعديل
                          </button>
                          <button
                            className="portal-btn portal-btn--sm portal-btn--danger"
                            onClick={() => handleCancelOrder(o)}
                            type="button"
                            disabled={cancelOrder.isPending}
                          >
                            <i className="ti ti-x" /> إلغاء الطلب
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {meta && meta.last_page > 1 && (
              <Pager
                page={meta.current_page}
                lastPage={meta.last_page}
                total={meta.total}
                from={from}
                to={to}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
      )}

      {toast && <div className="portal-toast"><i className="ti ti-circle-check" /> {toast}</div>}
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}
