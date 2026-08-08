// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersPage.tsx — وصل طلب سلعة (كتالوج + سلة + طلباتي)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalCatalogItem, type PortalCatalogPackaging, type PortalCatalogDiscount, type PortalOrder } from '@/lib/api/portal/portal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { proxyImage } from '@/lib/api/imageProxy';
import OrderPipeline from './OrderPipeline';
import {
  fmtMoney, Pager,
  PortalLoading, PortalError, PortalEmpty,
} from './portalUtils';

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
  const [catalogPage, setCatalogPage] = useState(1);
  const [toast, setToast] = useState('');
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // نافذة تفاصيل المنتج — تُفتح عند النقر على بطاقة الكتالوج (صورة + خصم + تعبئة + كل المعلومات)
  const [infoProductId, setInfoProductId] = useState<number | null>(null);
  // معاينة الصورة بملء الشاشة (Lightbox) — تُفتح بالنقر على صورة النافذة
  const [pimZoom, setPimZoom] = useState(false);

  // قفل تمرير الصفحة خلف النافذة/الـ Lightbox + إغلاقها بمفتاح Escape
  // (يُغلق الـ Lightbox أولاً ثم نافذة التفاصيل ثم درج السلة).
  useEffect(() => {
    if (infoProductId === null && !pimZoom && !drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pimZoom) setPimZoom(false);
      else if (infoProductId !== null) setInfoProductId(null);
      else setDrawerOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [infoProductId, pimZoom, drawerOpen]);

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

  const handleClearCart = async () => {
    if (cartEntries.length === 0) return;
    const ok = await confirm('إفراغ سلة الطلب من كل المنتجات؟', {
      title: 'إفراغ السلة',
      confirmText: 'إفراغ',
      cancelText: 'إلغاء',
      variant: 'danger',
      icon: 'ti-trash',
    });
    if (ok) setCart({});
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

  // إعدادات البوابة العامة — تُستخدم لتوجيه الواجهة قبل أي إرسال:
  //   - can_order: هل يستطيع الزائر/المسجّل الحالي إرسال الطلبات فعلاً؟
  //   - min/max: تحقق مسبق على العميل قبل أن يرفض الخادم (409/422)
  //   - رسالة التأكيد المخصصة بعد إرسال ناجح
  const configQuery = useQuery({
    queryKey: ['portal', slug, 'config'],
    queryFn: () => portalApi.config(),
    staleTime: 60_000,
  });

  const cfg = configQuery.data;
  const canOrder = cfg?.can_order ?? true;
  const confirmationMessage = (cfg?.order_confirmation_message ?? '').trim();

  // إعدادات عرض الكتالوج — تتحكم في ما يظهر للزبون (تُقرأ من /portal/config
  // ويديرها المسؤول في تبويب الإعدادات «إعدادات عرض الكتالوج»).
  const showStock = cfg?.show_stock ?? true;
  const showPrice = cfg?.show_price ?? true;
  const showRef = cfg?.show_ref ?? true;
  const showUnit = cfg?.show_unit ?? true;
  const showPackaging = cfg?.show_packaging ?? true;
  const allowChangePackaging = cfg?.allow_change_packaging ?? true;
  const showDiscounts = cfg?.show_discounts ?? true;
  const showTva = cfg?.show_tva ?? true;
  const showSearch = cfg?.show_search ?? true;
  const hideOutOfStock = cfg?.hide_out_of_stock ?? false;
  const showIncartBadge = cfg?.show_incart_badge ?? true;
  const showNotes = cfg?.show_notes ?? true;

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
      setCatalogPage(1);
      setDrawerOpen(false);
      setCheckoutStep(false);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      if (isPublic) {
        // الزائر ليس لديه حساب — ننقله فوراً لصفحة التتبع مع رقم هاتفه ومرجع
        // الطلب مملوءين مسبقاً (ويعمل البحث تلقائياً هناك).
        navigate(`/portal/${slug}/track`, {
          state: { phone: customerPhone.trim(), reference: order.reference },
          replace: true,
        });
        return;
      }
      showToast(confirmationMessage || 'تم إرسال طلب السلعة بنجاح');
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
      showToast(confirmationMessage || 'تم تحديث طلب السلعة بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تحديث الطلب'),
  });

  const byId = useMemo(() => {
    const m = new Map<number, PortalCatalogItem>();
    (catalogQuery.data?.data ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [catalogQuery.data]);

  // قائمة البطاقات المعروضة — عند تفعيل «إخفاء المنتجات النافدة» تُستبعد
  // المنتجات غير المتوفرة من العرض (يبقى byId كاملاً لتعمل السلة على أي
  // منتج أُضيف قبل نفاده).
  const visibleItems = useMemo(() => {
    const items = catalogQuery.data?.data ?? [];
    if (!hideOutOfStock) return items;
    return items.filter(
      (p) => !(p.manages_stock && p.current_stock !== null && p.current_stock <= 0),
    );
  }, [catalogQuery.data, hideOutOfStock]);

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
      ? `خصم ${d.discount_amount} دج/وحدة`
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

  const location = useLocation();
  const navigate = useNavigate();
  const appliedEditRef = useRef<number | null>(null);
  // القدوم من صفحة «طلباتي» (تعديل): يُحمّل الطلب في السلة ويفتح الدرج ثم يمسح
  // حالة التنقل حتى لا يعيد فتحه عند العودة أو تحديث الصفحة.
  useEffect(() => {
    const st = location.state as { editOrder?: PortalOrder } | null;
    const editOrder = st?.editOrder;
    if (editOrder && appliedEditRef.current !== editOrder.id) {
      appliedEditRef.current = editOrder.id;
      startEdit(editOrder);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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
    // تحقق مسبق قبل إرسال الطلب — نفس الأذونات/الحدود التي يطبّقها الخادم:
    // حتى لو تجاوزتها، يرفض الخادم برسالة واضحة (لا نفقد السلة).
    // عند إخفاء الأسعار لا يمكن التحقق من المبالغ مسبقاً (لا تُعرض للزبون)
    // لذلك نترك التحقق من الحدود للخادم الذي يبقى المرجع الوحيد.
    if (!canOrder) {
      showToast(cfg?.enabled ? 'إرسال الطلبات معطل حالياً' : 'إرسال الطلبات معطل حالياً من طرف المؤسسة');
      return;
    }
    if (showPrice) {
      if (cfg?.min_order_amount && cfg.min_order_amount > 0 && totals.ttc < cfg.min_order_amount) {
        showToast(`قيمة الطلب أقل من الحد الأدنى المسموح به (${fmtMoney(cfg.min_order_amount)} دج).`);
        return;
      }
      if (cfg?.max_order_amount && cfg.max_order_amount > 0 && totals.ttc > cfg.max_order_amount) {
        showToast(`تجاوزت قيمة الطلب الحد الأقصى المسموح به (${fmtMoney(cfg.max_order_amount)} دج).`);
        return;
      }
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
          {showSearch && (
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
          )}
        </div>

        {cfg && !canOrder && (
          <div className="portal-blocked-banner">
            <i className={cfg.enabled ? 'ti ti-user-off' : 'ti ti-basket-off'} />
            <span>
              {cfg.enabled
                ? (cfg.authenticated
                    ? 'إرسال الطلبات معطل حالياً على حسابك — تواصل مع المؤسسة لتفعيله.'
                    : 'إرسال الطلبات من الزوار معطل حالياً.')
                : 'إرسال الطلبات معطل حالياً من طرف المؤسسة.'}
            </span>
          </div>
        )}

        {catalogQuery.isLoading ? (
          <PortalLoading text="جاري تحميل الكتالوج..." />
        ) : catalogQuery.isError || !catalogQuery.data ? (
          <PortalError message="تعذر تحميل كتالوج المنتجات" />
        ) : catalogQuery.data.data.length === 0 || visibleItems.length === 0 ? (
          <PortalEmpty icon="ti-package" text={search ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات'} />
        ) : (
          <>
            <div className="portal-catalog">
              {visibleItems.map((p) => {
                const defaultPack = defaultPackagingFor(p);
                // عند إخفاء التعبئة (أو منع تغييرها) تُجبر التعبئة الافتراضية فقط
                // «وحدة» ليست خياراً للمنتجات ذات التعبئات — إن مُنعت مسبقاً تعود للتعبئة الافتراضية.
                const canSwitchPack = showPackaging && allowChangePackaging;
                const selectedPack =
                  canSwitchPack && pkg[p.id] != null
                    ? pkg[p.id]
                    : (defaultPack?.id ?? null);
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
                  <div
                    key={p.id}
                    className={`portal-prod portal-prod--info${inCart ? ' on' : ''}${outOfStock ? ' oos' : ''}`}
                    onClick={() => setInfoProductId(p.id)}
                    aria-label={`عرض تفاصيل ${p.name}`}
                  >
                    <div className={`portal-prod-img${outOfStock ? ' oos' : ''}`}>
                      {p.image ? (
                        <img src={proxyImage(p.image) ?? p.image} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
                      )}
                      <button
                        type="button"
                        className="portal-prod-zoom"
                        onClick={(e) => { e.stopPropagation(); setInfoProductId(p.id); }}
                        aria-label={`تكبير ${p.name}`}
                        title="عرض التفاصيل"
                      >
                        <i className="ti ti-arrows-maximize" />
                      </button>
                      {showDiscounts && p.discounts.length > 0 && (
                        <div className="portal-prod-discs portal-prod-discs--ov">
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
                      {showDiscounts && cl.discount > 0 && cl.tier ? (
                        <span className="portal-prod-badge">
                          <i className="ti ti-discount-2" />
                          {cl.tier.discount_percentage !== null && cl.tier.discount_percentage > 0
                            ? `خصم ${cl.tier.discount_percentage}%`
                            : discountLabel(cl.tier)}
                        </span>
                      ) : null}
                      {showIncartBadge && inCart && (
                        <span className="portal-prod-incart">
                          <i className="ti ti-check" /> في السلة
                        </span>
                      )}
                      {outOfStock && (
                        <div className="portal-prod-oos">
                          <i className="ti ti-basket-off" /> نفد المخزون
                        </div>
                      )}
                      <div className="portal-prod-add" onClick={(e) => e.stopPropagation()}>
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
                            <input
                              type="number"
                              min={1}
                              value={cartQty}
                              onChange={(e) => {
                                const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                                updateCartQty(key, n);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label="الكمية"
                            />
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
                            className={`portal-prod-fab${!canOrder ? ' portal-prod-fab--off' : ''}`}
                            type="button"
                            onClick={() => addToCart(p.id, q, selectedPack)}
                            disabled={!canOrder}
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
                      {showRef && p.ref && <div className="portal-prod-ref">{p.ref}</div>}

                      <div className="portal-prod-foot">
                        {showPrice ? (
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
                            {showUnit && <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>}
                          </div>
                        ) : (
                          <div className="portal-prod-price">
                            {showUnit && <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>}
                          </div>
                        )}
                        {showDiscounts && showPrice && cl.discount > 0 && cl.tier && (
                          <span className="portal-prod-save">
                            <i className="ti ti-discount-2" /> وفّر {fmtMoney(cl.discount)}
                          </span>
                        )}
                        <div className="portal-prod-meta">
                          {showTva &&
                            (partyIsTvaExempt ? (
                              <span className="portal-prod-exempt">
                                <i className="ti ti-shield-check" /> معفى من TVA
                              </span>
                            ) : p.tva_rate > 0 ? (
                              <span className="portal-prod-tva">TVA {p.tva_rate}%</span>
                            ) : null)}
                          {showStock && p.manages_stock && p.current_stock !== null && (
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

                    {showPackaging && p.has_packaging && p.packagings.length > 0 && (
                      <select
                        className="portal-prod-pkg"
                        value={selectedPack ?? ''}
                        disabled={outOfStock || !canSwitchPack}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPkg((prev) => ({ ...prev, [p.id]: val === '' ? null : Number(val) }));
                        }}
                      >
                        {p.packagings.map((pk) => (
                          <option key={pk.id} value={pk.id}>
                            {pk.label || pk.code || `×${pk.quantity}`}
                            {showPrice ? ` — ${fmtMoney(pk.pack_price_ht)}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {showPackaging && factor > 1 && !outOfStock && (
                      <div className="portal-prod-packinfo">
                        {cartQty} {selectedPack ? `×${factor}` : ''} = {cartQty * factor} {unitOf(p)}
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
            {confirmationMessage && (
              <div className="portal-submit-msg">{confirmationMessage}</div>
            )}
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

      {/* ─── نافذة تفاصيل المنتج (صورة + خصم + تعبئة + كل المعلومات) ─── */}
      {infoProductId !== null && byId.has(infoProductId) && (() => {
        const p = byId.get(infoProductId)!;
        const canSwitchPack = showPackaging && allowChangePackaging;
        const selectedPack =
          canSwitchPack && pkg[p.id] != null
            ? pkg[p.id]
            : (defaultPackagingFor(p)?.id ?? null);
        const factor = packFactorFor(p, selectedPack);
        const q = qty[p.id] ?? 1;
        const cl = lineCalc(p, selectedPack, q);
        const key = cartKey(p.id, selectedPack);
        const inCart = !!cart[key];
        const cartQty = inCart ? cart[key].quantity : q;
        const outOfStock = p.manages_stock && p.current_stock !== null && p.current_stock <= 0;
        const lowStock =
          !outOfStock && p.manages_stock && p.current_stock !== null && p.current_stock <= 8;
        const step = inCart ? cartQty : q;
        return (
          <div className="portal-pim" role="dialog" aria-modal="true" aria-label={`تفاصيل ${p.name}`}>
            <div className="portal-pim-backdrop" onClick={() => setInfoProductId(null)} />
            <div className="portal-pim-card">
              <button className="portal-pim-x" type="button" onClick={() => setInfoProductId(null)} aria-label="إغلاق تفاصيل المنتج">
                <i className="ti ti-x" />
              </button>

              <div className={`portal-pim-gallery${outOfStock ? ' oos' : ''}`}>
                {p.image ? (
                  <button
                    type="button"
                    className="portal-pim-gallery-img"
                    onClick={() => setPimZoom(true)}
                    aria-label={`تكبير صورة ${p.name}`}
                    title="اضغط لعرض الصورة بملء الشاشة"
                  >
                    <img src={proxyImage(p.image, 600) ?? p.image} alt={p.name} loading="lazy" />
                    <span className="portal-pim-gallery-zoom"><i className="ti ti-zoom-in" /></span>
                  </button>
                ) : (
                  <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
                )}
                {showDiscounts && cl.discount > 0 && cl.tier && (
                  <span className="portal-prod-badge">
                    <i className="ti ti-discount-2" />
                    {cl.tier.discount_percentage !== null && cl.tier.discount_percentage > 0
                      ? `خصم ${cl.tier.discount_percentage}%`
                      : discountLabel(cl.tier)}
                  </span>
                )}
                {outOfStock && (
                  <div className="portal-pim-oos">
                    <i className="ti ti-basket-off" /> نفد المخزون
                  </div>
                )}
              </div>

              <div className="portal-pim-info">
                <div className="portal-pim-name">{p.name}</div>
                <div className="portal-pim-ids">
                  {p.ref ? (
                    <span><i className="ti ti-hash" /> {p.ref}</span>
                  ) : null}
                  {p.barcode ? (
                    <span dir="ltr"><i className="ti ti-barcode" /> {p.barcode}</span>
                  ) : null}
                </div>

                {showPrice && (
                  <div className="portal-pim-price-row">
                    <div className="portal-pim-price">
                      {cl.discount > 0 && cl.tier ? (
                        <>
                          <span className="portal-prod-price-old">{fmtMoney(cl.unitPrice)}</span>
                          <span className="portal-prod-price-now">
                            {fmtMoney(cl.unitPrice - cl.discount / Math.max(1, q))}
                          </span>
                        </>
                      ) : (
                        <span className="portal-prod-price-now">{fmtMoney(cl.unitPrice)}</span>
                      )}
                      {showUnit && <span className="portal-prod-unit">{unitLabelFor(p, selectedPack)}</span>}
                    </div>
                    {showDiscounts && cl.discount > 0 && cl.tier && (
                      <span className="portal-pim-save">
                        <i className="ti ti-discount-2" /> وفّر {fmtMoney(cl.discount)}
                      </span>
                    )}
                  </div>
                )}

                <div className="portal-pim-status">
                  {showTva && (partyIsTvaExempt ? (
                    <span className="portal-prod-exempt"><i className="ti ti-shield-check" /> معفى من TVA</span>
                  ) : p.tva_rate > 0 ? (
                    <span className="portal-pim-chip"><i className="ti ti-percentage" /> TVA {p.tva_rate}%</span>
                  ) : null)}
                  {showStock && p.manages_stock && p.current_stock !== null && (
                    outOfStock ? (
                      <span className="portal-prod-stock out"><i className="ti ti-alert-circle" /> نفد المخزون</span>
                    ) : lowStock ? (
                      <span className="portal-prod-stock low"><i className="ti ti-alert-triangle" /> كمية محدودة: {p.current_stock}</span>
                    ) : (
                      <span className="portal-prod-stock"><i className="ti ti-check" /> متوفر: {p.current_stock}</span>
                    )
                  )}
                </div>

                {showPackaging && (
                  <div className="portal-pim-sec">
                    <div className="portal-pim-sec-t">
                      <i className="ti ti-box" /> {p.packagings.length > 0 ? 'اختر التعبئة' : 'التعبئة'}
                    </div>
                    <div className="portal-pim-packs">
                      {p.packagings.length === 0 ? (
                        <button
                          type="button"
                          className={`portal-pim-pack${selectedPack === null ? ' on' : ''}`}
                          disabled={outOfStock}
                          onClick={() => setPkg((prev) => ({ ...prev, [p.id]: null }))}
                        >
                          <span className="portal-pim-pack-n">وحدة</span>
                          <span className="portal-pim-pack-s">{unitOf(p)}</span>
                          {showPrice && <span className="portal-pim-pack-p">{fmtMoney(p.unit_price_ht)}</span>}
                        </button>
                      ) : (
                        p.packagings.map((pk) => (
                          <button
                            key={pk.id}
                            type="button"
                            className={`portal-pim-pack${selectedPack === pk.id ? ' on' : ''}`}
                            disabled={outOfStock || !canSwitchPack}
                            onClick={() => setPkg((prev) => ({ ...prev, [p.id]: pk.id }))}
                          >
                            <span className="portal-pim-pack-n">{pk.label || pk.code || `×${pk.quantity}`}</span>
                            <span className="portal-pim-pack-s">× {pk.quantity} {unitOf(p)}</span>
                            {showPrice && <span className="portal-pim-pack-p">{fmtMoney(pk.pack_price_ht)}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {showDiscounts && p.discounts.length > 0 && (
                  <div className="portal-pim-sec">
                    <div className="portal-pim-sec-t"><i className="ti ti-discount-2" /> خصومات الكمية</div>
                    <div className="portal-pim-discs">
                      {p.discounts.map((d) => {
                        const active = cl.tier?.id === d.id;
                        return (
                          <span key={d.id} className={`portal-disc-chip${active ? ' on' : ''}`}>
                            <i className="ti ti-discount-2" /> {discountLabel(d)} <b>{tierHint(d)}</b>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="portal-pim-cta">
                  <div className="portal-pim-qtywrap">
                    <span className="portal-pim-qty-lbl">الكمية</span>
                    <div className="portal-prod-qty">
                      <button
                        type="button"
                        onClick={() => addToCart(p.id, step - 1, selectedPack)}
                        disabled={step <= 1}
                        aria-label="تقليل الكمية"
                      >
                        <i className="ti ti-minus" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={step}
                        onChange={(e) => {
                          const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                          if (inCart) updateCartQty(key, n);
                          else setQty((prev) => ({ ...prev, [p.id]: n }));
                        }}
                        aria-label="الكمية"
                      />
                      <button
                        type="button"
                        onClick={() => addToCart(p.id, step + 1, selectedPack)}
                        aria-label="زيادة الكمية"
                      >
                        <i className="ti ti-plus" />
                      </button>
                    </div>
                    {factor > 1 && (
                      <span className="portal-pim-eq">= {step * factor} {unitOf(p)}</span>
                    )}
                  </div>
                  {outOfStock ? (
                    <button className="portal-pim-add off" type="button" disabled>
                      <i className="ti ti-basket-off" /> غير متوفر حالياً
                    </button>
                  ) : inCart ? (
                    <button className="portal-pim-add in" type="button" onClick={() => setInfoProductId(null)}>
                      <i className="ti ti-check" /> أُضيف إلى السلة — موافق
                    </button>
                  ) : (
                    <button
                      className={`portal-pim-add${!canOrder ? ' off' : ''}`}
                      type="button"
                      disabled={!canOrder}
                      onClick={() => { addToCart(p.id, q, selectedPack); setInfoProductId(null); }}
                    >
                      <i className="ti ti-basket-plus" /> أضف إلى السلة
                    </button>
                  )}
                </div>
                {!canOrder && (
                  <div className="portal-pim-note">
                    <i className="ti ti-info-circle" /> إرسال الطلبات معطل حالياً — يمكنك تصفح المنتجات فقط.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Lightbox — صورة المنتج بملء الشاشة ─── */}
      {pimZoom && infoProductId !== null && byId.has(infoProductId) && (() => {
        const p = byId.get(infoProductId)!;
        return (
          <div className="portal-pim-lb" role="dialog" aria-modal="true" aria-label={`معاينة صورة ${p.name}`}>
            <div className="portal-pim-lb-backdrop" onClick={() => setPimZoom(false)} />
            <button className="portal-pim-lb-x" type="button" onClick={() => setPimZoom(false)} aria-label="إغلاق المعاينة">
              <i className="ti ti-x" />
            </button>
            <figure className="portal-pim-lb-fig">
              {p.image ? (
                <img src={proxyImage(p.image, 1400) ?? p.image} alt={p.name} />
              ) : (
                <div className="portal-prod-img-fb"><i className="ti ti-package" /></div>
              )}
              <figcaption className="portal-pim-lb-cap">
                <b>{p.name}</b>
                {showPrice && (
                  <span>
                    {fmtMoney(unitPriceFor(p, pkg[p.id] ?? null))}
                    {showUnit && `/${unitLabelFor(p, pkg[p.id] ?? null)}`}
                  </span>
                )}
              </figcaption>
            </figure>
          </div>
        );
      })()}

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
              {!checkoutStep && (
                <span className="portal-drawer-actions">
                  {showNotes && !isPublic && (
                    <button
                      className={`portal-drawer-act${noteOpen ? ' is-on' : ''}`}
                      type="button"
                      title={noteOpen ? 'إخفاء الملاحظة' : 'إضافة ملاحظة'}
                      onClick={() => setNoteOpen((v) => !v)}
                    >
                      <i className="ti ti-note" />
                    </button>
                  )}
                  {cartEntries.length > 0 && (
                    <button
                      className="portal-drawer-act portal-drawer-act--del"
                      type="button"
                      title="إفراغ السلة"
                      onClick={() => handleClearCart()}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  )}
                  <button className="portal-drawer-x" type="button" onClick={() => setDrawerOpen(false)} aria-label="إغلاق السلة">
                    <i className="ti ti-x" />
                  </button>
                </span>
              )}
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
                {showNotes && (
                  <textarea
                    className="portal-form-input"
                    placeholder="ملاحظات (اختياري): مثلاً تاريخ التسليم المفضل..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                )}
                <div className="portal-checkout-review">
                  {cartEntries.map(({ key, product, entry }) => {
                    const cl = lineCalc(product, entry.packaging_id, entry.quantity);
                    return (
                      <div key={key} className="portal-cart-item portal-cart-item--ro">
                        <div className="portal-cart-thumb">
                          {product.image ? (
                            <img src={proxyImage(product.image) ?? product.image} alt="" loading="lazy" />
                          ) : (
                            <i className="ti ti-package" />
                          )}
                        </div>
                        <div className="portal-cart-info">
                          <div className="portal-prod-name">{product.name}</div>
                          <div className="portal-prod-ref">
                            {showPrice ? (
                              <>
                                {entry.quantity} × {fmtMoney(cl.unitPrice)}
                                {cl.factor > 1 ? ` ×${cl.factor}` : ''}
                              </>
                            ) : (
                              <>{entry.quantity}{cl.factor > 1 ? ` × ${cl.factor}` : ''}</>
                            )}
                            {`/${unitLabelFor(product, entry.packaging_id)}`}
                          </div>
                        </div>
                        {showPrice && <div className="portal-cart-total">{fmtMoney(cl.ttc)}</div>}
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
                {!isPublic && (
                  <div className={`portal-cart-note${noteOpen ? ' is-open' : ''}`}>
                    <div className="portal-cart-note-hd" onClick={() => setNoteOpen((v) => !v)} role="button" aria-expanded={noteOpen}>
                      <i className="ti ti-note" />
                      <span>ملاحظة الطلب</span>
                      <i className="ti ti-chevron-down portal-cart-note-caret" />
                    </div>
                    <textarea
                      className="portal-form-input"
                      placeholder="اكتب ملاحظتك هنا... (سيتم إرسالها مع الطلب)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
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
                                <img src={proxyImage(product.image) ?? product.image} alt="" loading="lazy" />
                              ) : (
                                <i className="ti ti-package" />
                              )}
                            </div>
                            <div className="portal-cart-info">
                              <div className="portal-prod-name">{product.name}</div>
                              <div className="portal-prod-ref">
                                {showPrice ? (
                                  <>
                                    {entry.quantity} × {fmtMoney(cl.unitPrice)}
                                    {cl.factor > 1 ? ` ×${cl.factor}` : ''}
                                  </>
                                ) : (
                                  <>
                                    {entry.quantity}
                                    {cl.factor > 1 ? ` × ${cl.factor}` : ''}
                                  </>
                                )}
                                {`/${unitLabelFor(product, entry.packaging_id)}`}
                                {showTva &&
                                  (partyIsTvaExempt
                                    ? ' • معفى من TVA'
                                    : product.tva_rate > 0
                                      ? ` • TVA ${product.tva_rate}%`
                                      : '')}
                              </div>
                              {showDiscounts && showPrice && cl.discount > 0 && cl.tier && (
                                <div className="portal-cart-disc">
                                  <i className="ti ti-discount-2" />
                                  <span className="portal-cart-disc-txt">{discountLabel(cl.tier)}</span>
                                  <span>-{fmtMoney(cl.discount)}</span>
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
                                onChange={(e) => {
                                  const n = Math.floor(Number(e.target.value));
                                  if (!Number.isFinite(n) || n < 1) return;
                                  updateCartQty(key, n);
                                }}
                              />
                              <button type="button" onClick={() => updateCartQty(key, entry.quantity + 1)}>
                                <i className="ti ti-plus" />
                              </button>
                            </div>
                            <div className="portal-cart-total">{showPrice ? fmtMoney(cl.ttc) : ''}</div>
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
                  {showPrice ? (
                    <div className="portal-cart-totals">
                      <div className="portal-cart-total-row">
                        <span>المجموع HT</span>
                        <b>{fmtMoney(totals.ht)}</b>
                      </div>
                      {totals.discount > 0.004 && (
                        <div className="portal-cart-total-row portal-cart-total-row--disc">
                          <span>الخصم</span>
                          <b>-{fmtMoney(totals.discount)}</b>
                        </div>
                      )}
                      {totals.tva > 0.004 && (
                        <div className="portal-cart-total-row">
                          <span>TVA</span>
                          <b>{fmtMoney(totals.tva)}</b>
                        </div>
                      )}
                      <div className="portal-cart-total-row portal-cart-total-row--final">
                        <span>المجموع (TTC)</span>
                        <b>{fmtMoney(totals.ttc)}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="portal-cart-totals portal-cart-totals--muted">
                      <div className="portal-cart-total-row">
                        <span>سيُحدَّد مبلغ الطلب من طرف المؤسسة عند التأكيد.</span>
                      </div>
                    </div>
                  )}
                  <button
                    className="portal-btn portal-btn--em portal-btn--block"
                    type="button"
                    disabled={cartEntries.length === 0 || !canOrder}
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
          {showPrice && <b>{fmtMoney(totals.ttc)}</b>}
          <span className="portal-mobile-cart-bar-go"><i className="ti ti-shopping-cart" /> عرض السلة</span>
        </button>
      )}

      {/* ─── نهاية قسم الطلبات — انتقل إلى صفحة طلباتي المستقلة PortalMyOrdersPage ─── */}

      {toast && <div className="portal-toast"><i className="ti ti-circle-check" /> {toast}</div>}
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}
