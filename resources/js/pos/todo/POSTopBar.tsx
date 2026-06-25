// resources/js/pos/components/POSTopBar.tsx
import React from 'react';
import type { CartItem, CartTotals } from '@/types';
import type { PosSession }           from '@/lib/api/endpoints/posSession';
import { formatDZD }                 from '../utils/calculations';

interface POSTopBarProps {
  // ✅ session من DB — الصدر الوحيد للحقيقة
  session:         PosSession | null | undefined;
  heldCount:       number;
  avgMargin:       number;
  isEmpty:         boolean;
  isFullscreen:    boolean;
  showQuickbar:    boolean;
  items:           CartItem[];
  totals:          CartTotals;
  totalTtcFinal:   number;
  onHeld:          () => void;
  onNewSale:       () => void;
  onManual:        () => void;
  onReceipt:       () => void;
  onSession:       () => void;
  onFullscreen:    () => void;
  onKbHelp:        () => void;
  onToggleQuickbar:() => void;
  onReturn:        () => void;
  onSettings:      () => void;
}

export default function POSTopBar({
  session, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  items, totals, totalTtcFinal,
  onHeld, onNewSale, onManual, onReceipt,
  onSession, onFullscreen, onKbHelp,
  onToggleQuickbar, onReturn, onSettings,
}: POSTopBarProps) {

  // ✅ القراءة من session API — لا Zustand
  const invoicesCount = session?.invoices_count ?? 0;
  const netSales      = session?.net_sales      ?? 0;

  return (
    <div className="pos-topbar">
      <div className="pos-stats-row">

        {/* فواتير الجلسة */}
        <div
          className="pos-chip g clickable"
          onClick={onSession}
          title="إحصاءات الجلسة — F8"
        >
          <i className="ti ti-receipt pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">فواتير الجلسة</span>
            <strong className="pos-chip-val">{invoicesCount}</strong>
          </div>
        </div>

        {/* مبيعات الجلسة */}
        <div
          className="pos-chip o clickable"
          onClick={onSession}
          title="إحصاءات الجلسة — F8"
        >
          <i className="ti ti-cash pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">مبيعات الجلسة</span>
            <strong className="pos-chip-val">{formatDZD(netSales)}</strong>
          </div>
        </div>

        {/* معلّقة */}
        {heldCount > 0 && (
          <div
            className="pos-chip b clickable"
            onClick={onHeld}
            title="الفواتير المعلقة — F7"
          >
            <i className="ti ti-clock-pause pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">معلقة</span>
              <strong className="pos-chip-val">{heldCount}</strong>
            </div>
          </div>
        )}

        {/* هامش الربح */}
        {!isEmpty && avgMargin > 0 && (
          <div className="pos-chip p" title="متوسط هامش الربح — السلة الحالية">
            <i className="ti ti-trending-up pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">هامش الربح</span>
              <strong className="pos-chip-val">{avgMargin.toFixed(1)}%</strong>
            </div>
          </div>
        )}

        {/* عدد أصناف السلة */}
        {!isEmpty && (
          <div className="pos-chip c">
            <i className="ti ti-shopping-cart pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">السلة</span>
              <strong className="pos-chip-val">{totals.lines_count} صنف</strong>
            </div>
          </div>
        )}

        {/* إجمالي السلة الحالية */}
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

      {/* ── أزرار الإجراءات ── */}
      <div className="pos-actions-row">
        <button className="btn btn-xs" onClick={onNewSale} title="بيع جديد / تعليق">
          <i className="ti ti-plus" />
          <span className="tb-txt"> جديد</span>
        </button>
        <button className="btn btn-xs" onClick={onReturn} title="مرتجع">
          <i className="ti ti-receipt-refund" />
          <span className="tb-txt"> مرتجع</span>
        </button>
        <button className="btn btn-xs" onClick={onManual} title="إضافة يدوي — F6">
          <i className="ti ti-keyboard" />
          <span className="tb-txt"> يدوي</span>
        </button>
        <button
          className="btn btn-xs"
          onClick={onReceipt}
          disabled={isEmpty}
          title="معاينة الإيصال — F9"
        >
          <i className="ti ti-printer" />
        </button>
        <button
          className={`btn btn-xs ${showQuickbar ? 'btn-p' : ''}`}
          onClick={onToggleQuickbar}
          title="شريط المنتجات السريعة"
        >
          <i className="ti ti-pin" />
        </button>
        <button
          className="btn btn-xs"
          onClick={onSession}
          title="إحصاءات الجلسة — F8"
        >
          <i className="ti ti-chart-bar" />
        </button>
        <button
          className="btn btn-xs"
          onClick={onSettings}
          title="إعدادات POS"
        >
          <i className="ti ti-settings-2" />
        </button>
        <button
          className="btn btn-xs"
          onClick={onFullscreen}
          title={isFullscreen ? 'خروج من ملء الشاشة — F11' : 'ملء الشاشة — F11'}
        >
          <i className={`ti ${isFullscreen ? 'ti-minimize' : 'ti-maximize'}`} />
        </button>
        <button className="btn btn-xs" onClick={onKbHelp} title="اختصارات لوحة المفاتيح — F1">
          <i className="ti ti-keyboard" />
          <span className="tb-txt"> F1</span>
        </button>
      </div>
    </div>
  );
}
