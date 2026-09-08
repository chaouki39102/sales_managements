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
  fmtMoney, fmtMoneySigned, fmtDate, timeAgo,
  buildWhatsAppLink, waOrderMessage,
} from './portalUtils';

const STATUS_STYLE: Record<PortalOrderStatus, string> = {
  pending:   'badge--z',
  preparing: 'badge--y',
  confirmed: 'badge--b',
  processed: 'badge--purple',
  shipped:   'badge--z',
  delivered: 'badge--g',
  returned:  'badge--r',
  cancelled: 'badge--r',
  completed: 'badge--g',
};

// لون حافة البطاقة حسب الحالة (شريط جانبي يبصّر بحالة الطلب قبل فتحه)
const STATUS_ACCENT: Record<PortalOrderStatus, string> = {
  pending:   'portal-order--acc-z',
  preparing: 'portal-order--acc-y',
  confirmed: 'portal-order--acc-b',
  processed: 'portal-order--acc-purple',
  shipped:   'portal-order--acc-b',
  delivered: 'portal-order--acc-g',
  returned:  'portal-order--acc-r',
  cancelled: 'portal-order--acc-r',
  completed: 'portal-order--acc-g',
};

export default function PortalTrackOrderPage() {
  const { slug } = useParams<{ slug: string }>();

  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState('');
  const [toastErr, setToastErr] = useState(false);
  const [results, setResults] = useState<PortalOrder[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const location = useLocation();
  const autoRan = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string, isErr = false) => {
    setToast(msg);
    setToastErr(isErr);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

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
      if (orders.length === 0) notify('لا توجد طلبات بهذا الرقم — تأكد من رقم الهاتف', true);
      else setToast('');
    },
    onError: (err: Error) => {
      setResults([]);
      setSearched(true);
      notify(err.message || 'تعذر البحث عن الطلبات', true);
    },
  });

  const submit = () => {
    if (!phone.trim()) {
      notify('اكتب رقم الهاتف الذي استعملته عند إرسال الطلب', true);
      phoneRef.current?.focus();
      return;
    }
    trackMutation.mutate({ phone: phone.trim(), reference: reference.trim() });
  };

  const resetSearch = () => {
    setPhone('');
    setReference('');
    setResults([]);
    setSearched(false);
    phoneRef.current?.focus();
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

          <div className="portal-track-body">
          <div className="portal-track-form">
            <div className="portal-track-field">
              <label className="portal-track-lbl"><i className="ti ti-phone" /> رقم الهاتف <b className="req">*</b></label>
              <div className="portal-track-wrap">
                <i className="ti ti-phone portal-track-ic" />
                <input
                  ref={phoneRef}
                  className="portal-form-input"
                  placeholder="رقم الهاتف المستعمل عند الطلب"
                  dir="ltr"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setSearched(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                />
                <button
                  className={`portal-track-clear${phone ? '' : ' portal-track-clear--idle'}`}
                  type="button"
                  aria-label="مسح رقم الهاتف"
                  disabled={!phone}
                  onClick={() => { setPhone(''); setSearched(false); phoneRef.current?.focus(); }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            </div>
            <div className="portal-track-field">
              <label className="portal-track-lbl"><i className="ti ti-hash" /> مرجع الطلب <b className="opt">اختياري</b></label>
              <div className="portal-track-wrap">
                <i className="ti ti-hash portal-track-ic" />
                <input
                  className="portal-form-input"
                  placeholder="مثال CMD-2026-000012"
                  dir="ltr"
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); setSearched(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                />
                <button
                  className={`portal-track-clear${reference ? '' : ' portal-track-clear--idle'}`}
                  type="button"
                  aria-label="مسح مرجع الطلب"
                  disabled={!reference}
                  onClick={() => { setReference(''); setSearched(false); }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
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
            <i className="ti ti-info-circle" /> ستظهر كل طلباتك العامة المرتبطة برقم الهاتف مع حالتها الحالية وخط سير المعالجة.
          </div>

          {searched && !trackMutation.isPending && results.length === 0 && (
            <div className="portal-track-empty">
              <div className="portal-track-empty-ic"><i className="ti ti-package-off" /></div>
              <div className="portal-track-empty-t">لا توجد طلبات بهذا الرقم</div>
              <div className="portal-track-empty-s">
                تأكد أنك كتبت رقم الهاتف نفسه الذي استعملته عند إرسال الطلب، أو أضف مرجع الطلب
                الموجود في رسالة تأكيد الطلب.
              </div>
              <button className="portal-btn portal-btn--ghost" type="button" onClick={resetSearch}>
                <i className="ti ti-refresh" /> إعادة البحث
              </button>
            </div>
          )}

          {searched && !trackMutation.isPending && results.length > 0 && (
            <div className="portal-track-count">
              <i className="ti ti-list-check" />
              {results.length} {results.length === 1 ? 'طلب' : 'طلبات'}
            </div>
          )}

          {results.map((o) => {
            const factorOf = (it: { pack_qty: number | null }) => (it.pack_qty && it.pack_qty > 1 ? it.pack_qty : 1);
            const expanded = expandedId === o.id;
            return (
              <div key={o.id} className={`portal-order ${STATUS_ACCENT[o.status]} portal-mt-16`}>
                <button
                  className={`portal-order-hd${expanded ? ' is-open' : ''}`}
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : o.id)}
                  aria-expanded={expanded}
                >
                  <div className="portal-order-info">
                    <div className="portal-order-ref">{o.reference}</div>
                    <div className="portal-track-meta">
                      <i className="ti ti-calendar" /> {fmtDate(o.requested_at || o.created_at)}
                      <span className="tdot" />
                      <i className="ti ti-clock-2" /> {timeAgo(o.requested_at || o.created_at)}
                      <span className="tdot" />
                      {o.items_count} صنف
                    </div>
                  </div>
                  <div className="portal-order-side">
                    <span className={`badge ${STATUS_STYLE[o.status]}`}>{o.status_label}</span>
                    <span className="portal-order-amt">{fmtMoneySigned(o.total_ttc)}</span>
                    <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} />
                  </div>
                </button>
                {expanded && (
                <div className="portal-order-detail">
                  <div className="portal-track-detail-hd">
                    <span className="portal-track-ref-chip"><i className="ti ti-tag" /> {o.reference}</span>
                    <span className={`badge ${STATUS_STYLE[o.status]}`}>{o.status_label}</span>
                  </div>
                  <OrderPipeline status={o.status} />
                  {(o.lines ?? []).map((it) => {
                    const factor = factorOf(it);
                    return (
                      <div key={`${it.product_id}-${it.packaging_id ?? 0}`} className="portal-track-line">
                        <span className="portal-track-line-ic"><i className="ti ti-package" /></span>
                        <div className="portal-cart-item portal-cart-item--ro">
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
                  {o.notes && (
                    <div className="portal-track-note">
                      <i className="ti ti-notebook" />
                      <div><b>ملاحظات الطلب</b><div className="portal-track-note-txt">{o.notes}</div></div>
                    </div>
                  )}
                  {companyQuery.data?.phone && (() => {
                    const wa = buildWhatsAppLink(companyQuery.data?.phone, waOrderMessage(o));
                    return wa ? (
                      <div className="portal-order-actions">
                        <a
                          className="portal-btn portal-btn--sm portal-btn--wa portal-track-wa"
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

      {toast && (
        <div className={`portal-toast${toastErr ? ' portal-toast--err' : ''}`}>
          <i className={`ti ${toastErr ? 'ti-alert-triangle' : 'ti-circle-check'}`} /> {toast}
        </div>
      )}
    </div>
  );
}