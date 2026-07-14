import React, { useState, useMemo, useEffect } from 'react';
import { fmtDZD } from '../utils/document.utils';
import { useCreateReturn } from '../hooks/useDocumentChain';


interface ReturnLine {
  line_id:       number;
  product_name:  string;
  max_quantity:  number;
  return_qty:    number;
  unit_price_ht: number;
  tva_rate:      number;
  packaging_label?: string;
}

interface ReturnDocumentModalProps {
  document:   Record<string, unknown>;
  onCreated:  (returnDoc: Record<string, unknown>) => void;
  onClose:    () => void;
}

export function ReturnDocumentModal({ document, onCreated, onClose }: ReturnDocumentModalProps) {
  const createReturn = useCreateReturn();
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');

  const lines = useMemo<ReturnLine[]>(() => {
    const rawLines = (document.lines as Record<string, unknown>[]) ?? [];
    return rawLines
      .filter(l => {
        const qty      = Number(l.quantity ?? 0);
        const returned = Number(l.returned_quantity ?? 0);
        return qty > returned;
      })
      .map(l => ({
        line_id:      Number(l.id),
        product_name: String(
          (l.product as Record<string, unknown> | null)?.name ?? l.description ?? ''
        ),
        max_quantity: Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0),
        return_qty:   Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0),
        unit_price_ht: Number(l.unit_price_ht ?? 0),
        tva_rate:     Number(l.tva_rate ?? 0),
        packaging_label: (l.packaging as Record<string, unknown> | null)?.label as string | undefined,
      }));
  }, [document.lines]);

  const [returnLines, setReturnLines] = useState<ReturnLine[]>(lines);

  useEffect(() => {
    setReturnLines(lines);
  }, [lines]);

  const updateQty = (lineId: number, qty: number) => {
    setReturnLines(prev => prev.map(l =>
      l.line_id === lineId
        ? { ...l, return_qty: Math.min(l.max_quantity, Math.max(0, qty)) }
        : l
    ));
  };

  const total = returnLines.reduce((acc, l) => {
    const ht  = l.return_qty * l.unit_price_ht;
    const tva = ht * (l.tva_rate / 100);
    return acc + ht + tva;
  }, 0);

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('سبب الإرجاع إلزامي'); return; }
    const validLines = returnLines.filter(l => l.return_qty > 0);
    if (validLines.length === 0) { setError('يجب تحديد كمية للإرجاع في سطر واحد على الأقل'); return; }

    try {
      const result = await createReturn.mutateAsync({
        documentId: Number(document.id),
        reason,
        lines: validLines.map(l => ({ line_id: l.line_id, quantity: l.return_qty })),
      });
      onCreated(result as Record<string, unknown>);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'حدث خطأ أثناء إنشاء المرتجع');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.5)', direction: 'rtl',
    }}>
      <div style={{
        width: '92vw', maxWidth: 680, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg1)', borderRadius: 'var(--r3)',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'color-mix(in srgb, var(--purple) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--purple) 30%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-receipt-refund" style={{ fontSize: 17, color: 'var(--purple)' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                إنشاء مرتجع
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                من {String(document.document_number)}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--b2)', background: 'none',
            cursor: 'pointer', color: 'var(--t3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && (
            <div style={{
              padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--red)',
              fontSize: 12, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 5 }}>
              سبب الإرجاع <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="اذكر سبب الإرجاع..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--r2)',
                border: `1px solid ${!reason && error ? 'var(--red)' : 'var(--b3)'}`,
                background: 'var(--bg1)', color: 'var(--t1)',
                fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>
            الكميات المُرجَعة
          </div>

          {returnLines.map(line => (
            <div key={line.line_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 8, borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg2)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line.product_name}
                </div>
                {line.packaging_label && (
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>{line.packaging_label}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                  متاح للإرجاع: <b style={{ color: 'var(--t2)' }}>{line.max_quantity}</b> وحدة
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => updateQty(line.line_id, line.return_qty - 1)}
                  disabled={line.return_qty <= 0}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--b2)', background: 'var(--bg1)',
                    cursor: line.return_qty <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)',
                  }}
                >
                  <i className="ti ti-minus" style={{ fontSize: 11 }} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={line.max_quantity}
                  step={0.001}
                  value={line.return_qty}
                  onChange={e => updateQty(line.line_id, parseFloat(e.target.value) || 0)}
                  style={{
                    width: 70, textAlign: 'center', padding: '5px',
                    borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                />
                <button
                  onClick={() => updateQty(line.line_id, line.return_qty + 1)}
                  disabled={line.return_qty >= line.max_quantity}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--b2)', background: 'var(--bg1)',
                    cursor: line.return_qty >= line.max_quantity ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)',
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 11 }} />
                </button>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', minWidth: 80, textAlign: 'left', direction: 'ltr' }}>
                {fmtDZD(
                  line.return_qty * line.unit_price_ht * (1 + line.tva_rate / 100)
                )} دج
              </div>
            </div>
          ))}

          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r2)',
            background: 'var(--bg3)', border: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 700, color: 'var(--t1)',
          }}>
            <span>إجمالي المرتجع (TTC):</span>
            <span style={{ color: 'var(--purple)', direction: 'ltr' }}>
              {fmtDZD(total)} دج
            </span>
          </div>
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', gap: 8, justifyContent: 'flex-start',
        }}>
          <button
            onClick={handleSubmit}
            disabled={createReturn.isPending}
            style={{
              padding: '8px 20px', borderRadius: 'var(--r2)',
              border: 'none', background: 'var(--purple)', color: 'white',
              cursor: createReturn.isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, opacity: createReturn.isPending ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {createReturn.isPending
              ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري الإنشاء...</>
              : <><i className="ti ti-receipt-refund" /> إنشاء المرتجع</>
            }
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              cursor: 'pointer', fontSize: 13, color: 'var(--t2)',
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
