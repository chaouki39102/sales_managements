// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersPage.tsx — وصل طلب سلعة (كتالوج + سلة + طلباتي)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalCatalogItem, type PortalOrder, type PortalOrderStatus } from '@/lib/api/portal/portal';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  fmtMoney, fmtMoneySigned, fmtDate, Pager,
  PortalLoading, PortalError, PortalEmpty,
} from './portalUtils';

const STATUS_STYLE: Record<PortalOrderStatus, string> = {
  pending:    'badge--y',
  processing: 'badge--b',
  completed:  'badge--g',
  cancelled:  'badge--r',
};

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function PortalOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [page, setPage] = useState(1);
  const [catalogPage, setCatalogPage] = useState(1);
  const [toast, setToast] = useState('');
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { confirm, confirmDialogProps } = useConfirm();

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
    queryKey: ['portal', slug, 'orders', 'list', page],
    queryFn: () => portalApi.orders({ page, per_page: 10 }),
    placeholderData: keepPreviousData,
  });

  const createOrder = useMutation({
    mutationFn: () =>
      portalApi.createOrder(
        Object.entries(cart).map(([productId, quantity]) => ({ product_id: Number(productId), quantity })),
        notes.trim() || undefined,
      ),
    onSuccess: (order) => {
      setCart({});
      setQty({});
      setNotes('');
      setEditingId(null);
      setSubmitted(order.id);
      setPage(1);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم إرسال طلب السلعة بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر إرسال الطلب'),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      portalApi.updateOrder(
        id,
        Object.entries(cart).map(([productId, quantity]) => ({ product_id: Number(productId), quantity })),
        notes.trim() || undefined,
      ),
    onSuccess: (order) => {
      setCart({});
      setQty({});
      setNotes('');
      setEditingId(null);
      setSubmitted(order.id);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم تعديل الطلب بنجاح');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تعديل الطلب'),
  });

  const cancelOrder = useMutation({
    mutationFn: ({ id }: { id: number }) => portalApi.cancelOrder(id),
    onSuccess: (order) => {
      setSubmitted(order.id);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
      showToast('تم إلغاء الطلب');
    },
    onError: (err: Error) => showToast(err.message || 'تعذر إلغاء الطلب'),
  });

  const submit = () => {
    if (editingId != null) {
      updateOrder.mutate({ id: editingId });
    } else {
      createOrder.mutate();
    }
  };

  const startEdit = (o: PortalOrder) => {
    const nextCart: Record<number, number> = {};
    const nextQty: Record<number, number> = {};
    (o.items ?? []).forEach((it) => {
      if (!it.product_id) return;
      nextCart[it.product_id] = it.quantity;
      nextQty[it.product_id] = it.quantity;
    });
    setCart(nextCart);
    setQty(nextQty);
    setNotes(o.notes ?? '');
    setEditingId(o.id);
    setSubmitted(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCart({});
    setQty({});
    setNotes('');
  };

  const handleCancel = async (o: PortalOrder) => {
    const ok = await confirm(
      `سيتم إلغاء الطلب ${o.reference} نهائياً ولا يمكن التراجع. متابعة؟`,
      { title: 'إلغاء الطلب', confirmText: 'إلغاء الطلب', variant: 'danger', icon: 'ti-basket-x' },
    );
    if (!ok) return;
    cancelOrder.mutate({ id: o.id });
  };

  const byId = useMemo(() => {
    const m = new Map<number, PortalCatalogItem>();
    (catalogQuery.data?.data ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [catalogQuery.data]);

  const cartEntries = Object.entries(cart).map(([productId, quantity]) => {
    const p = byId.get(Number(productId));
    return p ? { product: p, quantity } : null;
  }).filter((x): x is { product: PortalCatalogItem; quantity: number } => x !== null);

  const totals = cartEntries.reduce(
    (acc, { product, quantity }) => {
      const ht = product.unit_price_ht * quantity;
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

  const addToCart = (productId: number, quantity: number) => {
    const n = Math.max(0, quantity);
    if (n <= 0) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      setQty((prev) => { const next = { ...prev }; delete next[productId]; return next; });
      return;
    }
    setCart((prev) => ({ ...prev, [productId]: n }));
    setQty((prev) => ({ ...prev, [productId]: n }));
  };

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;

  const catalogMeta = catalogQuery.data?.meta;
  const catalogFrom = catalogMeta ? catalogMeta.per_page * (catalogMeta.current_page - 1) + 1 : 0;
  const catalogTo = catalogMeta ? Math.min(catalogMeta.per_page * catalogMeta.current_page, catalogMeta.total) : 0;

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
                const inCart = cart[p.id] ?? 0;
                const q = qty[p.id] ?? 1;
                return (
                  <div key={p.id} className={`portal-prod${inCart > 0 ? ' on' : ''}`}>
                    <div className="portal-prod-hd">
                      <div className="portal-prod-name">{p.name}</div>
                      {p.ref && <div className="portal-prod-ref">{p.ref}</div>}
                    </div>
                    <div className="portal-prod-price">{fmtMoney(p.unit_price_ht)}</div>
                    <div className="portal-prod-meta">
                      {p.unit ? p.unit.symbol : ''}
                      {p.tva_rate > 0 ? ` • TVA ${p.tva_rate}%` : ''}
                      {p.manages_stock && p.current_stock !== null && (
                        <span className={p.current_stock > 0 ? 'portal-prod-stock' : 'portal-prod-stock out'}>
                          {p.current_stock > 0 ? `المخزون: ${p.current_stock}` : 'نفد المخزون'}
                        </span>
                      )}
                    </div>
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
                        className={`portal-btn portal-btn--sm ${inCart > 0 ? 'portal-btn--added' : ''}`}
                        onClick={() => addToCart(p.id, q)}
                        type="button"
                      >
                        {inCart > 0 ? <><i className="ti ti-check" /> في السلة</> : <><i className="ti ti-plus" /> أضف</>}
                      </button>
                    </div>
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
          <h3>
            <i className={`ti ${editingId != null ? 'ti-pencil' : 'ti-basket'}`} />
            {editingId != null ? 'تعديل الطلب' : 'سلة الطلب'}
          </h3>
          <span className="portal-hd-count">
            {editingId != null ? 'تعديل طلب قيد الانتظار' : `${cartEntries.length} صنف`}
          </span>
        </div>

        {cartEntries.length === 0 ? (
          <PortalEmpty icon="ti-basket" text="لم تضف أي منتج بعد" />
        ) : (
          <>
            <div className="portal-cart">
              {cartEntries.map(({ product, quantity }) => {
                const ht = product.unit_price_ht * quantity;
                return (
                  <div key={product.id} className="portal-cart-item">
                    <div className="portal-cart-info">
                      <div className="portal-prod-name">{product.name}</div>
                      <div className="portal-prod-ref">
                        {fmtMoney(product.unit_price_ht)} {product.unit ? `/${product.unit.symbol}` : ''}
                        {product.tva_rate > 0 ? ` • TVA ${product.tva_rate}%` : ''}
                      </div>
                    </div>
                    <div className="portal-prod-qty">
                      <button type="button" onClick={() => setItemQty(product.id, quantity - 1)} disabled={quantity <= 1}>
                        <i className="ti ti-minus" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setItemQty(product.id, Number(e.target.value))}
                      />
                      <button type="button" onClick={() => setItemQty(product.id, quantity + 1)}>
                        <i className="ti ti-plus" />
                      </button>
                    </div>
                    <div className="portal-cart-total">{fmtMoney(ht)}</div>
                    <button className="portal-cart-x" type="button" onClick={() => addToCart(product.id, 0)} title="إزالة">
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
              <div className="portal-cart-foot-actions">
                {editingId != null && (
                  <button
                    className="portal-btn portal-btn--ghost"
                    onClick={cancelEdit}
                    type="button"
                  >
                    <i className="ti ti-x" /> إلغاء التعديل
                  </button>
                )}
                <button
                  className="portal-btn portal-btn--em"
                  disabled={(editingId != null ? updateOrder.isPending : createOrder.isPending) || cartEntries.length === 0}
                  onClick={submit}
                  type="button"
                >
                  {editingId != null ? (
                    updateOrder.isPending
                      ? <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</>
                      : <><i className="ti ti-save" /> حفظ التعديلات</>
                  ) : (
                    createOrder.isPending
                      ? <><i className="ti ti-loader animate-spin" /> جاري الإرسال...</>
                      : <><i className="ti ti-send" /> إرسال الطلب</>
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

        {ordersQuery.isLoading ? (
          <PortalLoading text="جاري تحميل طلباتك..." />
        ) : ordersQuery.isError || !ordersQuery.data ? (
          <PortalError message="تعذر تحميل الطلبات" />
        ) : orders.length === 0 ? (
          <PortalEmpty icon="ti-clipboard-list" text="لا توجد طلبات بعد" />
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
                      {(o.items ?? []).map((it) => (
                        <div key={it.product_id} className="portal-cart-item">
                          <div className="portal-cart-info">
                            <div className="portal-prod-name">{it.product_name}</div>
                            <div className="portal-prod-ref">
                              {fmtMoney(it.unit_price_ht)}{it.unit_name ? `/${it.unit_name}` : ''}
                              {it.tva_rate > 0 ? ` • TVA ${it.tva_rate}%` : ''} • ×{it.quantity}
                            </div>
                          </div>
                          <div className="portal-cart-total">{fmtMoney(it.total_ttc)}</div>
                        </div>
                      ))}
                      {(o.items ?? []).length === 0 && (
                        <PortalEmpty icon="ti-package" text="لا توجد بنود في هذا الطلب" />
                      )}
                      {o.notes && <div className="portal-order-notes">ملاحظات: {o.notes}</div>}
                      {o.status === 'pending' && (
                        <div className="portal-order-actions">
                          <button className="portal-btn portal-btn--sm" type="button" onClick={() => startEdit(o)}>
                            <i className="ti ti-pencil" /> تعديل الطلب
                          </button>
                          <button
                            className="portal-btn portal-btn--sm portal-btn--danger"
                            type="button"
                            disabled={cancelOrder.isPending}
                            onClick={() => handleCancel(o)}
                          >
                            <i className="ti ti-basket-x" /> إلغاء الطلب
                          </button>
                        </div>
                      )}
                      {o.status === 'processing' && (
                        <div className="portal-order-notes">الطلب قيد التجهيز — لا يمكن تعديله أو إلغاؤه من طرفكم</div>
                      )}
                      {o.status === 'completed' && (
                        <div className="portal-order-notes portal-order-notes--ok">تمت معالجة الطلب وتحويله إلى فاتورة</div>
                      )}
                      {o.status === 'cancelled' && (
                        <div className="portal-order-notes portal-order-notes--warn">تم إلغاء هذا الطلب</div>
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
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}
