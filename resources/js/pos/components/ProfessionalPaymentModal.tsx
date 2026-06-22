import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import type {
  CartTotals, CartItem, Party, PaymentMode, DocumentType, Currency, TreasuryAccount,
} from '@/types';
import { formatDZD } from '../utils/calculations';

export interface PaymentLine {
  id:               string;
  modeId:           number;
  amount:           string;
  refNote:          string;
  treasuryAccountId?: number | null;
}

export interface PaymentConfirmParams {
  amountPaid:   number;
  dueDate?:     string;
  note?:        string;
  docTypeCode?: string;
  payments?:    Array<{
    paymentModeId:      number;
    amount:             number;
    treasuryAccountId?: number | null;
  }>;
  currencyId?:  number | null;
}

interface Props {
  totals:           CartTotals;
  items:            CartItem[];
  client:           Party | null;
  paymentModes:     PaymentMode[];
  documentTypes:    DocumentType[];
  currencies?:      Currency[];
  treasuryAccounts?: TreasuryAccount[];
  totalTtcFinal:    number;
  onClose:          () => void;
  onConfirm:        (p: PaymentConfirmParams) => Promise<{ ok: boolean; message?: string }>;
}

const DOC_CODES = ['FV', 'BL', 'BCC', 'FA'] as const;
const DZD_BILLS = [200, 500, 1000, 2000, 5000];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Numpad({
  onDigit, onDot, onBackspace, onClear,
}: {
  onDigit:    (d: string) => void;
  onDot:      () => void;
  onBackspace:() => void;
  onClear:    () => void;
}) {
  const keys = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '.', '0', '⌫',
  ];

  return (
    <div className="pay-numpad">
      {keys.map(k => (
        <button
          key={k}
          className={`pay-npk${k === '⌫' ? ' del' : ''}`}
          onClick={() => {
            if (k === '⌫') onBackspace();
            else if (k === '.') onDot();
            else onDigit(k);
          }}
          type="button"
        >
          {k}
        </button>
      ))}
      <button
        className="pay-npk clear"
        onClick={onClear}
        type="button"
        style={{ gridColumn: 'span 3' }}
      >
        مسح
      </button>
    </div>
  );
}

function PaymentStatus({
  remaining, change, totalTtcFinal,
}: {
  remaining:     number;
  change:        number;
  totalTtcFinal: number;
}) {
  if (remaining > 0.009) {
    return (
      <div className="pay-status pay-status--deficit">
        <i className="ti ti-alert-circle" />
        <span>متبقٍ: <strong>{formatDZD(remaining)}</strong></span>
      </div>
    );
  }
  if (change > 0.009) {
    return (
      <div className="pay-status pay-status--change">
        <i className="ti ti-cash" />
        <span>الباقي للزبون: <strong>{formatDZD(change)}</strong></span>
      </div>
    );
  }
  return (
    <div className="pay-status pay-status--ok">
      <i className="ti ti-circle-check" />
      <span>المبلغ مكتمل ✓</span>
    </div>
  );
}

