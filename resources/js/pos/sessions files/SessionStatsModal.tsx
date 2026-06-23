// ════════════════════════════════════════════════════════════════════════════
// pos/components/SessionStatsModal.tsx — النسخة الاحترافية الكاملة
// ════════════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { formatDZD } from '@/pos/utils/calculations';

interface SessionStatsModalProps {
  session:   PosSession;
  onClose:   () => void;
  onEndSession: () => void;
}

type Tab = 'overview' | 'payments' | 'products';

export default function SessionStatsModal({
  session, onClose, onEndSession,
}: SessionStatsModalProps) {
  const [tab, setTab] = useState<Tab>('overview');

  const duration = session.duration;
  const openedAt = new Date(session.opened_at).toLocaleString('ar-DZ');

  const paymentRows = useMemo(() =>
    session.payments.filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount),
    [session.payments],
  );

  const topProducts = useMemo(() =>
    (session.top_products ?? []).sort((a, b) => b.total_ttc - a.total_ttc).slice(0, 10),
    [session.top_products],
  );

  // رسم بياني بسيط لوسائل الدفع
  const maxPayment = Math.max(...paymentRows.map(p => p.amount), 1);

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-lg"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-chart-bar" style={{ color: 'var(--em)', marginLeft: 8 }} />
              إحصاءات الجلسة الحالية
            </div>
            <div className="m-sub">
              {session.user?.name} · {session.warehouse?.name} · فُتحت {openedAt} · مدة {duration}
            </div>
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ margin: '0 20px', borderBottom: '1px solid var(--b2)' }}>
          {([
            { key: 'overview',  label: 'نظرة عامة',     icon: 'ti-layout-dashboard' },
            { key: 'payments',  label: 'وسائل الدفع',   icon: 'ti-credit-card' },
            { key: 'products',  label: 'المنتجات',      icon: 'ti-package' },
          ] as { key: Tab; label: string; icon: string }[]).map(t => (
            <div
              key={t.key}
              className={`tab ${tab === t.key ? 'on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`ti ${t.icon}`} style={{ marginLeft: 5 }} />
              {t.label}
            </div>
          ))}
        </div>

        <div className="m-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── نظرة عامة ── */}
          {tab === 'overview' && (
            <>
              {/* KPIs 3x3 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'فواتير',         value: session.invoices_count,             icon: 'ti-receipt',         bg: 'var(--emb)',   color: 'var(--em)'    },
                  { label: 'مبيعات صافية',   value: formatDZD(session.net_sales),       icon: 'ti-cash',            bg: 'var(--goldb)', color: 'var(--gold)'  },
                  { label: 'متوسط الفاتورة', value: formatDZD(session.avg_invoice),     icon: 'ti-chart-bar',       bg: 'var(--blueb)', color: 'var(--blue)'  },
                  { label: 'أعلى فاتورة',    value: formatDZD(session.highest_invoice), icon: 'ti-arrow-up-right',  bg: 'var(--purb)',  color: 'var(--purple)'},
                  { label: 'خصومات',         value: formatDZD(session.total_discount),  icon: 'ti-discount',        bg: 'var(--orb)',   color: 'var(--orange)'},
                  { label: 'مرتجعات',        value: formatDZD(session.returns_total),   icon: 'ti-receipt-refund',  bg: 'var(--redb)', color: 'var(--red)'   },
                  { label: 'TVA',            value: formatDZD(session.total_tva),       icon: 'ti-percentage',      bg: 'var(--tealb)', color: 'var(--teal)'  },
                  { label: 'طابع مالي',      value: formatDZD(session.total_fiscal_stamp),icon: 'ti-stamp',         bg: 'var(--bg4)',   color: 'var(--t3)'    },
                  { label: 'رأس المال الأولي',value: formatDZD(session.opening_cash),   icon: 'ti-wallet',          bg: 'var(--emb)',   color: 'var(--em)'    },
                ].map(kpi => (
                  <div
                    key={kpi.label}
                    style={{
                      padding: '12px 14px', borderRadius: 'var(--r2)',
                      background: kpi.bg,
                      border: '1px solid color-mix(in srgb, ' + kpi.color + ' 20%, transparent)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <i className={`ti ${kpi.icon}`} style={{ color: kpi.color, fontSize: 15 }} />
                      <span style={{ fontSize: 10.5, color: 'var(--t4)', fontWeight: 700 }}>{kpi.label}</span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', direction: 'ltr' }}>
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bar: مبيعات الجلسة */}
              {session.net_sales > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)' }}>توزيع المبيعات</span>
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                      صافي {formatDZD(session.net_sales)} من مجموع {formatDZD(session.gross_sales)}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--b2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${session.gross_sales > 0 ? (session.net_sales / session.gross_sales) * 100 : 100}%`,
                      background: 'var(--grad-em)',
                      borderRadius: 4,
                      transition: 'width .5s ease',
                    }} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── وسائل الدفع ── */}
          {tab === 'payments' && (
            <div>
              {paymentRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
                  لا توجد مدفوعات مُسجَّلة بعد
                </div>
              ) : (
                paymentRows.map(p => (
                  <div key={p.payment_mode_id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                        <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400, marginRight: 8 }}>
                          ({p.count} عملية)
                        </span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 900, direction: 'ltr' }}>
                        {formatDZD(p.amount)}
                        <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 6 }}>
                          ({session.net_sales > 0 ? ((p.amount / session.net_sales) * 100).toFixed(0) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--b2)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(p.amount / maxPayment) * 100}%`,
                        background: 'var(--grad-em)',
                        borderRadius: 3,
                        transition: 'width .4s ease',
                      }} />
                    </div>
                  </div>
                ))
              )}

              {/* إجمالي */}
              {paymentRows.length > 0 && (
                <div style={{
                  marginTop: 16, padding: '12px 14px',
                  background: 'var(--emb)', borderRadius: 'var(--r2)',
                  border: '1px solid var(--embo)',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 800, color: 'var(--em)' }}>الإجمالي المحصَّل</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--em)', direction: 'ltr' }}>
                    {formatDZD(session.net_sales)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── المنتجات ── */}
          {tab === 'products' && (
            <div>
              {topProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
                  لا توجد منتجات مُسجَّلة بعد
                </div>
              ) : (
                topProducts.map((p, i) => (
                  <div
                    key={p.product_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px',
                      background: i % 2 === 0 ? 'var(--bg3)' : 'transparent',
                      borderRadius: 'var(--r1)',
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: i < 3 ? 'var(--emb)' : 'var(--b1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                      color: i < 3 ? 'var(--em)' : 'var(--t4)',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.product_name}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20,
                      background: 'var(--b1)', fontSize: 11, color: 'var(--t3)', fontWeight: 700,
                    }}>
                      ×{p.quantity_sold}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, direction: 'ltr', color: 'var(--em)' }}>
                      {formatDZD(p.total_ttc)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          <button
            className="btn"
            style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            onClick={onEndSession}
            type="button"
          >
            <i className="ti ti-door-exit" /> إغلاق الجلسة
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-p" onClick={onClose} type="button">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// كيفية ربط الجلسة في POSPage — التعديلات المطلوبة فقط
// ════════════════════════════════════════════════════════════════════════════
/*

1) في POSPage.tsx أضف هذه الـ imports:
   import { OpenSessionModal, CloseSessionModal } from '@/pos/components/SessionModals';
   import {
     useCurrentPosSession, useOpenSession,
     useIncrementSession, useCloseSession,
     buildIncrementInput,
   } from '@/lib/api/endpoints/posSession';

2) أضف هذه الـ state والـ hooks داخل POSPage:

   const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
   const openSessionMut    = useOpenSession();
   const closeSessionMut   = useCloseSession(currentSession?.id ?? null);
   const incrementMut      = useIncrementSession(currentSession?.id ?? null);
   const [showCloseSession, setShowCloseSession] = useState(false);
   const [sessionError, setSessionError] = useState<string | null>(null);

3) في handleCompleteSale — بعد documentsApi.create() ينجح، أضف:
   if (currentSession?.id) {
     incrementMut.mutate(buildIncrementInput({
       items:            currentItems,
       totalHt:          snapshot.totals.total_ht,
       totalTva:         snapshot.totals.total_tva,
       totalFiscalStamp: snapshot.totals.fiscal_stamp,
       totalDiscount:    snapshot.totals.total_discount,
       grandTotal:       saleTotal,
       payments:         apiPayments.map(p => ({
         payment_mode_id: p.payment_mode_id,
         amount:          p.amount,
       })),
     }));
   }

4) في JSX: قبل كل شيء داخل pos-wrap أضف:
   {!sessionLoading && !currentSession && (
     <OpenSessionModal
       warehouses={warehouses ?? []}
       fiscalYears={...}
       defaultWarehouseId={defaultWarehouse?.id}
       onOpen={async (data) => {
         try {
           await openSessionMut.mutateAsync(data);
         } catch (e: any) {
           setSessionError(e.message);
         }
       }}
       isLoading={openSessionMut.isPending}
       error={sessionError}
     />
   )}

   {showCloseSession && currentSession && (
     <CloseSessionModal
       session={currentSession}
       onClose={() => setShowCloseSession(false)}
       onConfirm={async (data) => {
         await closeSessionMut.mutateAsync(data);
         setShowCloseSession(false);
       }}
       isLoading={closeSessionMut.isPending}
     />
   )}

5) في SessionStatsModal: مرر currentSession بدلاً من القيم المنفردة:
   {modal === 'session' && currentSession && (
     <SessionStatsModal
       session={currentSession}
       onClose={() => setModal('none')}
       onEndSession={() => { setModal('none'); setShowCloseSession(true); }}
     />
   )}

6) في api.php أضف routes الجلسات:
   Route::prefix('pos-sessions')->group(function () {
     Route::get('current',                 [PosSessionController::class, 'current']);
     Route::post('/',                      [PosSessionController::class, 'open']);
     Route::post('{session}/increment',    [PosSessionController::class, 'increment']);
     Route::post('{session}/close',        [PosSessionController::class, 'close']);
     Route::get('/',                       [PosSessionController::class, 'index']);
     Route::get('{session}',               [PosSessionController::class, 'show']);
   });
*/
