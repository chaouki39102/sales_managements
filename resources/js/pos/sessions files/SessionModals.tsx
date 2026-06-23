// ════════════════════════════════════════════════════════════════════════════
// pos/components/OpenSessionModal.tsx
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { Warehouse } from '@/types';
import type { FiscalYear } from '@/lib/api/core/types';

interface OpenSessionModalProps {
  warehouses:   Warehouse[];
  fiscalYears:  FiscalYear[];
  defaultWarehouseId?: number | null;
  defaultFiscalYearId?: number | null;
  onOpen: (data: {
    warehouse_id:   number;
    fiscal_year_id: number;
    opening_cash:   number;
    opening_note?:  string;
  }) => Promise<void>;
  isLoading: boolean;
  error?:    string | null;
}

export function OpenSessionModal({
  warehouses, fiscalYears, defaultWarehouseId, defaultFiscalYearId,
  onOpen, isLoading, error,
}: OpenSessionModalProps) {
  const defaultWh = defaultWarehouseId
    ?? warehouses.find(w => w.is_default)?.id
    ?? warehouses[0]?.id;

  const defaultFy = defaultFiscalYearId
    ?? fiscalYears.find(y => y.is_current)?.id
    ?? fiscalYears[0]?.id;

  const [warehouseId,   setWarehouseId]   = useState<number>(defaultWh ?? 0);
  const [fiscalYearId,  setFiscalYearId]  = useState<number>(defaultFy ?? 0);
  const [openingCash,   setOpeningCash]   = useState('');
  const [openingNote,   setOpeningNote]   = useState('');
  const [confirmCash,   setConfirmCash]   = useState('');
  const [step,          setStep]          = useState<1 | 2>(1);

  const cashNum    = parseFloat(openingCash) || 0;
  const confirmNum = parseFloat(confirmCash) || 0;
  const cashMatch  = confirmCash === '' || cashNum === confirmNum;

  const handleNext = () => {
    if (!warehouseId || !fiscalYearId) return;
    setStep(2);
  };

  const handleOpen = async () => {
    if (!cashMatch || isLoading) return;
    await onOpen({
      warehouse_id:   warehouseId,
      fiscal_year_id: fiscalYearId,
      opening_cash:   cashNum,
      opening_note:   openingNote || undefined,
    });
  };

  return (
    <div className="ov on" style={{ zIndex: 9998 }}>
      <div className="modal" style={{ maxWidth: 420 }}>

        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-door-enter" style={{ color: 'var(--em)', marginLeft: 8 }} />
              فتح جلسة بيع
            </div>
            <div className="m-sub">الخطوة {step} من 2</div>
          </div>
          {/* لا زر إغلاق — الجلسة إلزامية */}
        </div>

        {step === 1 ? (
          /* ── خطوة 1: المستودع والسنة المالية ── */
          <div className="m-body">
            <div className="fgrid c2">
              <div className="fg s2">
                <label className="req">المستودع</label>
                <select
                  value={warehouseId}
                  onChange={e => setWarehouseId(parseInt(e.target.value))}
                >
                  <option value="">اختر المستودع</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="fg s2">
                <label className="req">السنة المالية</label>
                <select
                  value={fiscalYearId}
                  onChange={e => setFiscalYearId(parseInt(e.target.value))}
                >
                  <option value="">اختر السنة</option>
                  {fiscalYears.filter(y => !y.is_closed).map(y => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? '(الحالية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* ── خطوة 2: رأس مال الدرج ── */
          <div className="m-body">
            <div style={{
              background: 'var(--emb)', border: '1px solid var(--embo)',
              borderRadius: 'var(--r3)', padding: '14px 16px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700, marginBottom: 4 }}>
                المستودع المختار
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--em)' }}>
                {warehouses.find(w => w.id === warehouseId)?.name}
              </div>
            </div>

            <div className="fgrid c2">
              <div className="fg s2">
                <label>رأس مال الدرج (الأموال الموضوعة في الصندوق)</label>
                <div className="inp-row">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={openingCash}
                    onChange={e => setOpeningCash(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoFocus
                  />
                  <div className="inp-suf">دج</div>
                </div>
                <div className="fg-hint">المبلغ الموجود في الدرج قبل بدء البيع</div>
              </div>

              <div className="fg s2">
                <label>تأكيد المبلغ</label>
                <div className="inp-row">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={confirmCash}
                    onChange={e => setConfirmCash(e.target.value)}
                    placeholder="أعد إدخال المبلغ"
                    inputMode="numeric"
                    style={{ borderColor: !cashMatch && confirmCash ? 'var(--red)' : undefined }}
                  />
                  <div className="inp-suf">دج</div>
                </div>
                {!cashMatch && confirmCash && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                    المبلغان غير متطابقان
                  </div>
                )}
              </div>

              <div className="fg s2">
                <label>ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={openingNote}
                  onChange={e => setOpeningNote(e.target.value)}
                  placeholder="مثال: صندوق صباح، وردية أولى..."
                />
              </div>
            </div>

            {error && (
              <div className="al al-r" style={{ marginTop: 8 }}>
                <i className="ti ti-alert-circle" />
                <div>{error}</div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="m-foot">
          {step === 2 && (
            <button className="btn" onClick={() => setStep(1)} type="button">
              <i className="ti ti-arrow-right" /> رجوع
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 1 ? (
            <button
              className="btn btn-p"
              onClick={handleNext}
              disabled={!warehouseId || !fiscalYearId}
              type="button"
            >
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button
              className="btn btn-p"
              onClick={handleOpen}
              disabled={isLoading || !cashMatch}
              type="button"
            >
              {isLoading
                ? <><i className="ti ti-loader" /> جاري الفتح...</>
                : <><i className="ti ti-door-enter" /> فتح الجلسة</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// pos/components/CloseSessionModal.tsx
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import type { PosSession } from '@/lib/api/endpoints/posSession';

interface CloseSessionModalProps {
  session:   PosSession;
  onClose:   () => void;           // إغلاق المودال بدون إنهاء الجلسة
  onConfirm: (data: {
    closing_cash_counted: number;
    closing_note?:        string;
  }) => Promise<void>;
  isLoading: boolean;
  error?:    string | null;
}

export function CloseSessionModal({
  session, onClose, onConfirm, isLoading, error,
}: CloseSessionModalProps) {
  const [counted,  setCounted]  = useState('');
  const [note,     setNote]     = useState('');
  const [step,     setStep]     = useState<'review' | 'count' | 'confirm'>('review');

  const countedNum = parseFloat(counted) || 0;
  const expected   = session.opening_cash + session.cash_collected;
  const difference = countedNum - expected;
  const isShort    = difference < 0;
  const isOver     = difference > 0;

  // إجمالي أوقات الجلسة
  const duration = session.duration;
  const openedAt = new Date(session.opened_at).toLocaleString('ar-DZ');

  const paymentRows = useMemo(() =>
    session.payments.filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount),
    [session.payments],
  );

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm({
      closing_cash_counted: countedNum,
      closing_note:         note || undefined,
    });
  };

  return (
    <div className="ov on" onClick={e => e.stopPropagation()} style={{ zIndex: 9998 }}>
      <div className="modal modal-lg" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-door-exit" style={{ color: 'var(--red)', marginLeft: 8 }} />
              إغلاق الجلسة
            </div>
            <div className="m-sub">
              {session.user?.name} — {session.warehouse?.name} — فُتحت في {openedAt}
            </div>
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tabs */}
        <div className="pos-set-tabs">
          {[
            { key: 'review',  label: 'ملخص الجلسة' },
            { key: 'count',   label: 'جرد الصندوق'  },
            { key: 'confirm', label: 'تأكيد الإغلاق' },
          ].map(t => (
            <button
              key={t.key}
              className={`pos-set-tab ${step === t.key ? 'on' : ''}`}
              onClick={() => setStep(t.key as any)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="m-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── مراجعة الجلسة ── */}
          {step === 'review' && (
            <div>
              {/* KPIs */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12, marginBottom: 20,
              }}>
                {[
                  { label: 'عدد الفواتير',     value: session.invoices_count,            icon: 'ti-receipt',       color: 'var(--em)'  },
                  { label: 'إجمالي المبيعات',   value: formatDZD(session.gross_sales),    icon: 'ti-cash',          color: 'var(--gold)' },
                  { label: 'مبيعات صافية',      value: formatDZD(session.net_sales),      icon: 'ti-trending-up',   color: 'var(--em)'  },
                  { label: 'متوسط الفاتورة',    value: formatDZD(session.avg_invoice),    icon: 'ti-chart-bar',     color: 'var(--blue)' },
                  { label: 'أعلى فاتورة',       value: formatDZD(session.highest_invoice),icon: 'ti-arrow-up-right',color: 'var(--purple)'},
                  { label: 'مرتجعات',           value: formatDZD(session.returns_total),  icon: 'ti-receipt-refund',color: 'var(--red)'  },
                  { label: 'إجمالي TVA',        value: formatDZD(session.total_tva),      icon: 'ti-percentage',    color: 'var(--teal)' },
                  { label: 'خصومات مُمنوحة',    value: formatDZD(session.total_discount), icon: 'ti-discount',      color: 'var(--orange)'},
                  { label: 'مدة الجلسة',        value: duration,                          icon: 'ti-clock',         color: 'var(--t3)'  },
                ].map(kpi => (
                  <div
                    key={kpi.label}
                    style={{
                      padding: '12px 14px', borderRadius: 'var(--r2)',
                      background: 'var(--bg3)', border: '1px solid var(--b2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <i className={`ti ${kpi.icon}`} style={{ color: kpi.color, fontSize: 15 }} />
                      <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700 }}>{kpi.label}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--t1)' }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* وسائل الدفع */}
              {paymentRows.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t2)', marginBottom: 8 }}>
                    <i className="ti ti-credit-card" style={{ marginLeft: 6 }} /> توزيع وسائل الدفع
                  </div>
                  {paymentRows.map(p => (
                    <div key={p.payment_mode_id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '7px 12px', background: 'var(--bg3)',
                      borderRadius: 'var(--r1)', marginBottom: 4,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                        <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 8 }}>
                          ({p.count} عملية)
                        </span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 900, direction: 'ltr' }}>
                        {formatDZD(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* أكثر المنتجات */}
              {session.top_products?.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t2)', marginBottom: 8 }}>
                    <i className="ti ti-package" style={{ marginLeft: 6 }} /> أكثر 10 منتجات مبيعاً
                  </div>
                  {session.top_products.slice(0, 10).map((p, i) => (
                    <div key={p.product_id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', background: i % 2 === 0 ? 'var(--bg3)' : 'transparent',
                      borderRadius: 'var(--r1)',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', width: 20, textAlign: 'center' }}>
                        #{i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13 }}>{p.product_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>×{p.quantity_sold}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, direction: 'ltr' }}>
                        {formatDZD(p.total_ttc)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── جرد الصندوق ── */}
          {step === 'count' && (
            <div className="fgrid c2">
              <div className="fg s2">
                <div style={{
                  padding: '14px 16px', background: 'var(--emb)',
                  borderRadius: 'var(--r2)', border: '1px solid var(--embo)',
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700 }}>المبلغ المتوقع في الدرج</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--em)', direction: 'ltr' }}>
                    {formatDZD(expected)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
                    رأس مال أولي ({formatDZD(session.opening_cash)}) + مبيعات نقدية ({formatDZD(session.cash_collected)})
                  </div>
                </div>
              </div>

              <div className="fg s2">
                <label className="req">المبلغ الفعلي الذي عددته في الدرج</label>
                <div className="inp-row">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={counted}
                    onChange={e => setCounted(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    autoFocus
                  />
                  <div className="inp-suf">دج</div>
                </div>
              </div>

              {counted !== '' && (
                <div className="fg s2">
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--r2)',
                    background: isShort ? 'var(--redb)' : isOver ? 'var(--goldb)' : 'var(--greenb)',
                    border: `1px solid ${isShort ? 'var(--redbo)' : isOver ? 'var(--goldbo)' : 'var(--greenbo)'}`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)' }}>الفرق</div>
                    <div style={{
                      fontSize: 26, fontWeight: 900, direction: 'ltr',
                      color: isShort ? 'var(--red)' : isOver ? 'var(--gold)' : 'var(--green)',
                    }}>
                      {difference >= 0 ? '+' : ''}{formatDZD(difference)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
                      {isShort
                        ? '⚠️ الصندوق ناقص — يُنصح بإعادة العدّ'
                        : isOver
                        ? '⚠️ الصندوق زائد — تحقق من الحسابات'
                        : '✅ الصندوق متطابق'
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="fg s2">
                <label>ملاحظة على الجرد</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="أي ملاحظة على الصندوق أو اختلاف المبالغ..."
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'Tajawal, sans-serif' }}
                />
              </div>
            </div>
          )}

          {/* ── تأكيد الإغلاق ── */}
          {step === 'confirm' && (
            <div>
              {/* ملخص الإغلاق */}
              <div style={{ marginBottom: 20 }}>
                {[
                  { label: 'المبيعات الصافية',   value: formatDZD(session.net_sales),   em: true },
                  { label: 'عدد الفواتير',       value: session.invoices_count, em: false },
                  { label: 'نقداً محصَّل',        value: formatDZD(session.cash_collected), em: false },
                  { label: 'المبلغ المتوقع بالدرج', value: formatDZD(expected), em: false },
                  { label: 'المبلغ الفعلي بالدرج', value: counted ? formatDZD(countedNum) : 'لم يُدخَل', em: false },
                  { label: 'الفرق',             value: counted ? (difference >= 0 ? '+' : '') + formatDZD(difference) : '—', em: true, danger: isShort },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px', borderBottom: '1px solid var(--b1)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--t3)' }}>{row.label}</span>
                    <span style={{
                      fontSize: 14, fontWeight: row.em ? 900 : 700,
                      color: row.danger ? 'var(--red)' : row.em ? 'var(--em)' : 'var(--t1)',
                      direction: 'ltr',
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="al al-r" style={{ marginBottom: 0 }}>
                <i className="ti ti-alert-triangle" />
                <div>
                  بعد إغلاق الجلسة لا يمكن إجراء مبيعات جديدة حتى تفتح جلسة جديدة.
                  تأكد من مراجعة الأرقام قبل التأكيد.
                </div>
              </div>

              {error && (
                <div className="al al-r" style={{ marginTop: 12 }}>
                  <i className="ti ti-alert-circle" />
                  <div>{error}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إلغاء</button>
          <div style={{ flex: 1 }} />
          {step !== 'confirm' ? (
            <button
              className="btn btn-p"
              onClick={() => setStep(step === 'review' ? 'count' : 'confirm')}
              type="button"
            >
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button
              className="btn"
              style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
              onClick={handleConfirm}
              disabled={isLoading}
              type="button"
            >
              {isLoading
                ? <><i className="ti ti-loader" /> جاري الإغلاق...</>
                : <><i className="ti ti-door-exit" /> تأكيد إغلاق الجلسة</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// تصدير للاستخدام في POSPage
// ════════════════════════════════════════════════════════════════════════════
export { formatDZD } from '@/pos/utils/calculations';
