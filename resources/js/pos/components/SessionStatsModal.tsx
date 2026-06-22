import React from 'react';
import { formatDZD } from '../utils/calculations';

interface SessionStatsModalProps {
  sessionInvoices: number; sessionSales: number;
  heldCount: number; avgMargin: number; onClose: () => void;
}

export default function SessionStatsModal({
  sessionInvoices, sessionSales, heldCount, avgMargin, onClose,
}: SessionStatsModalProps) {
  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-chart-bar" style={{ marginLeft: 6 }} /> إحصاءات الجلسة</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          <div className="session-grid">
            {[
              { label: 'عدد الفواتير', value: sessionInvoices, icon: 'ti-receipt', cls: 'g' },
              { label: 'إجمالي المبيعات', value: formatDZD(sessionSales), icon: 'ti-cash', cls: 'o' },
              { label: 'فواتير معلقة', value: heldCount, icon: 'ti-clock-pause', cls: 'b' },
              { label: 'متوسط الهامش', value: `${avgMargin.toFixed(1)}%`, icon: 'ti-trending-up', cls: 'p' },
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
        </div>
        <div className="m-foot">
          <button className="btn btn-p" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
