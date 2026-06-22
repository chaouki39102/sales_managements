import React, { useState, useEffect, useCallback } from 'react';
import type { CartTotals, Party, PaymentMode, DocumentType, Currency } from '@/types';
import { formatDZD } from '../utils/calculations';

export interface PaymentLine {
  paymentModeId: number;
  amount:        number;
}

interface ProfessionalPaymentModalProps {
  totals:        CartTotals;
  client:        Party | null;
  paymentModes:  PaymentMode[];
  documentTypes: DocumentType[];
  currencies?:   Currency[];
  totalTtcFinal: number;
  onClose:       () => void;
  onConfirm:     (params: any) => Promise<{ ok: boolean; message?: string }>;
}

const DOC_CODES = ['FV', 'BL', 'BCC', 'FA'];

export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes, currencies, totalTtcFinal, onClose, onConfirm,
}: ProfessionalPaymentModalProps) {
  const [paymentLines, setPaymentLines] = useState<Array<{
    id: string; modeId: number; amount: string; refNote: string;
  }>>(() => {
    const defaultMode = paymentModes.find(m => m.is_default) ?? paymentModes[0];
    return defaultMode ? [{
      id:      Math.random().toString(36).slice(2),
      modeId:  defaultMode.id,
      amount:  String(totalTtcFinal.toFixed(2)),
      refNote: '',
    }] : [];
  });

  const [docTypeCode, setDocTypeCode] = useState<string>('FV');
  const [dueDate,     setDueDate]     = useState('');
  const [note,        setNote]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(
    currencies?.find(c => c.is_base_currency)?.id ?? currencies?.[0]?.id ?? null
  );

  const totalPaid = paymentLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remaining = totalTtcFinal - totalPaid;
  const change    = totalPaid > totalTtcFinal ? totalPaid - totalTtcFinal : 0;
  const canSubmit = totalPaid > 0 && !submitting;

  const addLine = useCallback(() => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    setPaymentLines(prev => [...prev, {
      id:      Math.random().toString(36).slice(2),
      modeId:  firstMode.id,
      amount:  String(Math.max(0, remaining).toFixed(2)),
      refNote: '',
    }]);
  }, [paymentModes, remaining]);

  const removeLine = (id: string) =>
    setPaymentLines(prev => prev.filter(l => l.id !== id));

  const updateLine = (id: string, key: 'modeId' | 'amount' | 'refNote', val: any) =>
    setPaymentLines(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l));

  const fillRemaining = (id: string) => {
    const others = paymentLines.filter(l => l.id !== id).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const rem = Math.max(0, totalTtcFinal - others);
    updateLine(id, 'amount', rem.toFixed(2));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const payments = paymentLines
      .filter(l => parseFloat(l.amount) > 0)
      .map(l => ({ paymentModeId: l.modeId, amount: parseFloat(l.amount), treasuryAccountId: null }));
    const res = await onConfirm({
      amountPaid: totalPaid,
      payments,
      docTypeCode,
      dueDate,
      note,
      currencyId: selectedCurrencyId,
    });
    setSubmitting(false);
    if (!res.ok) setError(res.message ?? 'خطأ غير معروف');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSubmit]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-pay" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-credit-card" style={{ marginLeft: 6 }} />
            إتمام عملية الدفع
            {client && <span className="m-client-tag">{client.name}</span>}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        <div className="m-body pay-body">
          <div className="pay-summary">
            <div className="pay-sum-title">ملخص الفاتورة</div>
            <div className="pay-sum-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="pay-sum-row disc">
                <span>خصم</span>
                <span>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}
            <div className="pay-sum-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>
            {totals.fiscal_stamp > 0 && (
              <div className="pay-sum-row">
                <span>طابع مالي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}
            <div className="pay-sum-row grand">
              <span>الإجمالي</span>
              <strong>{formatDZD(totalTtcFinal)}</strong>
            </div>

            {currencies && currencies.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div className="pay-sec-ttl">العملة</div>
                <select
                  className="pay-currency-sel"
                  value={selectedCurrencyId ?? ''}
                  onChange={e => setSelectedCurrencyId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} {c.is_base_currency ? '(الرئيسية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="pay-sec-ttl">نوع الوثيقة</div>
              <div className="pay-doc-types">
                {documentTypes.filter(t => DOC_CODES.includes(t.code)).map(t => (
                  <button
                    key={t.id}
                    className={`pdt ${docTypeCode === t.code ? 'on' : ''}`}
                    onClick={() => setDocTypeCode(t.code)}
                  >
                    {t.code}
                    <span className="pdt-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="pay-sec-ttl">تاريخ الاستحقاق (اختياري)</div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="pay-date-inp"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="pay-sec-ttl">ملاحظة</div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="pay-note-inp"
                rows={2}
                placeholder="ملاحظة على الفاتورة..."
              />
            </div>
          </div>

          <div className="pay-methods">
            <div className="pay-sec-ttl">وسائل الدفع</div>

            <div className="pay-lines">
              {paymentLines.map((line, idx) => (
                <div key={line.id} className="pay-line">
                  <div className="pl-num">{idx + 1}</div>
                  <select
                    className="pl-mode"
                    value={line.modeId}
                    onChange={e => updateLine(line.id, 'modeId', parseInt(e.target.value))}
                  >
                    {paymentModes.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="pl-amt-wrap">
                    <input
                      type="number"
                      className="pl-amount"
                      value={line.amount}
                      onChange={e => updateLine(line.id, 'amount', e.target.value)}
                      placeholder="المبلغ"
                    />
                    <button
                      className="pl-fill"
                      onClick={() => fillRemaining(line.id)}
                      title="تعبئة المتبقي"
                    >
                      ≈
                    </button>
                  </div>
                  <input
                    type="text"
                    className="pl-ref"
                    value={line.refNote}
                    onChange={e => updateLine(line.id, 'refNote', e.target.value)}
                    placeholder="رقم مرجعي..."
                  />
                  {paymentLines.length > 1 && (
                    <button className="pl-del" onClick={() => removeLine(line.id)}>
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="btn btn-xs" onClick={addLine} style={{ marginTop: 6 }}>
              <i className="ti ti-plus" /> إضافة وسيلة دفع
            </button>

            <div className="pay-nums">
              <div className="pn-row">
                <span>المبلغ المدفوع</span>
                <strong className="pn-paid">{formatDZD(totalPaid)}</strong>
              </div>
              {remaining > 0.01 && (
                <div className="pn-row pn-rem">
                  <span>المتبقي</span>
                  <strong>{formatDZD(remaining)}</strong>
                </div>
              )}
              {change > 0.01 && (
                <div className="pn-row pn-chg">
                  <span>الباقي للزبون</span>
                  <strong>{formatDZD(change)}</strong>
                </div>
              )}
            </div>

            {error && (
              <div className="al al-r" style={{ marginTop: 10 }}>
                <i className="ti ti-alert-circle" />
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title="تأكيد الدفع — Ctrl+Enter"
          >
            {submitting
              ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
              : <><i className="ti ti-circle-check" /> تأكيد الدفع — {formatDZD(totalPaid)}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
