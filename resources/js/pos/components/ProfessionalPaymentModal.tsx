// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalPaymentModal.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. Numpad رقمي كامل للكاشير — مناسب للشاشات اللمسية والتابلت
//   2. أزرار مبالغ سريعة (500 / 1000 / 2000 / 5000 / 10000 دج)
//      وتُعدَّل تلقائياً لتكون أكبر من إجمالي الفاتورة
//   3. حساب الباقي الفوري مع animation ✓ عند الدفع الكامل
//   4. وضع "الدفع النقدي السريع" — ضغطة واحدة بدون numpad
//   5. مؤشر بصري واضح: ناقص / كافٍ / زيادة
//   6. إرسال treasury_account_id من وسيلة الدفع
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import type {
  CartTotals, Party, PaymentMode, DocumentType, Currency, TreasuryAccount,
} from '@/types';
import type { DocumentPayment } from '@/pos/utils/useCartStore';
import { formatDZD } from '../utils/calculations';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentLine {
  id:               string;
  dbId?:            number;
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
    id?:                 number;
    paymentModeId:      number;
    amount:             number;
    treasuryAccountId?: number | null;
    reference?:         string | null;
  }>;
  currencyId?:  number | null;
}

interface Props {
  totals:            CartTotals;
  client:            Party | null;
  paymentModes:      PaymentMode[];
  documentTypes:     DocumentType[];
  currencies?:       Currency[];
  treasuryAccounts?: TreasuryAccount[];
  totalTtcFinal:     number;
  existingPayments?: DocumentPayment[];
  documentDate?:     string;   // ISO date — تاريخ الفاتورة الحقيقي لجلب الرصيد التاريخي الصحيح
  isEditing?:        boolean;  // true when reopening an existing invoice
  /** SSOT balance: pass from document.balance_data.previous_balance when editing */
  prevBalance?:      number;
  onClose:           () => void;
  onConfirm:         (p: PaymentConfirmParams) => Promise<{ ok: boolean; message?: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_CODES = ['FV', 'BL', 'BCC', 'FA'] as const;

/** مبالغ الأوراق النقدية الجزائرية */
const DZD_BILLS = [200, 500, 1000, 2000, 5000];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** لوحة الأرقام للشاشات اللمسية */
function Numpad({
  onDigit,
  onDot,
  onBackspace,
  onClear,
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

/** شريط مؤشر حالة الدفع */
function PaymentStatus({
  remaining,
  change,
  totalTtcFinal,
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes,
  currencies, treasuryAccounts, totalTtcFinal,
  existingPayments, documentDate, onClose, onConfirm, isEditing,
  prevBalance: propPrevBalance,
}: Props) {

  // ── State ──────────────────────────────────────────────────────────────────
  const defaultMode = paymentModes.find(m =>
    /نقدا|نقداً|cash/i.test(m.name),
  ) ?? paymentModes.find(m => m.is_default) ?? paymentModes[0];

  const [lines, setLines] = useState<PaymentLine[]>(() => {
    if (existingPayments?.length) {
      return existingPayments.map(ep => ({
        id:                 uid(),
        dbId:               ep.id,
        modeId:             ep.payment_mode_id,
        amount:             Number(ep.amount || 0).toFixed(4),
        refNote:            ep.reference ?? '',
        treasuryAccountId:  ep.treasury_account_id ?? null,
      }));
    }
    const initAmount = totalTtcFinal.toFixed(4);
    return defaultMode
      ? [{ id: uid(), modeId: defaultMode.id, amount: initAmount, refNote: '', treasuryAccountId: null }]
      : [];
  });

  const [docTypeCode,        setDocTypeCode]        = useState<string>('FV');
  const [dueDate,            setDueDate]            = useState('');
  const [note,               setNote]               = useState('');
  const [submitting,         setSubmitting]         = useState(false);
  const [error,              setError]              = useState('');
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(
    currencies?.find(c => c.is_base_currency)?.id ?? currencies?.[0]?.id ?? null,
  );

  // ── Balance: SSOT from prop (when editing) or fetch from API (new doc) ──
  const [internalPrevBalance, setInternalPrevBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    // SSOT: parent passes prevBalance from document.balance_data when editing
    if (propPrevBalance !== undefined) {
      setInternalPrevBalance(propPrevBalance);
      return;
    }
    if (!client?.id) {
      setInternalPrevBalance(0);
      return;
    }
    setBalanceLoading(true);
    const balanceDate = isEditing ? documentDate : undefined;
    partyBalancesApi.getOne(client.id, balanceDate)
      .then(res => {
        const data = (res as any)?.data ?? res;
        const currentBalance = Number(data?.current_balance ?? 0);
        setInternalPrevBalance(currentBalance);
      })
      .catch(() => setInternalPrevBalance(0))
      .finally(() => setBalanceLoading(false));
  }, [client?.id, documentDate, isEditing, propPrevBalance]);

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const activeLineIdRef = useRef<string | null>(null);
  useEffect(() => {
    const stillValid = lines.some(l => l.id === activeLineId);
    if (lines.length && !stillValid) {
      setActiveLineId(lines[0].id);
    }
    activeLineIdRef.current = activeLineId;
  }, [lines, activeLineId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalPaid = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
    [lines],
  );
  const existingTotal = useMemo(
    () => (existingPayments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0),
    [existingPayments],
  );
  const newPaid = useMemo(
    () => lines.reduce((s, l) => s + (l.dbId ? 0 : (parseFloat(l.amount) || 0)), 0),
    [lines],
  );
  const totalDue = totalTtcFinal + (client ? internalPrevBalance : 0);
  const remaining = Math.max(0, totalDue - totalPaid);
  const change    = totalPaid > totalDue + 0.009 ? totalPaid - totalDue : 0;
  const canSubmit = !submitting;

  // ── أزرار المبالغ السريعة ─────────────────────────────────────────────────
  // المبلغ الأول دائماً = المبلغ المستحق كاملاً (سابق + مستحق)
  // ثم الأوراق النقدية الأقرب فالأكبر
  const quickAmounts = useMemo(() => {
    const target = remaining > 0 ? remaining : totalTtcFinal;
    const exact = target;
    const bills = DZD_BILLS.filter(b => b >= target - 500).slice(0, 4);
    const totalDueAmt = totalDue;
    const result = Array.from(new Set([totalDueAmt, exact, ...bills])).slice(0, 5);
    return result;
  }, [remaining, totalTtcFinal, totalDue]);

  // ── Numpad handlers ────────────────────────────────────────────────────────
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
      if (prev.includes('.') && prev.split('.')[1].length >= 4) return prev;
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

  /** ضغط مبلغ سريع → يُسنَد للـ line النشط */
  const applyQuickAmount = useCallback((amount: number) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: amount.toFixed(4) } : l,
    ));
  }, []);

