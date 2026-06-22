import React from 'react';
import type { CartItem, CartTotals } from '@/types';
import { formatDZD } from '../utils/calculations';

interface POSTopBarProps {
  sessionInvoices: number; sessionSales: number; heldCount: number;
  avgMargin: number; isEmpty: boolean; isFullscreen: boolean; showQuickbar: boolean;
  onHeld: () => void; onNewSale: () => void; onManual: () => void;
  onReceipt: () => void; onSession: () => void; onFullscreen: () => void;
  onKbHelp: () => void; onToggleQuickbar: () => void;
  items: CartItem[]; totals: CartTotals; totalTtcFinal: number;
}

export default function POSTopBar({
  sessionInvoices, sessionSales, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  onHeld, onNewSale, onManual, onReceipt, onSession, onFullscreen, onKbHelp,
  onToggleQuickbar, items, totals, totalTtcFinal,
}: POSTopBarProps) {
  return (
    <div className="pos-topbar">
      <div className="pos-stats-row">
        <div className="pos-chip g" title="فواتير الجلسة الحالية">
          <i className="ti ti-receipt pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">فواتير اليوم</span>
            <strong className="pos-chip-val">{sessionInvoices}</strong>
          </div>
        </div>
        <div className="pos-chip o" title="إجمالي مبيعات الجلسة">
          <i className="ti ti-cash pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">مبيعات الجلسة</span>
            <strong className="pos-chip-val">{formatDZD(sessionSales)}</strong>
          </div>
        </div>
        {heldCount > 0 && (
          <div className="pos-chip b clickable" onClick={onHeld} title="الفواتير المعلقة — F7">
            <i className="ti ti-clock-pause pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">معلقة</span>
              <strong className="pos-chip-val">{heldCount}</strong>
            </div>
          </div>
        )}
        {!isEmpty && avgMargin > 0 && (
          <div className="pos-chip p" title="متوسط هامش الربح للسلة الحالية">
            <i className="ti ti-trending-up pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">هامش الربح</span>
              <strong className="pos-chip-val">{avgMargin.toFixed(1)}%</strong>
            </div>
          </div>
        )}
        {!isEmpty && (
          <div className="pos-chip c">
            <i className="ti ti-shopping-cart pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">السلة</span>
              <strong className="pos-chip-val">{totals.lines_count} صنف</strong>
            </div>
          </div>
        )}
        {!isEmpty && (
          <div className="pos-chip em" title="إجمالي الفاتورة الحالية">
            <i className="ti ti-calculator pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">الإجمالي</span>
              <strong className="pos-chip-val">{formatDZD(totalTtcFinal)}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="pos-tools-row">
        <button className="pos-tool-btn" onClick={onManual} title="إضافة منتج يدوي — F6">
          <i className="ti ti-plus" />
          <span>يدوي</span>
        </button>
        <button className="pos-tool-btn" onClick={onNewSale} title="بيع جديد / تعليق السلة — F5">
          <i className="ti ti-refresh" />
          <span>جديد</span>
        </button>
        <button className="pos-tool-btn" onClick={onReceipt} disabled={isEmpty} title="معاينة الفاتورة — F9">
          <i className="ti ti-printer" />
          <span>طباعة</span>
        </button>

        <div className="pos-tool-sep" />

        <button
          className={`pos-tool-icon ${showQuickbar ? 'pos-tool-icon--active' : ''}`}
          onClick={onToggleQuickbar}
          title="شريط الأصناف السريعة"
        >
          <i className="ti ti-star" />
        </button>
        <button className="pos-tool-icon" onClick={onSession} title="إحصاءات الجلسة — F8">
          <i className="ti ti-chart-bar" />
        </button>
        <button className="pos-tool-icon" onClick={onFullscreen} title={isFullscreen ? 'تصغير — F11' : 'شاشة كاملة — F11'}>
          <i className={`ti ti-${isFullscreen ? 'minimize' : 'maximize'}`} />
        </button>
        <button className="pos-tool-icon" onClick={onKbHelp} title="اختصارات لوحة المفاتيح — F1">
          <i className="ti ti-keyboard" />
        </button>
      </div>

      <div className="pos-kb-strip">
        {[
          { key: 'F2', label: 'بحث' },
          { key: 'F4', label: 'دفع' },
          { key: 'F5', label: 'تعليق' },
          { key: 'F6', label: 'يدوي' },
          { key: 'F7', label: 'معلقة' },
          { key: 'F9', label: 'طباعة' },
          { key: 'F11', label: 'شاشة' },
          { key: 'F12', label: 'مسح' },
        ].map(({ key, label }) => (
          <span key={key} className="kb-tip">
            <kbd>{key}</kbd>{label}
          </span>
        ))}
      </div>
    </div>
  );
}
