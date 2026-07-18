import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { CartTotals, PriceLevel } from '@/types';
import type { PosSession }           from '@/lib/api/endpoints/posSession';
import { formatDZD }                 from '../utils/calculations';
import { getEffectiveShortcut } from '../hooks/useKeyboardMap';

interface POSTopBarProps {
  session:         PosSession | null | undefined;
  heldCount:       number;
  avgMargin:       number;
  isEmpty:         boolean;
  isFullscreen:    boolean;
  showQuickbar:    boolean;
  totals:          CartTotals;
  totalTtcFinal:   number;
  slug:            string | null;
  editingDocumentNumber?: string | null;
  priceLevels:          PriceLevel[];
  selectedPriceLevelId: number | null;
  onPriceLevelChange:   (plId: number | null) => void;
  onHeld:          () => void;
  onNewSale:       () => void;
  onManual:        () => void;
  onReceipt:       () => void;
  onSession:          () => void;
  onSessionInvoices:  () => void;
  onFullscreen:       () => void;
  onKbHelp:           () => void;
  onToggleQuickbar:   () => void;
  onReturn:           () => void;
  onSettings:         () => void;
  onKioskMode:        () => void;
  onOpenDrawer:       () => void;
  toastEnabled:       boolean;
  onToggleToast:      () => void;
  clearSearchOnAdd:   boolean;
  onToggleClearSearch:() => void;
}