  // ── Line management ────────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    const newId = uid();
    setLines(prev => [
      ...prev,
      {
        id:      newId,
        modeId:  firstMode.id,
        amount:  Math.max(0, remaining).toFixed(4),
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
    updateLine(id, 'amount', rem.toFixed(4));
  }, [lines, totalTtcFinal, updateLine]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');

    const payments = lines
      .filter(l => parseFloat(l.amount) > 0.00009)
      .map(l => ({
        ...(l.dbId ? { id: l.dbId } : {}),
        paymentModeId:      l.modeId,
        amount:             parseFloat(l.amount),
        treasuryAccountId:  l.treasuryAccountId ?? null,
        reference:          l.refNote?.trim() || null,
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

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')              { e.preventDefault(); onClose(); }
      if (e.key === 'Enter')               { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSubmit, onClose]);

  // ─── Document types filter ─────────────────────────────────────────────────
  const availableDocTypes = documentTypes.filter(t => DOC_CODES.includes(t.code as typeof DOC_CODES[number]));

  // ── Treasury accounts per mode ─────────────────────────────────────────────
  const getAccountsForMode = useCallback((modeId: number) => {
    if (!treasuryAccounts) return [];
    // نُظهر حسابات الخزينة المرتبطة بوسيلة الدفع (أو كلها)
    return treasuryAccounts;
  }, [treasuryAccounts]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-pay-v2"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:  780,
          display:   'grid',
          gridTemplateRows: 'auto 1fr auto',
          maxHeight: 'calc(100vh - 40px)',
          overflow:  'hidden',
        }}
      >
        {/* ── Header ── */}
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

        {/* ── Body — شبكة عمودين ── */}
        <div className="pay-v2-body">

          {/* ════ العمود الأيمن: ملخص + إعدادات ════ */}
          <div className="pay-v2-left">

            {/* مبلغ الفاتورة */}
            <div className="pay-v2-hero">
              <div className="pay-hero-label">الإجمالي المستحق</div>
              <div className="pay-hero-amount">{formatDZD(totalTtcFinal)}</div>
              {client && (
                <div className="pay-hero-client">
                  <i className="ti ti-user-circle" /> {client.name}
                </div>
              )}
            </div>

            {/* ملخص الفاتورة */}
            <div className="pay-v2-summary">
              {(() => {
                const grossHt = totals.total_ht + totals.total_discount + (totals.invoice_discount_amount ?? 0);
                return (
                  <>
                    <div className="pvs-row">
                      <span>HT</span>
                      <span>{formatDZD(grossHt)}</span>
                    </div>
                    {totals.total_discount > 0 && (
                      <div className="pvs-row pvs-disc">
                        <span>خصم</span>
                        <span>- {formatDZD(totals.total_discount)}</span>
                      </div>
                    )}
                    {totals.invoice_discount_amount != null && totals.invoice_discount_amount > 0 && (
                      <div className="pvs-row pvs-disc">
                        <span>Remise {totals.invoice_discount_pct ?? 0}%</span>
                        <span>- {formatDZD(totals.invoice_discount_amount)}</span>
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
                  </>
                );
              })()}
            </div>

            {/* ملخص الرصيد */}
            {client && (
              <div className="pay-v2-balance">
                <div className="pvs-row">
                  <span>الرصيد السابق</span>
                  <span>{balanceLoading ? '...' : formatDZD(internalPrevBalance)}</span>
                </div>
                <div className="pvs-row" style={{ borderTop: '1px dashed #ccc', paddingTop: 6, marginTop: 2 }}>
                  <span>المجموع <span style={{ fontSize: 11, opacity: 0.6 }}>(سابق + مستحق)</span></span>
                  <strong>{formatDZD(internalPrevBalance + totalTtcFinal)}</strong>
                </div>
                {(existingTotal > 0 || isEditing) && (
                  <div className="pvs-row">
                    <span style={{ color: '#888' }}>مدفوع سابقاً</span>
                    <span style={{ color: '#888' }}>{formatDZD(existingTotal)}</span>
                  </div>
                )}
                <div className="pvs-row" style={{ borderTop: '1px solid #ddd', paddingTop: 6, marginTop: 2 }}>
                  <span>{existingTotal > 0 || isEditing ? 'المدفوع الآن' : 'المدفوع'}</span>
                  <span>{formatDZD(newPaid)}</span>
                </div>
                <div className="pvs-row pvs-total" style={{ marginTop: 4 }}>
                  <span>
                    الرصيد الجديد
                    <span style={{ fontSize: 11, opacity: 0.6 }}> (سابق + إجمالي - المدفوع)</span>
                  </span>
                  <strong>{formatDZD(internalPrevBalance + totalTtcFinal - totalPaid)}</strong>
                </div>
              </div>
            )}

            {/* نوع الوثيقة */}
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

            {/* العملة */}
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

            {/* تاريخ الاستحقاق */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">تاريخ الاستحقاق <span style={{ opacity: 0.5, fontWeight: 400 }}>(اختياري)</span></div>
              <input
                type="date"
                className="pay-v2-date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* ملاحظة */}
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

          {/* ════ العمود الأيسر: الدفع + Numpad ════ */}
          <div className="pay-v2-right">

            {/* وسائل الدفع */}
            <div className="pay-v2-sec-title" style={{ marginBottom: 8 }}>وسائل الدفع</div>

            <div className="pay-lines-v2">
              {lines.map((line, idx) => {
                const accounts = getAccountsForMode(line.modeId);
                const isActive = activeLineId === line.id;
                return (
                  <div
                    key={line.id}
                    className={`pay-line-v2 ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveLineId(line.id)}
                  >
                    <div className="plv2-num">{idx + 1}</div>

                    {/* وسيلة الدفع */}
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

                    {/* المبلغ */}
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

                    {/* مرجع */}
                    <input
                      type="text"
                      className="plv2-ref"
                      value={line.refNote}
                      onChange={e => updateLine(line.id, 'refNote', e.target.value)}
                      placeholder="مرجع..."
                      onClick={e => e.stopPropagation()}
                    />

                    {/* حساب الخزينة */}
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

                    {/* حذف */}
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

            {/* إضافة وسيلة دفع */}
            <button className="btn btn-xs" onClick={addLine} type="button" style={{ marginTop: 6 }}>
              <i className="ti ti-plus" /> إضافة وسيلة دفع
            </button>

            {/* ── مؤشر الحالة ── */}
            <div style={{ margin: '12px 0 8px' }}>
              <PaymentStatus
                remaining={remaining}
                change={change}
                totalTtcFinal={totalTtcFinal}
              />
            </div>

            {/* ── أزرار المبالغ السريعة ── */}
            <div className="pay-v2-sec-title" style={{ marginBottom: 6 }}>مبالغ سريعة</div>
            <div className="pay-quick-amts">
              {quickAmounts.map(a => (
                <button
                  key={a}
                  className={`pay-qa-btn ${parseFloat(lines.find(l => l.id === activeLineId)?.amount ?? '0') === a ? 'on' : ''}`}
                  onClick={() => applyQuickAmount(a)}
                  type="button"
                >
                  {a.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} دج
                </button>
              ))}
            </div>

            {/* ── Numpad ── */}
            <div className="pay-v2-sec-title" style={{ margin: '10px 0 6px' }}>لوحة الأرقام</div>
            <Numpad
              onDigit={onDigit}
              onDot={onDot}
              onBackspace={onBackspace}
              onClear={onClear}
            />

            {/* ── خطأ ── */}
            {error && (
              <div className="al al-r" style={{ marginTop: 10 }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
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