export default function ProfessionalPaymentModal({
  totals, items, client, paymentModes, documentTypes,
  currencies, treasuryAccounts, totalTtcFinal, onClose, onConfirm,
}: Props) {

  const defaultMode = paymentModes.find(m => m.is_default) ?? paymentModes[0];

  const [lines, setLines] = useState<PaymentLine[]>(() =>
    defaultMode
      ? [{ id: uid(), modeId: defaultMode.id, amount: totalTtcFinal.toFixed(2), refNote: '', treasuryAccountId: null }]
      : [],
  );

  const [docTypeCode,        setDocTypeCode]        = useState<string>('FV');
  const [dueDate,            setDueDate]            = useState('');
  const [note,               setNote]               = useState('');
  const [submitting,         setSubmitting]         = useState(false);
  const [error,              setError]              = useState('');
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(
    currencies?.find(c => c.is_base_currency)?.id ?? currencies?.[0]?.id ?? null,
  );

  const [activeLineId, setActiveLineId] = useState<string | null>(
    () => (defaultMode ? uid() : null),
  );

  const activeLineIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lines.length && !activeLineId) {
      setActiveLineId(lines[0].id);
    }
    activeLineIdRef.current = activeLineId;
  }, [lines, activeLineId]);

  const totalPaid = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
    [lines],
  );
  const remaining = Math.max(0, totalTtcFinal - totalPaid);
  const change    = totalPaid > totalTtcFinal + 0.009 ? totalPaid - totalTtcFinal : 0;
  const canSubmit = totalPaid > 0.009 && !submitting;

  const quickAmounts = useMemo(() => {
    const target = remaining > 0 ? remaining : totalTtcFinal;
    const bills = DZD_BILLS.filter(b => b >= Math.ceil(target / 100) * 100 - 500);
    const exact = Math.ceil(target);
    const result = Array.from(new Set([exact, ...bills])).sort((a, b) => a - b).slice(0, 5);
    return result;
  }, [remaining, totalTtcFinal]);

  const updateActiveLine = useCallback((fn: (prev: string) => string) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: fn(l.amount) } : l,
    ));
  }, []);

  const onDigit = useCallback((d: string) => {
    updateActiveLine(prev => {
      if (prev === '0' || prev === '') return d;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev + d;
    });
  }, [updateActiveLine]);

  const onDot = useCallback(() => {
    updateActiveLine(prev => prev.includes('.') ? prev : prev + '.');
  }, [updateActiveLine]);

  const onBackspace = useCallback(() => {
    updateActiveLine(prev => prev.length <= 1 ? '0' : prev.slice(0, -1));
  }, [updateActiveLine]);

  const onClear = useCallback(() => {
    updateActiveLine(() => '0');
  }, [updateActiveLine]);

  const applyQuickAmount = useCallback((amount: number) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: amount.toFixed(2) } : l,
    ));
  }, []);

  const addLine = useCallback(() => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    const newId = uid();
    setLines(prev => [
      ...prev,
      {
        id:      newId,
        modeId:  firstMode.id,
        amount:  Math.max(0, remaining).toFixed(2),
        refNote: '',
        treasuryAccountId: null,
      },
    ]);
    setActiveLineId(newId);
  }, [paymentModes, remaining]);

  const removeLine = useCallback((id: string) => {
    setLines(prev => {
      const next = prev.filter(l => l.id !== id);
      if (activeLineId === id && next.length) setActiveLineId(next[next.length - 1].id);
      return next;
    });
  }, [activeLineId]);

  const updateLine = useCallback(<K extends keyof PaymentLine>(
    id: string, key: K, val: PaymentLine[K],
  ) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l));
  }, []);

  const fillRemaining = useCallback((id: string) => {
    const others = lines.filter(l => l.id !== id).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const rem    = Math.max(0, totalTtcFinal - others);
    updateLine(id, 'amount', rem.toFixed(2));
  }, [lines, totalTtcFinal, updateLine]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');

    const payments = lines
      .filter(l => parseFloat(l.amount) > 0.009)
      .map(l => ({
        paymentModeId:      l.modeId,
        amount:             parseFloat(l.amount),
        treasuryAccountId:  l.treasuryAccountId ?? null,
      }));

    const res = await onConfirm({
      amountPaid: totalPaid,
      payments,
      docTypeCode,
      dueDate:    dueDate || undefined,
      note:       note || undefined,
      currencyId: selectedCurrencyId,
    });

    setSubmitting(false);
    if (!res.ok) setError(res.message ?? 'حدث خطأ غير متوقع');
  }, [canSubmit, lines, totalPaid, docTypeCode, dueDate, note, selectedCurrencyId, onConfirm]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')              { e.preventDefault(); onClose(); }
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSubmit, onClose]);

  const availableDocTypes = documentTypes.filter(t => DOC_CODES.includes(t.code as typeof DOC_CODES[number]));

  const getAccountsForMode = useCallback((modeId: number) => {
    if (!treasuryAccounts) return [];
    return treasuryAccounts;
  }, [treasuryAccounts]);

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-pay-v2"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:  780,
          display:   'grid',
          gridTemplateRows: 'auto 1fr auto',
          maxHeight: '92vh',
        }}
      >
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-credit-card" style={{ marginLeft: 6 }} />
            إتمام الدفع
            {client && (
              <span className="pay-client-chip">
                <i className="ti ti-user" style={{ fontSize: 11 }} />
                {client.name}
              </span>
            )}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        <div className="pay-v2-body">

          <div className="pay-v2-left">

            <div className="pay-v2-hero">
              <div className="pay-hero-label">الإجمالي المستحق</div>
              <div className="pay-hero-amount">{formatDZD(totalTtcFinal)}</div>
              {client && (
                <div className="pay-hero-client">
                  <i className="ti ti-user-circle" /> {client.name}
                </div>
              )}
            </div>

            <div className="pay-v2-summary">
              <div className="pvs-row">
                <span>HT</span>
                <span>{formatDZD(totals.total_ht)}</span>
              </div>
              {totals.total_discount > 0 && (
                <div className="pvs-row pvs-disc">
                  <span>خصم</span>
                  <span>- {formatDZD(totals.total_discount)}</span>
                </div>
              )}
              <div className="pvs-row">
                <span>TVA</span>
                <span>{formatDZD(totals.total_tva)}</span>
              </div>
              {totals.fiscal_stamp > 0 && (
                <div className="pvs-row">
                  <span>طابع مالي</span>
                  <span>{formatDZD(totals.fiscal_stamp)}</span>
                </div>
              )}
              <div className="pvs-row pvs-total">
                <span>الإجمالي</span>
                <strong>{formatDZD(totalTtcFinal)}</strong>
              </div>
            </div>

            <div className="pay-v2-section pay-v2-items">
              <div className="pay-v2-sec-title">المنتجات</div>
              <div className="pay-items-list">
                {items.map((item, idx) => (
                  <div key={item.id} className="pay-item-row">
                    <span className="pay-item-num">{idx + 1}</span>
                    {item.image_url && (
                      <img
                        className="pay-item-img"
                        src={item.image_url}
                        alt={item.product_name}
                        onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="pay-item-info">
                      <div className="pay-item-name">{item.product_name}</div>
                      <div className="pay-item-meta">{item.quantity} × {formatDZD(item.unit_price_ht)}</div>
                    </div>
                    <div className="pay-item-total">{formatDZD(item.total_ttc)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">نوع المستند</div>
              <div className="pay-doc-pills">
                {availableDocTypes.map(t => (
                  <button
                    key={t.id}
                    className={`pay-dpill ${docTypeCode === t.code ? 'on' : ''}`}
                    onClick={() => setDocTypeCode(t.code)}
                    type="button"
                  >
                    <span className="pay-dpill-code">{t.code}</span>
                    <span className="pay-dpill-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {currencies && currencies.length > 1 && (
              <div className="pay-v2-section">
                <div className="pay-v2-sec-title">العملة</div>
                <select
                  className="pay-v2-select"
                  value={selectedCurrencyId ?? ''}
                  onChange={e => setSelectedCurrencyId(e.target.value ? +e.target.value : null)}
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                      {c.is_base_currency ? ' (الرئيسية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">تاريخ الاستحقاق <span style={{ opacity: 0.5, fontWeight: 400 }}>(اختياري)</span></div>
              <input
                type="date"
                className="pay-v2-date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">ملاحظة</div>
              <textarea
                className="pay-v2-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="ملاحظة على الفاتورة..."
              />
            </div>
          </div>

          <div className="pay-v2-right">

            <div className="pay-v2-sec-title" style={{ marginBottom: 8 }}>وسائل الدفع</div>

            <div className="pay-lines-v2">
              {lines.map((line, idx) => {
                const accounts = getAccountsForMode(line.modeId);
                const isActive = activeLineId === line.id;
                return (
                  <div
                    key={line.id}
                    className={`pay-line-v2 ${isActive ? 'active' : ''} ${accounts.length > 0 ? 'has-treasury' : ''}`}
                    onClick={() => setActiveLineId(line.id)}
                  >
                    <div className="plv2-num">{idx + 1}</div>

                    <select
                      className="plv2-mode"
                      value={line.modeId}
                      onChange={e => updateLine(line.id, 'modeId', +e.target.value)}
                      onClick={e => e.stopPropagation()}
                    >
                      {paymentModes.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    <div className="plv2-amt-wrap">
                      <input
                        type="number"
                        className="plv2-amount"
                        value={line.amount}
                        onChange={e => updateLine(line.id, 'amount', e.target.value)}
                        onFocus={() => setActiveLineId(line.id)}
                        onClick={e => e.stopPropagation()}
                        placeholder="0.00"
                        dir="ltr"
                      />
                      <button
                        className="plv2-fill"
                        onClick={e => { e.stopPropagation(); fillRemaining(line.id); }}
                        title="تعبئة المتبقي"
                        type="button"
                      >
                        ≈
                      </button>
                    </div>

                    <input
                      type="text"
                      className="plv2-ref"
                      value={line.refNote}
                      onChange={e => updateLine(line.id, 'refNote', e.target.value)}
                      placeholder="مرجع..."
                      onClick={e => e.stopPropagation()}
                    />

                    {accounts.length > 0 && (
                      <select
                        className="plv2-treasury"
                        value={line.treasuryAccountId ?? ''}
                        onChange={e => updateLine(line.id, 'treasuryAccountId', e.target.value ? +e.target.value : null)}
                        onClick={e => e.stopPropagation()}
                        title="حساب الخزينة"
                      >
                        <option value="">— خزينة —</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}

                    {lines.length > 1 && (
                      <button
                        className="plv2-del"
                        onClick={e => { e.stopPropagation(); removeLine(line.id); }}
                        type="button"
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="btn btn-xs" onClick={addLine} type="button" style={{ marginTop: 6 }}>
              <i className="ti ti-plus" /> إضافة وسيلة دفع
            </button>

            <div style={{ margin: '12px 0 8px' }}>
              <PaymentStatus
                remaining={remaining}
                change={change}
                totalTtcFinal={totalTtcFinal}
              />
            </div>

            <div className="pay-v2-sec-title" style={{ marginBottom: 6 }}>مبالغ سريعة</div>
            <div className="pay-quick-amts">
              {quickAmounts.map(a => (
                <button
                  key={a}
                  className={`pay-qa-btn ${parseFloat(lines.find(l => l.id === activeLineId)?.amount ?? '0') === a ? 'on' : ''}`}
                  onClick={() => applyQuickAmount(a)}
                  type="button"
                >
                  {a.toLocaleString('ar-DZ')} دج
                </button>
              ))}
            </div>

            <div className="pay-v2-sec-title" style={{ margin: '10px 0 6px' }}>لوحة الأرقام</div>
            <Numpad
              onDigit={onDigit}
              onDot={onDot}
              onBackspace={onBackspace}
              onClear={onClear}
            />

            {error && (
              <div className="al al-r" style={{ marginTop: 10 }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
          </div>
        </div>

        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title="تأكيد الدفع — Ctrl+Enter"
            type="button"
            style={{ minWidth: 200, fontSize: 14 }}
          >
            {submitting
              ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
              : <>
                  <i className="ti ti-circle-check" />
                  تأكيد الدفع — {formatDZD(totalPaid)}
                  {change > 0.009 && (
                    <span style={{ marginRight: 8, fontSize: 12, opacity: 0.85 }}>
                      (باقٍ {formatDZD(change)})
                    </span>
                  )}
                </>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
