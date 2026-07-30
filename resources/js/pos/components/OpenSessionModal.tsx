// resources/js/pos/components/OpenSessionModal.tsx — v2 احترافي
import { useState, useEffect } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import { useDeviceName } from '@/pos/hooks/useDeviceName';
import type { Warehouse, FiscalYear } from '@/types';

interface Props {
  warehouses:           Warehouse[];
  fiscalYears:          FiscalYear[];
  defaultWarehouseId?:  number | null;
  defaultFiscalYearId?: number | null;
  isLoading:            boolean;
  error?:               string | null;
  onClose?:             () => void;
  onOpen: (data: {
    warehouse_id:        number;
    fiscal_year_id:      number;
    opening_cash:        number;
    opening_note?:       string;
    device_name?:        string;
    device_browser_info?: string;
  }) => Promise<void>;
}

// لوحة أرقام سريعة
const QUICK_CASH = [0, 5000, 10000, 20000, 50000, 100000];

function fiscalYearLabel(fy: FiscalYear): string {
  return fy.name || '';
}

export default function OpenSessionModal({
  warehouses, fiscalYears,
  defaultWarehouseId, defaultFiscalYearId,
  isLoading, error, onOpen, onClose,
}: Props) {
  const initFyId = defaultFiscalYearId
    ?? fiscalYears.find(y => y.is_current && !y.is_closed)?.id
    ?? fiscalYears[0]?.id ?? 0;

  const [step,         setStep]         = useState<1 | 2>(1);
  const [warehouseId,  setWarehouseId]  = useState<number>(
    defaultWarehouseId
      ?? warehouses.find(w => w.is_default)?.id
      ?? warehouses[0]?.id ?? 0
  );
  const [fiscalYearId, setFiscalYearId] = useState<number>(initFyId);
  const [openingCash,  setOpeningCash]  = useState('');
  const [confirmCash,  setConfirmCash]  = useState('');
  const [note,         setNote]         = useState('');
  const [cashMode,     setCashMode]     = useState<'quick' | 'manual'>('quick');
  const [deviceName,   setDeviceName]   = useDeviceName();

  // مزامنة السنة المالية بعد تحميل البيانات غير المتزامنة
  useEffect(() => {
    const best = defaultFiscalYearId
      ?? fiscalYears.find(y => y.is_current && !y.is_closed)?.id
      ?? fiscalYears[0]?.id;
    if (best && best !== fiscalYearId) {
      setFiscalYearId(best);
    }
  }, [fiscalYears, defaultFiscalYearId, fiscalYearId]);

  const cashNum    = parseFloat(openingCash)  || 0;
  const confirmNum = parseFloat(confirmCash)  || 0;
  const cashOk     = confirmCash === '' || cashNum === confirmNum;
  const canNext    = !!warehouseId && !!fiscalYearId;
  const canOpen    = cashOk && !isLoading;

  const selectedWh = warehouses.find(w => w.id === warehouseId);
  const selectedFy = fiscalYears.find(y => y.id === fiscalYearId);
  const now        = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr    = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const dateStr    = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()}`;
  const fmtDate = (d: string) => d.split('.')[0];

  // numpad
  const np = (key: string) => {
    setCashMode('manual');
    setOpeningCash(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '000') return prev + '000';
      if (prev === '0')  return key;
      return prev + key;
    });
    setConfirmCash('');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && step === 2 && canOpen) handleOpen();
      if (e.key === 'ArrowRight' && step === 2) setStep(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, canOpen, cashNum]);

  const handleOpen = async () => {
    if (!canOpen) return;
    const browserInfo = {
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      cores: navigator.hardwareConcurrency || 0,
    };
    await onOpen({
      warehouse_id:       warehouseId,
      fiscal_year_id:     fiscalYearId,
      opening_cash:       cashNum,
      opening_note:       note.trim() || undefined,
      device_name:        deviceName,
      device_browser_info: JSON.stringify(browserInfo),
    });
  };

  return (
    <div className="ov on" style={{ zIndex: 9998, alignItems: 'center' }}>
      <div className="osm-wrap">

        {/* ════ Header شعار + وقت ════ */}
        <div className="osm-hero">
          <div className="osm-hero-icon">
            <i className="ti ti-door-enter" />
          </div>
          <div className="osm-hero-text">
            <div className="osm-hero-title">فتح جلسة بيع</div>
            <div className="osm-hero-time">{dateStr} · {timeStr}</div>
          </div>
          {/* مؤشر الخطوات */}
          <div className="osm-steps-mini">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`osm-step-dot ${step >= s ? 'on' : ''}`}
              />
            ))}
          </div>
          {/* زر الإغلاق */}
          {onClose && (
            <button
              type="button"
              className="m-x"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff' }}
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* ════ Step 1: الإعداد ════ */}
        {step === 1 && (
          <div className="osm-body">
            <div className="osm-section-title">
              <i className="ti ti-settings" />
              إعداد الجلسة
            </div>

            {/* المستودع */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-building-warehouse" />
                المستودع
              </label>
              <div className="osm-warehouse-grid">
                {warehouses.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    className={`osm-wh-card ${warehouseId === w.id ? 'on' : ''}`}
                    onClick={() => setWarehouseId(w.id)}
                  >
                    <i className="ti ti-building-warehouse" />
                    <span>{w.name}</span>
                    {w.is_default && <span className="osm-default-tag">افتراضي</span>}
                    {warehouseId === w.id && (
                      <i className="ti ti-check osm-wh-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* السنة المالية */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-calendar" />
                السنة المالية
              </label>
              {(() => {
                const currentFy = fiscalYears.find(y => y.id === fiscalYearId);
                return currentFy ? (
                  <div className="osm-fy-badge">
                    <span className="osm-fy-badge-name">{fiscalYearLabel(currentFy)}</span>
                    <span className="osm-fy-badge-dates">
                      {fmtDate(currentFy.start_date)} — {fmtDate(currentFy.end_date)}
                    </span>
                    <span className="osm-current-tag">الحالية</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* اسم الجهاز */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-device-desktop" />
                اسم الجهاز
              </label>
              <input
                className="osm-inp"
                type="text"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                placeholder="مثال: صندوق 1، كاشير أ..."
              />
            </div>

            {/* ملاحظة الجلسة (اختياري) */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-notes" />
                ملاحظة الجلسة (اختياري)
              </label>
              <input
                className="osm-inp"
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="مثال: وردية صباح..."
              />
            </div>

            {/* ملخص الاختيار */}
            {selectedWh && selectedFy && (
              <div className="osm-summary-bar">
                <span className="ic ic-xs"><i className="ti ti-check" /></span>
                <strong>{selectedWh.name}</strong>
                <span className="osm-summary-sep">·</span>
                <strong>{fiscalYearLabel(selectedFy)}</strong>
              </div>
            )}
          </div>
        )}

        {/* ════ Step 2: رأس مال الدرج ════ */}
        {step === 2 && (
          <div className="osm-body">
            <div className="osm-section-title">
              <i className="ti ti-wallet" />
              رأس مال الدرج
            </div>

            {/* المبلغ المُدخَل */}
            <div className="osm-cash-display">
              <div className="osm-cash-label">مبلغ الدرج</div>
              <div className="osm-cash-big" style={{ direction: 'ltr' }}>
                {cashNum > 0
                  ? cashNum.toLocaleString('fr-DZ')
                  : <span className="osm-cash-placeholder">0</span>
                }
                <span className="osm-cash-dzd">دج</span>
              </div>
              {cashNum > 0 && (
                <div className="osm-cash-words">
                  {formatDZD(cashNum)}
                </div>
              )}
            </div>

            {/* مبالغ سريعة */}
            <div className="osm-quick-grid">
              {QUICK_CASH.map(v => (
                <button
                  key={v}
                  type="button"
                  className={`osm-quick-btn ${cashNum === v ? 'on' : ''}`}
                  onClick={() => {
                    setCashMode('quick');
                    setOpeningCash(String(v));
                    setConfirmCash('');
                  }}
                >
                  {v === 0 ? 'بدون' : v.toLocaleString('fr-DZ')}
                </button>
              ))}
            </div>

            {/* Numpad */}
            <div className="osm-numpad">
              {['7','8','9','4','5','6','1','2','3','000','0','del'].map(k => (
                <button
                  key={k}
                  type="button"
                  className={`osm-npk ${k === 'del' ? 'del' : ''}`}
                  onClick={() => np(k)}
                >
                  {k === 'del' ? <i className="ti ti-backspace" /> : k}
                </button>
              ))}
            </div>

            {/* تأكيد المبلغ — يظهر فقط عند إدخال يدوي */}
            {cashNum > 0 && cashMode === 'manual' && (
              <div className="osm-field">
                <label className="osm-label">
                  <i className="ti ti-refresh" />
                  تأكيد المبلغ
                </label>
                <div className={`osm-confirm-inp-wrap ${!cashOk && confirmCash ? 'err' : ''}`}>
                  <input
                    className="osm-inp"
                    type="number"
                    value={confirmCash}
                    onChange={e => setConfirmCash(e.target.value)}
                    placeholder={String(cashNum)}
                    inputMode="numeric"
                  />
                  {cashOk && confirmCash && (
                    <i className="ti ti-check osm-confirm-ok" />
                  )}
                </div>
                {!cashOk && confirmCash && (
                  <div className="osm-field-err">
                    <i className="ti ti-alert-circle" /> المبلغان غير متطابقان
                  </div>
                )}
              </div>
            )}

            {/* ملخص الجلسة */}
            <div className="osm-session-preview">
              <div className="osm-preview-row">
                <i className="ti ti-building-warehouse" />
                <span>{selectedWh?.name}</span>
              </div>
              <div className="osm-preview-row">
                <i className="ti ti-calendar" />
                <span>{fiscalYearLabel(selectedFy!)}</span>
              </div>
              <div className="osm-preview-row">
                <i className="ti ti-device-desktop" />
                <span>{deviceName}</span>
              </div>
              <div className="osm-preview-row">
                <i className="ti ti-clock" />
                <span>{timeStr}</span>
              </div>
              {note && (
                <div className="osm-preview-row">
                  <i className="ti ti-notes" />
                  <span>{note}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="osm-error">
                <i className="ti ti-alert-circle" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ════ Footer ════ */}
        <div className="osm-footer">
          {step === 2 && (
            <button
              type="button"
              className="osm-btn-back"
              onClick={() => setStep(1)}
            >
              <i className="ti ti-arrow-right" /> رجوع
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 1 ? (
            <button
              type="button"
              className="osm-btn-next"
              onClick={() => setStep(2)}
              disabled={!canNext}
            >
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button
              type="button"
              className="osm-btn-open"
              onClick={handleOpen}
              disabled={!canOpen}
            >
              {isLoading ? (
                <><i className="ti ti-loader-2 spin" /> جاري الفتح...</>
              ) : (
                <><i className="ti ti-door-enter" /> فتح الجلسة</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
