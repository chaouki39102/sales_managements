// pos/components/PaymentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { CartTotals, Party, PaymentMode } from '@/types';
import { formatDZD, calcChange } from '../utils/calculations';

type PayMethod = 'cash' | 'cib' | 'ccp' | 'bank' | 'credit' | 'split';

interface PaymentModalProps {
  open:         boolean;
  totals:       CartTotals;
  client:       Party | null;
  paymentModes: PaymentMode[];
  onClose:      () => void;
  onConfirm:    (params: {
    paymentModeId:     number;
    treasuryAccountId?: number;
    amountPaid:        number;
    dueDate?:          string;
    note?:             string;
  }) => Promise<{ ok: boolean; message?: string }>;
}

const PAYMENT_BTNS: { method: PayMethod; icon: string; label: string }[] = [
  { method:'cash',   icon:'💵', label:'نقداً'   },
  { method:'cib',    icon:'💳', label:'CIB'     },
  { method:'ccp',    icon:'📮', label:'CCP'     },
  { method:'bank',   icon:'🏦', label:'تحويل'   },
  { method:'credit', icon:'📋', label:'آجل'     },
  { method:'split',  icon:'✂️', label:'مختلط'  },
];

export default function PaymentModal({
  open, totals, client, paymentModes, onClose, onConfirm,
}: PaymentModalProps) {
  const totalTtc  = totals.total_ttc + totals.fiscal_stamp;
  const [method,  setMethod]  = useState<PayMethod>('cash');
  const [given,   setGiven]   = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Split amounts
  const [splitCash, setSplitCash] = useState('');
  const [splitCib,  setSplitCib]  = useState('');
  const [splitCr,   setSplitCr]   = useState('');

  // Reset when opened
  useEffect(() => {
    if (open) {
      setGiven('');
      setError('');
      setMethod('cash');
      setSplitCash('');
      setSplitCib('');
      setSplitCr('');
    }
  }, [open]);

  // Numpad
  const np = useCallback((key: string) => {
    setGiven(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      return prev + key;
    });
  }, []);

  const givenNum  = parseFloat(given || '0') || 0;
  const change    = calcChange(givenNum, totals.total_ttc, totals.fiscal_stamp);

  const splitSum  = (parseFloat(splitCash || '0') || 0)
                  + (parseFloat(splitCib  || '0') || 0)
                  + (parseFloat(splitCr   || '0') || 0);
  const splitDiff = splitSum - totalTtc;

  // Quick amounts
  const quickAmounts = [
    totalTtc,
    Math.ceil(totalTtc / 500) * 500,
    Math.ceil(totalTtc / 1000) * 1000,
    Math.ceil(totalTtc / 2000) * 2000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totalTtc).slice(0, 4);

  const handleConfirm = async () => {
    setError('');
    let amountPaid = totalTtc;
    if (method === 'cash') amountPaid = givenNum || totalTtc;
    if (method === 'credit') amountPaid = 0;

    // Find payment mode id
    const modeMap: Record<PayMethod, string> = {
      cash: 'cash', cib: 'cib', ccp: 'ccp', bank: 'bank', credit: 'credit', split: 'mixed',
    };
    const pm = paymentModes.find(p => p.code === modeMap[method]) ?? paymentModes[0];

    setLoading(true);
    const res = await onConfirm({
      paymentModeId: pm?.id ?? 1,
      amountPaid,
      dueDate: method === 'credit' ? dueDate : undefined,
      note: note || undefined,
    });
    setLoading(false);

    if (!res.ok) { setError(res.message ?? 'فشل الحفظ'); return; }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="m-hd" style={{ padding: '12px 16px' }}>
          <div>
            <div className="m-title">
              <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check" /></span>
              تأكيد البيع
            </div>
            <div className="m-sub">
              {totals.lines_count} صنف — {totals.items_count} وحدة
            </div>
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* Hero amount */}
        <div className="pay-amount-hero">
          <div className="pay-ttc-label">المبلغ الإجمالي TTC</div>
          <div className="pay-ttc-big">{formatDZD(totalTtc)}</div>
          <div className="pay-client-badge">
            <span className="ic ic-xs"><i className="ti ti-user" /></span>
            <span>{client?.name ?? 'زبون عابر'}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="pay-breakdown">
          <div className="pay-bd-c">
            <div className="pay-bd-l">HT</div>
            <div className="pay-bd-v">{formatDZD(totals.total_ht)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">TVA</div>
            <div className="pay-bd-v">{formatDZD(totals.total_tva)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">خصم</div>
            <div className="pay-bd-v" style={{ color: 'var(--red)' }}>
              {totals.total_discount > 0 ? `- ${formatDZD(totals.total_discount)}` : '—'}
            </div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">طابع</div>
            <div className="pay-bd-v">{totals.fiscal_stamp > 0 ? formatDZD(totals.fiscal_stamp) : '—'}</div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 'calc(95vh - 230px)' }}>

          {/* Payment method pills */}
          <div className="pay-m-grid">
            {PAYMENT_BTNS.map(({ method: m, icon, label }) => (
              <button
                key={m}
                className={`pmpill ${method === m ? 'on' : ''}`}
                onClick={() => setMethod(m)}
              >
                <span className="pmi">{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* CASH */}
          {method === 'cash' && (
            <div>
              <div className="pay-cash-sec">
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>
                  المبلغ المُسلَّم
                </label>
                <input
                  type="number"
                  className="given-inp"
                  placeholder="0"
                  value={given}
                  onChange={e => setGiven(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              {/* Quick amounts */}
              <div className="qamts">
                {quickAmounts.map(v => (
                  <button key={v} className="qamt" onClick={() => setGiven(String(v))}>
                    {v.toLocaleString('fr-DZ')}
                  </button>
                ))}
              </div>
              {/* Change */}
              <div className="change-display">
                <span className="change-lbl2">الباقي للزبون</span>
                <span className="change-val2" style={{ color: change >= 0 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(change)}
                </span>
              </div>
              {/* Numpad */}
              <div className="numpad" id="numpad-grid">
                {['7','8','9','4','5','6','1','2','3'].map(k => (
                  <button key={k} className="npk" onClick={() => np(k)}>{k}</button>
                ))}
                <button className="npk del" onClick={() => np('del')}>
                  <span className="ic ic-xs"><i className="ti ti-backspace" /></span>
                </button>
                <button className="npk zero" onClick={() => np('0')}>0</button>
              </div>
            </div>
          )}

          {/* SPLIT */}
          {method === 'split' && (
            <div className="pay-split-sec" style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--t3)', marginBottom: 10 }}>
                الدفع المختلط
              </div>
              {[
                { label: 'نقداً', val: splitCash, set: setSplitCash },
                { label: 'CIB',   val: splitCib,  set: setSplitCib  },
                { label: 'آجل',   val: splitCr,   set: setSplitCr   },
              ].map(({ label, val, set }) => (
                <div className="split-row" key={label}>
                  <span className="split-lbl">{label}</span>
                  <input
                    type="number"
                    className="split-inp"
                    placeholder="0"
                    value={val}
                    onChange={e => set(e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                </div>
              ))}
              <div className="change-display">
                <span className="change-lbl2">الفارق</span>
                <span className="change-val2" style={{ color: Math.abs(splitDiff) < 1 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(splitDiff)}
                </span>
              </div>
            </div>
          )}

          {/* CREDIT */}
          {method === 'credit' && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-b" style={{ borderRadius: 'var(--r2)', marginBottom: 10 }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-info-circle" /></span>
                <div>بيع آجل — سيُسجَّل في ديون العملاء تلقائياً عند التأكيد.</div>
              </div>
              <div className="fg">
                <label>تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* ELECTRONIC */}
          {(method === 'cib' || method === 'ccp' || method === 'bank') && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-g" style={{ borderRadius: 'var(--r2)' }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-check" /></span>
                <div>الدفع الإلكتروني — المبلغ الكامل يُسدَّد مباشرة.</div>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="pay-note-sec" style={{ padding: '4px 14px 8px' }}>
            <label>ملاحظة على الفاتورة</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="اختياري..."
              style={{ width: '100%', padding: '6px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: '12.5px', outline: 'none' }}
            />
          </div>

          {error && (
            <div className="al al-r" style={{ margin: '0 14px 8px', borderRadius: 'var(--r2)', fontSize: 12 }}>
              <span className="ic ic-xs"><i className="ti ti-alert-circle" /></span>
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <span className="ic ic-xs"><i className="ti ti-loader" /></span>
            ) : (
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
            )}
            {loading ? 'جاري الحفظ...' : 'تأكيد وطباعة'}
          </button>
        </div>
      </div>
    </div>
  );
}
