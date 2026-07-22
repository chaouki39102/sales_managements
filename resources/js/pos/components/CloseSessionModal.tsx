// resources/js/pos/components/CloseSessionModal.tsx — v2 احترافي
import { useState, useMemo, useRef, useEffect } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';

interface Props {
  session:   PosSession;
  isLoading: boolean;
  error?:    string | null;
  onClose:   () => void;
  onConfirm: (data: { closing_cash_counted: number; closing_note?: string }) => Promise<void>;
}

type Step = 'recap' | 'cash' | 'confirm';

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: 'recap',   label: 'ملخص الجلسة',  icon: 'ti-chart-bar'  },
  { key: 'cash',    label: 'جرد الصندوق',  icon: 'ti-wallet'     },
  { key: 'confirm', label: 'تأكيد الإغلاق', icon: 'ti-door-exit'  },
];

export default function CloseSessionModal({
  session, isLoading, error, onClose, onConfirm,
}: Props) {
  const [step,    setStep]    = useState<Step>('recap');
  const [counted, setCounted] = useState('');
  const [note,    setNote]    = useState('');
  const cashRef               = useRef<HTMLInputElement>(null);

  const countedNum = parseFloat(counted) || 0;
  const expected   = (session.opening_cash ?? 0) + (session.cash_collected ?? 0);
  const difference = countedNum - expected;
  const hasCounted = counted !== '';

  const diffState: 'ok' | 'short' | 'over' =
    !hasCounted || Math.abs(difference) < 0.01 ? 'ok'
    : difference < 0 ? 'short' : 'over';

  const diffColors = {
    ok:    { color: 'var(--green)',  bg: 'var(--greenb)',  border: 'var(--greenbo)', label: 'الصندوق متطابق ✓' },
    short: { color: 'var(--red)',    bg: 'var(--redb)',    border: 'var(--redbo)',   label: 'الصندوق ناقص ⚠️' },
    over:  { color: 'var(--gold)',   bg: 'var(--goldb)',   border: 'var(--goldbo)',  label: 'الصندوق زائد ⚠️'  },
  }[diffState];

  const currentIdx = STEPS.findIndex(s => s.key === step);
  const isLast     = currentIdx === STEPS.length - 1;

  useEffect(() => {
    if (step === 'cash') setTimeout(() => cashRef.current?.focus(), 100);
  }, [step]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isLast && !isLoading) handleConfirm();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, isLast, isLoading, countedNum, note]);

  const goNext = () => { if (!isLast) setStep(STEPS[currentIdx + 1].key); };
  const goBack = () => { if (currentIdx > 0) setStep(STEPS[currentIdx - 1].key); };

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm({ closing_cash_counted: countedNum, closing_note: note.trim() || undefined });
  };

  // numpad cash
  const np = (key: string) => {
    setCounted(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '000') return prev + '000';
      return prev + key;
    });
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const paymentRows = useMemo(() =>
    (session.payments ?? []).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount),
    [session.payments],
  );
  const topProducts = useMemo(() =>
    (session.top_products ?? []).sort((a, b) => b.total_ttc - a.total_ttc).slice(0, 8),
    [session.top_products],
  );
  const totalCollected = (session.cash_collected ?? 0)
    + (session.cib_collected ?? 0)
    + (session.ccp_collected ?? 0)
    + (session.bank_collected ?? 0);
  const maxPayAmt = Math.max(...paymentRows.map(p => p.amount), 1);

  const kpis = [
    { label: 'الفواتير',         val: String(session.invoices_count),          ic: 'ti-receipt',        c: 'var(--em)',     bg: 'var(--emb)'   },
    { label: 'المبيعات الصافية', val: formatDZD(session.net_sales),            ic: 'ti-cash',           c: 'var(--gold)',   bg: 'var(--goldb)' },
    { label: 'متوسط الفاتورة',  val: formatDZD(session.avg_invoice ?? 0),      ic: 'ti-chart-bar',      c: 'var(--blue)',   bg: 'var(--blueb)' },
    { label: 'أعلى فاتورة',     val: formatDZD(session.highest_invoice ?? 0),  ic: 'ti-trending-up',    c: 'var(--purple)', bg: 'var(--purb)'  },
    { label: 'الخصومات',        val: formatDZD(session.total_discount ?? 0),   ic: 'ti-discount',       c: 'var(--orange)', bg: 'var(--orb)'   },
    { label: 'TVA المحصَّل',     val: formatDZD(session.total_tva ?? 0),        ic: 'ti-percentage',     c: 'var(--teal)',   bg: 'var(--tealb)' },
    { label: 'مدة الجلسة',      val: session.duration ?? '—',                  ic: 'ti-clock',          c: 'var(--t2)',     bg: 'var(--bg4)'   },
    { label: 'المرتجعات',       val: `${session.returns_count ?? 0} (${formatDZD(session.returns_total ?? 0)})`, ic: 'ti-receipt-refund', c: 'var(--red)', bg: 'var(--redb)' },
    { label: 'رأس المال الأولي', val: formatDZD(session.opening_cash ?? 0),     ic: 'ti-wallet',         c: 'var(--em)',     bg: 'var(--emb)'   },
  ];

  return (
    <div className="ov on" onClick={e => e.stopPropagation()} style={{ zIndex: 9998 }}>
      <div className="csm-wrap">

        {/* ════ Header ════ */}
        <div className="csm-header">
          <div className="csm-header-left">
            <div className="csm-header-icon">
              <i className="ti ti-door-exit" />
            </div>
            <div>
              <div className="csm-header-title">إغلاق الجلسة</div>
              <div className="csm-header-meta">
                <span><i className="ti ti-user" />{session.user?.name}</span>
                <span>·</span>
                <span><i className="ti ti-building-warehouse" />{session.warehouse?.name}</span>
                <span>·</span>
                <span><i className="ti ti-clock" />{session.duration}</span>
              </div>
            </div>
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* ════ Step Tabs ════ */}
        <div className="csm-steps">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`csm-step ${step === s.key ? 'active' : ''} ${i < currentIdx ? 'done' : ''}`}
              onClick={() => setStep(s.key)}
            >
              <div className="csm-step-num">
                {i < currentIdx ? <i className="ti ti-check" /> : i + 1}
              </div>
              <i className={`ti ${s.icon} csm-step-ic`} />
              <span>{s.label}</span>
            </button>
          ))}
          {/* progress bar */}
          <div className="csm-steps-progress">
            <div
              className="csm-steps-progress-fill"
              style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ════ Body ════ */}
        <div className="csm-body">

          {/* ══ ملخص الجلسة ══ */}
          {step === 'recap' && (
            <div className="csm-recap">

              {/* شريط الإجمالي البارز */}
              <div className="csm-total-banner">
                <div className="csm-tb-left">
                  <div className="csm-tb-label">إجمالي المبيعات الصافية</div>
                  <div className="csm-tb-amount" style={{ direction: 'ltr' }}>
                    {session.net_sales.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    <span className="csm-tb-dzd"> دج</span>
                  </div>
                </div>
                <div className="csm-tb-right">
                  <div className="csm-tb-stat">
                    <span>{session.invoices_count}</span>
                    <small>فاتورة</small>
                  </div>
                  <div className="csm-tb-stat">
                    <span>{session.duration}</span>
                    <small>مدة</small>
                  </div>
                </div>
              </div>

              {/* KPIs 3x3 */}
              <div className="csm-kpi-grid">
                {kpis.map(k => (
                  <div
                    key={k.label}
                    className="csm-kpi"
                    style={{ '--kc': k.c, '--kb': k.bg } as any}
                  >
                    <div className="csm-kpi-ic">
                      <i className={`ti ${k.ic}`} />
                    </div>
                    <div className="csm-kpi-label">{k.label}</div>
                    <div className="csm-kpi-val" style={{ direction: 'ltr' }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* وسائل الدفع */}
              {paymentRows.length > 0 && (
                <div className="csm-section">
                  <div className="csm-section-title">
                    <i className="ti ti-credit-card" /> توزيع وسائل الدفع
                    <span className="csm-section-total">{formatDZD(totalCollected)}</span>
                  </div>
                  <div className="csm-pay-bars">
                    {paymentRows.map(p => {
                      const pct = session.net_sales > 0
                        ? (p.amount / session.net_sales) * 100 : 0;
                      const widthPct = (p.amount / maxPayAmt) * 100;
                      return (
                        <div key={p.payment_mode_id} className="csm-pay-row">
                          <div className="csm-pay-info">
                            <span className="csm-pay-name">
                              {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                            </span>
                            <span className="csm-pay-count">{p.count} عملية</span>
                          </div>
                          <div className="csm-pay-bar-wrap">
                            <div className="csm-pay-bar">
                              <div
                                className="csm-pay-bar-fill"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="csm-pay-amount">
                            <span style={{ direction: 'ltr' }}>{formatDZD(p.amount)}</span>
                            <span className="csm-pay-pct">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* أكثر المنتجات */}
              {topProducts.length > 0 && (
                <div className="csm-section">
                  <div className="csm-section-title">
                    <i className="ti ti-package" /> أكثر المنتجات مبيعاً
                  </div>
                  <div className="csm-products">
                    {topProducts.map((p, i) => (
                      <div key={p.product_id} className="csm-product-row">
                        <div className={`csm-prod-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                        <div className="csm-prod-name">{p.product_name}</div>
                        <div className="csm-prod-qty">×{p.quantity_sold}</div>
                        <div className="csm-prod-amount" style={{ direction: 'ltr' }}>
                          {formatDZD(p.total_ttc)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ جرد الصندوق ══ */}
          {step === 'cash' && (
            <div className="csm-cash">

              {/* المبلغ المتوقع */}
              <div className="csm-expected-box">
                <div className="csm-exp-label">المبلغ المتوقع في الدرج</div>
                <div className="csm-exp-amount" style={{ direction: 'ltr' }}>
                  {formatDZD(expected)}
                </div>
                <div className="csm-exp-breakdown">
                  <span>رأس مال أولي: <strong>{formatDZD(session.opening_cash ?? 0)}</strong></span>
                  <span>+</span>
                  <span>نقداً محصَّل: <strong>{formatDZD(session.cash_collected ?? 0)}</strong></span>
                </div>
              </div>

              {/* عرض المبلغ المُدخَل */}
              <div className="csm-counted-display">
                <div className="csm-counted-label">المبلغ الفعلي في الدرج</div>
                <div className="csm-counted-amount" style={{ direction: 'ltr' }}>
                  {counted || <span className="csm-counted-placeholder">0</span>}
                  <span className="csm-counted-dzd">دج</span>
                </div>

                {/* نتيجة فورية */}
                {hasCounted && (
                  <div
                    className="csm-diff-badge"
                    style={{
                      background: diffColors.bg,
                      borderColor: diffColors.border,
                      color:       diffColors.color,
                    }}
                  >
                    <span style={{ direction: 'ltr', fontWeight: 900 }}>
                      {difference >= 0 ? '+' : ''}{formatDZD(difference)}
                    </span>
                    <span>{diffColors.label}</span>
                  </div>
                )}
              </div>

              {/* Numpad */}
              <div className="csm-numpad">
                {['7','8','9','4','5','6','1','2','3','000','0','del'].map(k => (
                  <button
                    key={k}
                    type="button"
                    className={`csm-npk ${k === 'del' ? 'del' : ''}`}
                    onClick={() => np(k)}
                  >
                    {k === 'del' ? <i className="ti ti-backspace" /> : k}
                  </button>
                ))}
              </div>

              {/* مبالغ سريعة */}
              <div className="csm-quick-amounts">
                <button
                  type="button"
                  className={`csm-qa-btn ${countedNum === expected ? 'on' : ''}`}
                  onClick={() => setCounted(expected.toFixed(0))}
                >
                  مطابق ({formatDZD(expected)})
                </button>
              </div>

              {/* ملاحظة */}
              <div className="osm-field" style={{ marginTop: 10 }}>
                <label className="osm-label">
                  <i className="ti ti-notes" />
                  ملاحظة على الجرد (اختياري)
                </label>
                <textarea
                  className="osm-inp csm-textarea"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="أي ملاحظة على الصندوق..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* ══ تأكيد الإغلاق ══ */}
          {step === 'confirm' && (
            <div className="csm-confirm">

              {/* ملخص نهائي واضح */}
              <div className="csm-confirm-header">
                <i className="ti ti-alert-triangle" style={{ color: 'var(--red)', fontSize: 32 }} />
                <div className="csm-confirm-title">مراجعة نهائية قبل الإغلاق</div>
                <div className="csm-confirm-hint">
                  بعد الإغلاق لا يمكن البيع حتى تفتح جلسة جديدة
                </div>
              </div>

              {/* جدول المراجعة */}
              <div className="csm-review-table">
                {[
                  { label: 'المبيعات الصافية',    val: formatDZD(session.net_sales),   type: 'highlight' },
                  { label: 'عدد الفواتير',         val: String(session.invoices_count), type: 'normal'    },
                  { label: 'نقداً محصَّل',          val: formatDZD(session.cash_collected ?? 0), type: 'normal' },
                  { label: 'بطاقات وتحويل',        val: formatDZD((session.cib_collected ?? 0) + (session.ccp_collected ?? 0) + (session.bank_collected ?? 0)), type: 'normal' },
                  { label: 'آجل / دين',            val: formatDZD(session.credit_total ?? 0), type: 'normal' },
                  { label: 'TVA',                  val: formatDZD(session.total_tva ?? 0), type: 'normal' },
                  null, // separator
                  { label: 'المبلغ المتوقع بالدرج', val: formatDZD(expected),           type: 'normal'    },
                  { label: 'المبلغ الفعلي بالدرج',  val: counted ? formatDZD(countedNum) : 'لم يُحدَّد', type: 'normal' },
                  {
                    label: 'الفرق',
                    val: counted ? `${difference >= 0 ? '+' : ''}${formatDZD(difference)}` : '—',
                    type: diffState === 'ok' ? 'success' : 'danger',
                  },
                ].map((row, i) =>
                  row === null ? (
                    <div key={`sep-${i}`} className="csm-review-sep" />
                  ) : (
                    <div
                      key={i}
                      className={`csm-review-row csm-review-row--${row.type}`}
                    >
                      <span className="csm-review-label">{row.label}</span>
                      <span className="csm-review-val" style={{ direction: 'ltr' }}>{row.val}</span>
                    </div>
                  )
                )}
              </div>

              {/* ملاحظة */}
              {note && (
                <div className="csm-note-preview">
                  <i className="ti ti-notes" />
                  {note}
                </div>
              )}

              {error && (
                <div className="csm-error-box">
                  <i className="ti ti-alert-circle" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ Footer ════ */}
        <div className="csm-footer">
          <button type="button" className="csm-btn-cancel" onClick={onClose}>
            <i className="ti ti-x" /> إلغاء
          </button>
          <div style={{ flex: 1 }} />
          {currentIdx > 0 && (
            <button type="button" className="csm-btn-back" onClick={goBack}>
              <i className="ti ti-arrow-right" /> رجوع
            </button>
          )}
          {!isLast ? (
            <button type="button" className="csm-btn-next" onClick={goNext}>
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button
              type="button"
              className="csm-btn-close-session"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <><i className="ti ti-loader-2 spin" /> جاري الإغلاق...</>
              ) : (
                <><i className="ti ti-door-exit" /> تأكيد الإغلاق</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
