// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersPage.tsx — وصل طلب سلعة (كتالوج + سلة + طلباتي)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalCatalogItem, type PortalOrderStatus, type PortalOrder } from '@/lib/api/portal/portal';
import OrderPipeline from './OrderPipeline';
import {
  fmtMoney, fmtMoneySigned, fmtDate, Pager,
  PortalLoading, PortalError, PortalEmpty,
} from './portalUtils';

const STATUS_STYLE: Record<PortalOrderStatus, string> = {
  preparing: 'badge--y',
  confirmed: 'badge--b',
  processed: 'badge--purple',
  shipped:   'badge--z',
  delivered: 'badge--g',
  returned:  'badge--r',
  cancelled: 'badge--gray',
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

export default function PortalOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [pkg, setPkg] = useState<Record<number, number | null>>({});
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [notes, setNotes] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PortalOrderStatus | ''>('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [toast, setToast] = useState('');
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [confirmValidateId, setConfirmValidateId] = useState<number | null>(null);

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
  });

  const createOrder = useMutation({
    mutationFn: ({ items, note }: { items: { product_id: number; quantity: number; packaging_id?: number | null }[]; note?: string }) =>
      portalApi.createOrder(items, note),
    onSuccess: (order) => {
      resetCart();
      setEditingId(null);
      setSubmitted(order.id);
      setPage(1);
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
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم تحديث طلب السلعة بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تحديث الطلب'),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: number) => portalApi.cancelOrder(id),
    onSuccess: (order) => {
      setConfirmCancelId(null);
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
      setConfirmValidateId(null);
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

  const cartEntries = useMemo(() => {
    return Object.entries(cart).map(([key, entry]) => {
      const product = byId.get(entry.product_id);
      if (!product) return null;
      return { key, product, entry };
    }).filter((x): x is { key: string; product: PortalCatalogItem; entry: CartEntry } => x !== null);
  }, [cart, byId]);

  const totals = cartEntries.reduce(
    (acc, { product, entry }) => {
      const price = unitPriceFor(product, entry.packaging_id);
      const ht = price * entry.quantity;
      const tva = ht * (product.tva_rate / 100);
      acc.ht += ht;
      acc.tva += tva;
      acc.ttc += ht + tva;
      return acc;
    },
    { ht: 0, tva: 0, ttc: 0 },
  );

  const setItemQty = (productId: number, quantity: number) => {
    setQty((prev) => ({ ...prev, [productId]: Math.max(0, quantity) }));
  };

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
    const items = order.items ?? [];
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
    <section>
      {/* ─── كتالوج المنتجات ─── */}
      <div className="portal-card">
        <div className="portal-card-hd">
          <h3><i className="ti ti-building-store" /> اطلب سلعة</h3>
          <span className="portal-hd-count">
            {catalogQuery.data ? `${catalogQuery.data.meta.total} منتج` : ''}
          </span>
        </div>

        <div className="portal-toolbar">
          <div className="portal-search">
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
                const selectedPack = pkg[p.id] ?? null;
                const price = unitPriceFor(p, selectedPack);
                const factor = packFactorFor(p, selectedPack);
                const q = qty[p.id] ?? 1;
                const inCart = !!cart[cartKey(p.id, selectedPack)];
                return (
                  <div key={p.id} className={`portal-prod${inCart ? ' on' : ''}`}>
                    <div className="portal-prod-hd">
                      <div className="portal-prod-name">{p.name}</div>
                      {p.ref && <div className="portal-prod-ref">{p.ref}</div>}
                    </div>
                    <div className="portal-prod-price">{fmtMoney(price)}</div>
                    <div className="portal-prod-meta">
                      {p.unit ? p.unit.symbol : ''}
                      {p.tva_rate > 0 ? ` • TVA ${p.tva_rate}%` : ''}
                      {p.manages_stock && p.current_stock !== null && (
                        <span className={p.current_stock > 0 ? 'portal-prod-stock' : 'portal-prod-stock out'}>
                          {p.current_stock > 0 ? `المخزون: ${p.current_stock}` : 'نفد المخزون'}
                        </span>
                      )}
                    </div>
                    {p.has_packaging && p.packagings.length > 0 && (
                      <select
                        className="portal-prod-pkg"
                        value={selectedPack ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPkg((prev) => ({ ...prev, [p.id]: val === '' ? null : Number(val) }));
                        }}
                      >
                        <option value="">{p.unit ? `وحدة (${p.unit.symbol})` : 'وحدة واحدة'}</option>
                        {p.packagings.map((pk) => (
                          <option key={pk.id} value={pk.id}>
                            {pk.label || pk.code || `×${pk.quantity}`} — {fmtMoney(pk.pack_price_ht)}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="portal-prod-foot">
                      <div className="portal-prod-qty">
                        <button
                          type="button"
                          onClick={() => setItemQty(p.id, q - 1)}
                          disabled={q <= 1}
                        >
                          <i className="ti ti-minus" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={q}
                          onChange={(e) => setItemQty(p.id, Number(e.target.value))}
                        />
                        <button type="button" onClick={() => setItemQty(p.id, q + 1)}>
                          <i className="ti ti-plus" />
                        </button>
                      </div>
                      <button
                        className={`portal-btn portal-btn--sm ${inCart ? 'portal-btn--added' : ''}`}
                        onClick={() => addToCart(p.id, q, selectedPack)}
                        type="button"
                      >
                        {inCart ? <><i className="ti ti-check" /> في السلة</> : <><i className="ti ti-plus" /> أضف</>}
                      </button>
                    </div>
                    {factor > 1 && (
                      <div className="portal-prod-packinfo">
                        {q} {selectedPack ? `×${factor}` : ''} = {q * factor} {p.unit ? p.unit.symbol : 'وحدة'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {catalogMeta && catalogMeta.last_page > 1 && (
              <div style={{ marginTop: 16 }}>
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

      {/* ─── سلة الطلب ─── */}
      <div className="portal-card" style={{ marginTop: 22 }}>
        <div className="portal-card-hd">
          <h3><i className="ti ti-basket" /> {editingId ? 'تعديل الطلب' : 'سلة الطلب'}</h3>
          <span className="portal-hd-count">{cartEntries.length} صنف</span>
        </div>

        {cartEntries.length === 0 ? (
          <PortalEmpty icon="ti-basket" text={editingId ? 'هذا الطلب لا يحتوي على أسطر' : 'لم تضف أي منتج بعد'} />
        ) : (
          <>
            <div className="portal-cart">
              {cartEntries.map(({ key, product, entry }) => {
                const price = unitPriceFor(product, entry.packaging_id);
                const ht = price * entry.quantity;
                return (
                  <div key={key} className="portal-cart-item">
                    <div className="portal-cart-info">
                      <div className="portal-prod-name">{product.name}</div>
                      <div className="portal-prod-ref">
                        {fmtMoney(price)}
                        {entry.packaging_id ? ` ×${packFactorFor(product, entry.packaging_id)}` : ''}
                        {product.unit ? `/${product.unit.symbol}` : ''}
                        {product.tva_rate > 0 ? ` • TVA ${product.tva_rate}%` : ''}
                      </div>
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
                    <div className="portal-cart-total">{fmtMoney(ht)}</div>
                    <button className="portal-cart-x" type="button" onClick={() => updateCartQty(key, 0)} title="إزالة">
                      <i className="ti ti-x" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="portal-cart-foot">
              <textarea
                className="portal-form-input"
                placeholder="ملاحظات (اختياري): مثلاً تاريخ التسليم المفضل..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
              <div className="portal-cart-totals">
                <div className="portal-cart-total-row"><span>المجموع HT</span><b>{fmtMoney(totals.ht)}</b></div>
                <div className="portal-cart-total-row"><span>TVA</span><b>{fmtMoney(totals.tva)}</b></div>
                <div className="portal-cart-total-row portal-cart-total-row--final">
                  <span>المجموع TTC</span><b>{fmtMoney(totals.ttc)}</b>
                </div>
              </div>
              <div className="portal-cart-actions">
                {editingId && (
                  <button
                    className="portal-btn portal-btn--ghost"
                    disabled={pendingSubmit}
                    onClick={() => { resetCart(); setEditingId(null); }}
                    type="button"
                  >
                    <i className="ti ti-x" /> إلغاء التعديل
                  </button>
                )}
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
          </>
        )}
      </div>

      {/* ─── طلباتي ─── */}
      <div className="portal-card" style={{ marginTop: 22 }}>
        <div className="portal-card-hd">
          <h3><i className="ti ti-clipboard-list" /> طلباتي</h3>
          <span className="portal-hd-count">{meta?.total ?? 0} طلب</span>
        </div>

        <div className="portal-toolbar" style={{ paddingBottom: 4 }}>
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
                    <div>
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
                      {(o.items ?? []).map((it) => {
                        const factor = it.pack_qty > 1 ? it.pack_qty : 1;
                        return (
                          <div key={`${it.product_id}-${it.packaging_id ?? 0}`} className="portal-cart-item">
                            <div className="portal-cart-info">
                              <div className="portal-prod-name">{it.product_name}</div>
                              <div className="portal-prod-ref">
                                {fmtMoney(it.unit_price_ht)}
                                {factor > 1 ? ` ×${factor}` : ''}
                                {it.unit_name ? `/${it.unit_name}` : ''}
                                {it.tva_rate > 0 ? ` • TVA ${it.tva_rate}%` : ''} • ×{it.quantity}
                              </div>
                            </div>
                            <div className="portal-cart-total">{fmtMoney(it.total_ttc)}</div>
                          </div>
                        );
                      })}
                      {o.notes && <div className="portal-order-notes">ملاحظات: {o.notes}</div>}

                      {(o.status === 'preparing') && (
                        <div className="portal-order-actions">
                          <button
                            className={`portal-btn portal-btn--sm portal-btn--em${confirmValidateId === o.id ? ' on' : ''}`}
                            onClick={() => {
                              if (confirmValidateId === o.id) {
                                validateOrder.mutate(o.id);
                              } else {
                                setConfirmValidateId(o.id);
                                setTimeout(() => setConfirmValidateId((c) => (c === o.id ? null : c)), 3000);
                              }
                            }}
                            type="button"
                            disabled={validateOrder.isPending}
                          >
                            {confirmValidateId === o.id ? (
                              <><i className="ti ti-alert-triangle" /> تأكيد الطلب؟</>
                            ) : (
                              <><i className="ti ti-circle-check" /> تأكيد الطلب</>
                            )}
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
                            className={`portal-btn portal-btn--sm portal-btn--danger${confirmCancelId === o.id ? ' on' : ''}`}
                            onClick={() => {
                              if (confirmCancelId === o.id) {
                                cancelOrder.mutate(o.id);
                              } else {
                                setConfirmCancelId(o.id);
                                setTimeout(() => setConfirmCancelId((c) => (c === o.id ? null : c)), 3000);
                              }
                            }}
                            type="button"
                            disabled={cancelOrder.isPending}
                          >
                            {confirmCancelId === o.id ? (
                              <><i className="ti ti-alert-triangle" /> تأكيد الإلغاء؟</>
                            ) : (
                              <><i className="ti ti-x" /> إلغاء الطلب</>
                            )}
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

      {toast && <div className="portal-toast"><i className="ti ti-circle-check" /> {toast}</div>}
    </section>
  );
}
