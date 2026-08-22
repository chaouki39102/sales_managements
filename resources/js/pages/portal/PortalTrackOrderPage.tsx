// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalTrackOrderPage.tsx — تتبع طلبات الزائر (بدون حساب بوابة)
// ════════════════════════════════════════════════════════════════════════════
// الزائر الذي أرسل طلباً برقم هاتفه (من صفحة الطلب العام) يتابع حالة طلبه هنا:
// يكتب رقم الهاتف الذي استعمله (+ اختياري: مرجع الطلب) ويرى طلباته العامة
// بحالتها الحالية وخط الأنابيب. لا توجد أي جلسة أو حساب — بحث آمن بالرقم فقط.
import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portalApi, type PortalOrder, type PortalOrderStatus } from '@/lib/api/portal/portal';
import OrderPipeline from './OrderPipeline';
import {
  fmtMoney, fmtMoneySigned, fmtDate,
  PortalEmpty,
  buildWhatsAppLink, waOrderMessage,
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

export default function PortalTrackOrderPage() {
  const { slug } = useParams<{ slug: string }>();

  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState('');
  const [results, setResults] = useState<PortalOrder[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const location = useLocation();
  const autoRan = useRef(false);

  const companyQuery = useQuery({
    queryKey: ['portal', slug, 'info'],
    queryFn: () => portalApi.company(),
  });

  // عند القدوم من صفحة الطلب (بعد إرسال طلب) نملأ رقم الهاتف + مرجع الطلب
  // تلقائياً وننفّذ البحث فوراً — الزائر يرى طلبه مباشرة دون إعادة كتابة البيانات.
  useEffect(() => {
    const st = (location.state ?? null) as { phone?: string; reference?: string } | null;
    const prefilledPhone = st?.phone?.trim();
    if (autoRan.current || !prefilledPhone) return;
    autoRan.current = true;
    const prefilledRef = st?.reference?.trim() ?? '';
    setPhone(prefilledPhone);
    setReference(prefilledRef);
    trackMutation.mutate({ phone: prefilledPhone, reference: prefilledRef });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const trackMutation = useMutation({
    retry: false,
    mutationFn: ({ phone: p, reference: r }: { phone: string; reference?: string }) =>
      portalApi.trackOrder(p, r),
    onSuccess: (orders) => {
      setResults(orders);
      setSearched(true);
      setToast(orders.length > 0 ? '' : 'لا توجد طلبات بهذا الرقم');
      if (orders.length === 0) setTimeout(() => setToast(''), 3200);
    },
    onError: (err: Error) => {
      setResults([]);
      setSearched(true);
      setToast(err.message || 'تعذر البحث عن الطلبات');
      setTimeout(() => setToast(''), 3200);
    },
  });

  const submit = () => {
    if (!phone.trim()) {
      setToast('اكتب رقم الهاتف الذي استعملته عند إرسال الطلب');
      setTimeout(() => setToast(''), 3200);
      return;
    }
    trackMutation.mutate({ phone: phone.trim(), reference: reference.trim() });
  };

  return (
    <div className="portal-public">
      <header className="portal-public-hd">
        <div className="portal-public-body">
          <div className="portal-public-row">
            <div className="portal-public-id">
              {companyQuery.data?.avatar ? (
                <img className="portal-public-logo" src={companyQuery.data.avatar} alt={companyQuery.data.name ?? ''} />
              ) : (
                <div className="portal-public-logo portal-public-logo--ic"><i className="ti ti-store" /></div>
              )}
              <div>
                <div className="portal-public-name">{companyQuery.data?.name ?? 'تتبع طلبك'}</div>
                <div className="portal-public-sub">تابع حالة طلبك برقم هاتفك</div>
              </div>
            </div>
            <div className="portal-public-nav">
              {slug && (
                <Link className="portal-public-login" to={`/portal/${slug}/order`}>
                  <i className="ti ti-building-store" /> اطلب سلعة
                </Link>
              )}
              {slug && (
                <Link className="portal-public-login" to={`/portal/${slug}/login`}>
                  <i className="ti ti-login" /> تسجيل الدخول
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="portal-public-body">
        <div className="portal-card">
          <div className="portal-card-hd">
            <h3><i className="ti ti-truck-delivery" /> تتبع طلبك</h3>
          </div>

          <div className="portal-track-form">
            <div className="portal-customer-field">
              <input
                className="portal-form-input"
                placeholder="رقم الهاتف المستعمل عند الطلب *"
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setSearched(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              />
            </div>
            <div className="portal-customer-field">
              <input
                className="portal-form-input"
                placeholder="مرجع الطلب (اختياري — مثال CMD-2026-000012)"
                dir="ltr"
                value={reference}
                onChange={(e) => { setReference(e.target.value); setSearched(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              />
            </div>
            <div className="portal-cart-actions">
              <button
                className="portal-btn portal-btn--em"
                disabled={trackMutation.isPending}
                onClick={submit}
                type="button"
              >
                {trackMutation.isPending ? (
                  <><i className="ti ti-loader animate-spin" /> جاري البحث...</>
                ) : (
                  <><i className="ti ti-search" /> عرض طلباتي</>
                )}
              </button>
            </div>
          </div>

          <div className="portal-track-hint">
            أدخل رقم الهاتف الذي استعملته عند إرسال الطلب — ستظهر كل طلباتك العامة مع حالتها الحالية.
          </div>

          {searched && !trackMutation.isPending && results.length === 0 && (
            <PortalEmpty icon="ti-truck-delivery" text="لا توجد طلبات بهذا الرقم — تأكد من رقم الهاتف أو مرجع الطلب" />
          )}

          {results.map((o) => {
            const factorOf = (it: { pack_qty: number | null }) => (it.pack_qty && it.pack_qty > 1 ? it.pack_qty : 1);
            const expanded = expandedId === o.id;
            return (
              <div key={o.id} className="portal-order portal-mt-16">
                <button
                  className="portal-order-hd"
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : o.id)}
                  aria-expanded={expanded}
                >
                  <div className="portal-order-info">
                    <div className="portal-order-ref">{o.reference}</div>
                    <div className="portal-prod-ref">{fmtDate(o.requested_at || o.created_at)} • {o.items_count} صنف</div>
                  </div>
                  <div className="portal-order-side">
                    <span className={`badge ${STATUS_STYLE[o.status]}`}>{o.status_label}</span>
                    <span className="portal-order-amt">{fmtMoneySigned(o.total_ttc)}</span>
                    <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} />
                  </div>
                </button>
                {expanded && (
                <div className="portal-order-detail">
                  <OrderPipeline status={o.status} />
                  {(o.lines ?? []).map((it) => {
                    const factor = factorOf(it);
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
                  <div className="portal-cart-totals">
                    <div className="portal-cart-total-row"><span>المجموع HT</span><b>{fmtMoney(o.total_ht)}</b></div>
                    <div className="portal-cart-total-row"><span>TVA</span><b>{fmtMoney(o.total_tva)}</b></div>
                    <div className="portal-cart-total-row portal-cart-total-row--final">
                      <span>المجموع TTC</span><b>{fmtMoney(o.total_ttc)}</b>
                    </div>
                  </div>
                  {o.notes && <div className="portal-order-notes">ملاحظات: {o.notes}</div>}
                  {companyQuery.data?.phone && (() => {
                    const wa = buildWhatsAppLink(companyQuery.data?.phone, waOrderMessage(o));
                    return wa ? (
                      <div className="portal-order-actions">
                        <a
                          className="portal-btn portal-btn--sm portal-btn--wa"
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="ti ti-brand-whatsapp" /> مراسلة عبر واتساب
                        </a>
                      </div>
                    ) : null;
                  })()}
                </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="portal-public-ft">
        <div className="portal-public-body">
          {slug ? (
            <>لم تُسجّل بعد؟ <Link to={`/portal/${slug}/order`}>أرسل طلبك من صفحة اطلب سلعة</Link></>
          ) : (
            'تابع حالة طلباتك هنا فور قبولها من المؤسسة'
          )}
        </div>
      </footer>

      {toast && <div className="portal-toast"><i className="ti ti-circle-check" /> {toast}</div>}
    </div>
  );
}
