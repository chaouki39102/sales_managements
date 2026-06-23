import React, { useMemo } from 'react';
import type { PaymentMode } from '@/types';
import type { SessionPayment, SessionProduct } from '@/pos/hooks/usePOSStore';
import { formatDZD } from '../utils/calculations';

interface SessionStatsModalProps {
  sessionInvoices:   number;
  sessionSales:      number;
  highestInvoice:    number;
  invoiceTotals:     number[];
  paymentsBreakdown: SessionPayment[];
  productsSold:      Record<string, SessionProduct>;
  paymentModes:      PaymentMode[];
  heldCount:         number;
  avgMargin:         number;
  onClose:           () => void;
  onEndSession:      () => void;
}

export default function SessionStatsModal({
  sessionInvoices, sessionSales, highestInvoice, invoiceTotals,
  paymentsBreakdown, productsSold, paymentModes, heldCount, avgMargin,
  onClose, onEndSession,
}: SessionStatsModalProps) {
  const avgInvoice = sessionInvoices > 0 ? sessionSales / sessionInvoices : 0;

  const paymentSummary = useMemo(() => {
    const map = new Map<number, number>();
    paymentsBreakdown.forEach(p => {
      map.set(p.paymentModeId, (map.get(p.paymentModeId) ?? 0) + p.amount);
    });
    return Array.from(map.entries())
      .map(([modeId, amount]) => {
        const mode = paymentModes.find(m => m.id === modeId);
        return { modeId, name: mode?.name ?? `#${modeId}`, amount, pct: sessionSales > 0 ? (amount / sessionSales) * 100 : 0 };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [paymentsBreakdown, paymentModes, sessionSales]);

  const topProducts = useMemo(() =>
    Object.values(productsSold)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  [productsSold]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-chart-bar" style={{ marginLeft: 6 }} /> إحصاءات الجلسة</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          {/* ── بطاقات المؤشرات ── */}
          <div className="session-grid">
            {[
              { label: 'عدد الفواتير',      value: sessionInvoices,       icon: 'ti-receipt',     cls: 'g' },
              { label: 'إجمالي المبيعات',    value: formatDZD(sessionSales), icon: 'ti-cash',    cls: 'o' },
              { label: 'متوسط الفاتورة',     value: formatDZD(avgInvoice),   icon: 'ti-chart-bar', cls: 'p' },
              { label: 'أعلى فاتورة',        value: formatDZD(highestInvoice), icon: 'ti-arrow-up-right', cls: 'e' },
              { label: 'فواتير معلقة',       value: heldCount,             icon: 'ti-clock-pause', cls: 'b' },
              { label: 'متوسط الهامش',       value: `${avgMargin.toFixed(1)}%`, icon: 'ti-trending-up', cls: 'b' },
            ].map(s => (
              <div key={s.label} className={`session-card pos-chip ${s.cls}`}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 22 }} />
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── توزيع وسائل الدفع ── */}
          {paymentSummary.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: 'var(--t2)' }}><i className="ti ti-credit-card" style={{ marginLeft: 6 }} /> توزيع وسائل الدفع</div>
              {paymentSummary.map(p => (
                <div key={p.modeId} className="sr">
                  <span className="sr-l">{p.name}</span>
                  <span className="sr-v">{formatDZD(p.amount)} <span style={{ fontSize: 11, color: 'var(--t4)' }}>({p.pct.toFixed(0)}%)</span></span>
                </div>
              ))}
            </div>
          )}

          {/* ── أكثر المنتجات مبيعاً ── */}
          {topProducts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: 'var(--t2)' }}><i className="ti ti-package" style={{ marginLeft: 6 }} /> أكثر المنتجات مبيعاً</div>
              {topProducts.map((p, i) => (
                <div key={p.name} className="sr">
                  <span className="sr-l">
                    <span style={{ color: 'var(--t4)', marginLeft: 6, fontWeight: 800, fontSize: 11 }}>#{i + 1}</span>
                    {p.name}
                    <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>×{p.qty}</span>
                  </span>
                  <span className="sr-v">{formatDZD(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="m-foot">
          <button className="btn btn-r" onClick={onEndSession} type="button">
            <i className="ti ti-square-off" /> إنهاء الجلسة
          </button>
          <button className="btn btn-p" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
