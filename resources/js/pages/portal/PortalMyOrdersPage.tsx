// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalMyOrdersPage.tsx — طلباتي (قائمة الطلبات الخاصة بالزبون)
// صفحة مستقلة عن متجر «اطلب سلعة»: تصفية بالحالة + تفاصيل + تأكيد/تعديل/إلغاء.
// «تعديل» يعيد الزبون إلى متجر الطلب في وضع التعديل (drawer مفتوح).
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalOrderStatus, type PortalOrder } from '@/lib/api/portal/portal';
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

export default function PortalMyOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PortalOrderStatus | ''>('');
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3600);
  };

  // إعدادات البوابة — تُخبرنا إذا كان إرسال الطلبات معطلاً على حساب الزبون
  // (portal_orders_enabled أو إيقاف إداري) لنعرض لافتة بدل أن يرفض الخادم كل إجراء.
  const configQuery = useQuery({
    queryKey: ['portal', slug, 'config'],
    queryFn: () => portalApi.config(),
    staleTime: 60_000,
  });
  const cfg = configQuery.data;
  const canOrder = cfg?.can_order ?? true;

  const { confirm, confirmDialogProps } = useConfirm();

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

  const ordersQuery = useQuery({
    queryKey: ['portal', slug, 'orders', 'list', page, statusFilter],
    queryFn: () => portalApi.orders({ page, per_page: 10, status: statusFilter || undefined }),
    placeholderData: keepPreviousData,
  });

  const cancelOrder = useMutation({
    mutationFn: (id: number) => portalApi.cancelOrder(id),
    onSuccess: (order) => {
      setSubmitted(order.id);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
    },
    onError: (err: Error) => showToast(err.message || 'تعذر إلغاء الطلب'),
  });

  // تأكيد الطلب من الزبون (قيد الاعداد → مؤكد) — بعد التأكيد يدخل الطلب
  // مرحلة تحليل المسؤول ولا يعود للزبون تصرف.
  const validateOrder = useMutation({
    mutationFn: (id: number) => portalApi.validateOrder(id),
    onSuccess: (order) => {
      setSubmitted(order.id);
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders', 'list'] });
    },
    onError: (err: Error) => showToast(err.message || 'تعذر تأكيد الطلب'),
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;

  // «تعديل» يعيد الزبون إلى متجر «اطلب سلعة» في وضع التعديل (الدرج مفتوح
  // والسلة محمّلة بأسطر الطلب) عبر router state — المتجر يطبّقها على mount.
  const startEdit = (order: PortalOrder) => {
    navigate(`/portal/${slug}/orders`, { state: { editOrder: order } });
  };

  return (
    <section className="portal-myorders">
      {cfg && !canOrder && (
        <div className="portal-blocked-banner">
          <i className={cfg.enabled ? 'ti ti-user-off' : 'ti ti-basket-off'} />
          <span>
            {cfg.enabled
              ? (cfg.authenticated
                  ? 'إرسال الطلبات معطل حالياً على حسابك — يمكنك متابعة طلباتك الحالية فقط.'
                  : 'إرسال الطلبات من الزوار معطل حالياً.')
              : 'إرسال الطلبات معطل حالياً من طرف المؤسسة — يمكنك متابعة طلباتك الحالية فقط.'}
          </span>
        </div>
      )}
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

                      {o.status === 'preparing' && (
                        <div className="portal-order-actions">
                          <button
                            className="portal-btn portal-btn--sm portal-btn--em"
                            onClick={() => handleValidateOrder(o)}
                            type="button"
                            disabled={validateOrder.isPending || !canOrder}
                          >
                            <i className="ti ti-circle-check" /> تأكيد الطلب
                          </button>
                          <button
                            className="portal-btn portal-btn--sm"
                            onClick={() => startEdit(o)}
                            type="button"
                            disabled={!canOrder}
                          >
                            <i className="ti ti-edit" /> تعديل
                          </button>
                          <button
                            className="portal-btn portal-btn--sm portal-btn--danger"
                            onClick={() => handleCancelOrder(o)}
                            type="button"
                            disabled={cancelOrder.isPending || !canOrder}
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

      <ConfirmDialog {...confirmDialogProps} />
      {toast && <div className="portal-toast"><i className="ti ti-circle-x" /> {toast}</div>}
    </section>
  );
}
