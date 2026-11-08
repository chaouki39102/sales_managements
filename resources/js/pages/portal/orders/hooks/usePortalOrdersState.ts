// pages/portal/orders/hooks/usePortalOrdersState.ts
// All state of the customer order page: catalog, cart, drawer/checkout, product modal, submit/update.
import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalCatalogItem, type PortalOrder } from '@/lib/api/portal/portal';
import { useConfirm } from '@/hooks/useConfirm';
import { fmtMoney } from '../../portalUtils';
import type { CartEntry } from '../types';
import { cartKey, unitPriceFor, packFactorFor, discountTierFor } from '../catalogPricing';
import { useDebounce } from './useDebounce';
import { usePortalOrderConfig } from './usePortalOrderConfig';

export function usePortalOrdersState(mode: 'portal' | 'public') {
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

  const {
    cfg, canOrder, confirmationMessage, showStock, showPrice, showRef, showUnit, showPackaging,
    allowChangePackaging, showDiscounts, showTva, showSearch, hideOutOfStock, showIncartBadge,
    showNotes,
  } = usePortalOrderConfig(slug);


  // معلومات المؤسسة (للوضع العام فقط) — رقم الهاتف يُستخدم لزر «مراسلة عبر واتساب»
  // في نافذة تأكيد إرسال الطلب، وتُجلب فقط بعد نجاح الإرسال لتجنب طلب زائد.
  const companyQuery = useQuery({
    queryKey: ['portal', slug, 'info'],
    queryFn: () => portalApi.company(),
    staleTime: 60_000,
    enabled: isPublic && !!submitted,
  });


  const createOrder = useMutation({
    retry: false,
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
    retry: false,
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


  // زبون معفى جبائياً (من back-office: is_tva_exempt) — المحرك يخزّن tva_rate=0
  // على الأسطر، لذلك يجب أن تُصفَّر TVA في المعاينة أيضاً وإلا ظهر مبلغ أكبر
  // مما سيُحتسب فعلاً.
  const partyIsTvaExempt = catalogQuery.data?.data[0]?.party_is_tva_exempt ?? false;


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

  return {
    slug, qc, isPublic, search, setSearch, qty, setQty, pkg, setPkg, cart, setCart, notes, setNotes,
    customerName, setCustomerName, customerPhone, setCustomerPhone, customerAddress,
    setCustomerAddress, catalogPage, setCatalogPage, toast, setToast, submitted, setSubmitted,
    editingId, setEditingId, drawerOpen, setDrawerOpen, checkoutStep, setCheckoutStep, noteOpen,
    setNoteOpen, infoProductId, setInfoProductId, pimZoom, setPimZoom, confirm, confirmDialogProps,
    handleRemoveItem, handleClearCart, debouncedSearch, showToast, catalogQuery, cfg, canOrder,
    confirmationMessage, showStock, showPrice, showRef, showUnit, showPackaging,
    allowChangePackaging, showDiscounts, showTva, showSearch, hideOutOfStock, showIncartBadge,
    showNotes, companyQuery, createOrder, updateOrder, byId, visibleItems, lineCalc,
    partyIsTvaExempt, cartEntries, totals, addToCart, updateCartQty, resetCart, startEdit, location,
    navigate, appliedEditRef, submitCart, catalogMeta, catalogFrom, catalogTo, pendingSubmit,
  };
}

export type PortalOrdersState = ReturnType<typeof usePortalOrdersState>;