export default function POSTopBar({
  session, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  totals, totalTtcFinal, slug, editingDocumentNumber,
  priceLevels, selectedPriceLevelId, onPriceLevelChange,
  onHeld, onNewSale, onManual, onReceipt,
  onSession, onSessionInvoices, onFullscreen, onKbHelp,
  onToggleQuickbar, onReturn, onSettings, onKioskMode,
  onOpenDrawer, toastEnabled, onToggleToast,
  clearSearchOnAdd, onToggleClearSearch,
}: POSTopBarProps) {

  const invoicesCount = session?.invoices_count ?? 0;
  const netSales      = session?.net_sales      ?? 0;
  const kb            = (action: string) => getEffectiveShortcut(slug, action) ?? '';

  const [showTarifDrop, setShowTarifDrop] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const tarifRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selectedTarifLabel = selectedPriceLevelId === null
    ? 'عادي'
    : (priceLevels.find(pl => pl.id === selectedPriceLevelId)?.name ?? 'عادي');

  const openDrop = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setShowTarifDrop(true);
  }, []);

  useEffect(() => {
    if (!showTarifDrop) return;
    const h = (e: MouseEvent) => {
      if (tarifRef.current && !tarifRef.current.contains(e.target as Node)) setShowTarifDrop(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTarifDrop(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', esc); };
  }, [showTarifDrop]);

  return (
    <div className="pos-topbar">
      <div className="pos-stats-row">

        <div
          className="pos-chip g clickable"
          onClick={onSessionInvoices}
          title={`فواتير الجلسة — ${kb('sessionInvoices')}`}
        >
          <i className="ti ti-receipt pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">فواتير الجلسة</span>
            <strong className="pos-chip-val">{invoicesCount}</strong>
          </div>
        </div>

        <div
          className="pos-chip o clickable"
          onClick={onSession}
          title={`إحصاءات الجلسة — ${kb('sessionStats')}`}
        >
          <i className="ti ti-cash pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">مبيعات الجلسة</span>
            <strong className="pos-chip-val">{formatDZD(netSales)}</strong>
          </div>
        </div>

        {heldCount > 0 && (
          <div
            className="pos-chip b clickable"
            onClick={onHeld}
            title={`الفواتير المعلقة — ${kb('heldCarts')}`}
          >
            <i className="ti ti-clock-pause pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">معلقة</span>
              <strong className="pos-chip-val">{heldCount}</strong>
            </div>
          </div>
        )}

        {!isEmpty && avgMargin > 0 && (
          <div className="pos-chip p" title="متوسط هامش الربح — السلة الحالية">
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

        {editingDocumentNumber && (
          <div className="pos-chip editing" title="جاري تعديل فاتورة" style={{ background: 'var(--y)', color: '#000', fontWeight: 700 }}>
            <i className="ti ti-edit pic-ic" style={{ color: '#000' }} />
            <div className="pos-chip-inner">
              <span className="pos-chip-label" style={{ color: '#000', opacity: 0.8 }}>تعديل فاتورة</span>
              <strong className="pos-chip-val" style={{ color: '#000' }}>{editingDocumentNumber}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="pos-actions-row">

        {priceLevels.length > 0 && (
          <div className="tarif-wrap" ref={tarifRef}>
            <button
              ref={btnRef}
              className={`btn btn-xs ${selectedPriceLevelId !== null ? 'btn-p' : ''}`}
              onClick={() => { if (showTarifDrop) { setShowTarifDrop(false); } else { openDrop(); } }}
              type="button"
              title="تغيير تعريفة السعر (تجزئة / نصف جملة / جملة)"
            >
              <i className="ti ti-tag" />
              <span className="tb-txt"> {selectedTarifLabel}</span>
              <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.6 }} />
            </button>

            {showTarifDrop && createPortal(
              <div className="tarif-drop" style={{ position: 'fixed', top: dropPos.top, left: dropPos.left }}>
                {priceLevels.map(pl => (
                  <button
                    key={pl.id}
                    className={`cmode ${selectedPriceLevelId === pl.id ? 'on' : ''}`}
                    onClick={() => { onPriceLevelChange(pl.id); setShowTarifDrop(false); }}
                    title={pl.discount_percent ? `خصم ${pl.discount_percent}%` : undefined}
                  >
                    {pl.name}
                    {pl.discount_percent
                      ? <span className="cmode-disc">-{pl.discount_percent}%</span>
                      : null
                    }
                  </button>
                ))}
                <button
                  className={`cmode ${selectedPriceLevelId === null ? 'on' : ''}`}
                  onClick={() => { onPriceLevelChange(null); setShowTarifDrop(false); }}
                  title="السعر الافتراضي"
                >
                  عادي
                </button>
              </div>,
              document.body
            )}
          </div>
        )}

        <span className="tb-sep" aria-hidden="true" />

        <button className="btn btn-xs" onClick={onNewSale} title="بيع جديد / تعليق">
          <i className="ti ti-plus" />
          <span className="tb-txt"> جديد</span>
          {kb('holdCart') && <kbd className="pos-kbd">{kb('holdCart')}</kbd>}
        </button>
        <button className="btn btn-xs" onClick={onReturn} title="مرتجع">
          <i className="ti ti-receipt-refund" />
          <span className="tb-txt"> مرتجع</span>
          {kb('returns') && <kbd className="pos-kbd">{kb('returns')}</kbd>}
        </button>
        <button className="btn btn-xs" onClick={onManual} title="إضافة يدوي">
          <i className="ti ti-keyboard" />
          <span className="tb-txt"> يدوي</span>
          {kb('manualProduct') && <kbd className="pos-kbd">{kb('manualProduct')}</kbd>}
        </button>
        <button
          className="btn btn-xs pos-sc"
          onClick={onReceipt}
          disabled={isEmpty}
          title="معاينة الإيصال"
        >
          <i className="ti ti-printer" />
          {kb('preview') && <kbd>{kb('preview')}</kbd>}
        </button>

        <span className="tb-sep" aria-hidden="true" />

        <button
          className={`btn btn-xs ${showQuickbar ? 'btn-p' : ''}`}
          onClick={onToggleQuickbar}
          title="شريط المنتجات السريعة"
        >
          <i className="ti ti-pin" />
        </button>
        <button
          className="btn btn-xs"
          onClick={onOpenDrawer}
          title={`فتح درج النقود — ${kb('openDrawer')}`}
        >
          <i className="ti ti-cash-banknote" />
        </button>

        <span className="tb-sep" aria-hidden="true" />

        <button
          className={`btn btn-xs ${toastEnabled ? 'btn-p' : ''}`}
          onClick={onToggleToast}
          title={toastEnabled ? 'تعطيل الإشعارات' : 'تفعيل الإشعارات'}
        >
          <i className={`ti ${toastEnabled ? 'ti-bell' : 'ti-bell-off'}`} />
        </button>
        <button
          className={`btn btn-xs ${clearSearchOnAdd ? 'btn-p' : ''}`}
          onClick={onToggleClearSearch}
          title={clearSearchOnAdd ? 'إيقاف تفريغ البحث تلقائياً' : 'تفريغ البحث بعد كل إضافة'}
        >
          <i className={`ti ${clearSearchOnAdd ? 'ti-letter-case-toggle' : 'ti-letter-case'}`} />
        </button>

        <button
          className="btn btn-xs"
          onClick={onSettings}
          title="إعدادات POS"
        >
          <i className="ti ti-settings-2" />
        </button>
        <button
          className="btn btn-xs pos-sc"
          onClick={onFullscreen}
          title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
        >
          <i className={`ti ${isFullscreen ? 'ti-minimize' : 'ti-maximize'}`} />
          {kb('fullscreen') && <kbd>{kb('fullscreen')}</kbd>}
        </button>
        <button className="btn btn-xs" onClick={onKbHelp} title="اختصارات لوحة المفاتيح">
          <i className="ti ti-keyboard" />
          <span className="tb-txt"> F1</span>
        </button>
        <button className="btn btn-xs" onClick={onKioskMode} title="وضع الكاشير">
          <i className="ti ti-device-ipad-horizontal" />
          <span className="tb-txt"> كاشير</span>
        </button>
      </div>
    </div>
  );
}
