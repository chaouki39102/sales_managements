// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocumentChainPanel.tsx
//
// يعرض سلسلة المستندات (الآباء والأبناء) مع زر التحويل.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { fmtDZD, fmtDate } from '../utils/document.utils';
import { STATUS_CONFIG } from '../types/document.types';
import type { DocumentChain, ChainNode } from '../hooks/useDocumentChain';

interface DocumentChainPanelProps {
  chain:           DocumentChain | null | undefined;
  isLoading:       boolean;
  currentId:       number;
  allowedTargets:  string[];
  onConvert:       (targetCode: string) => void;
  onNavigate:      (documentId: number) => void;
  isReadOnly:      boolean;
}

function ChainNodeCard({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (id: number) => void }) {
  const statusCfg = STATUS_CONFIG[node.status] ?? { label: node.status_label, color: 'var(--t4)', bg: 'var(--bg3)' };

  return (
    <div
      onClick={() => !isCurrent && onNavigate(node.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        border: isCurrent
          ? '1px solid var(--em)'
          : '1px solid var(--b2)',
        background: isCurrent ? 'var(--emb)' : 'var(--bg2)',
        cursor: isCurrent ? 'default' : 'pointer',
        transition: 'all .15s',
        minWidth: 0,
        opacity: node.is_cancellation ? 0.65 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 12,
            color: isCurrent ? 'var(--em)' : 'var(--t1)',
          }}>
            {node.document_number}
          </span>
          <span style={{
            padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
            background: statusCfg.bg, color: statusCfg.color,
          }}>
            {node.status_label}
          </span>
          {node.is_cancellation && (
            <span style={{ fontSize: 9, color: 'var(--red)' }}>مرتجع</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
          {node.type_name} · {fmtDate(node.document_date)} · {fmtDZD(node.net_to_pay)} دج
        </div>
      </div>
      {!isCurrent && (
        <i className="ti ti-external-link" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      )}
    </div>
  );
}

function NodeWithChildren({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (id: number) => void }) {
  return (
    <div>
      <ChainNodeCard node={node} isCurrent={isCurrent} onNavigate={onNavigate} />
      {node.children && node.children.length > 0 && (
        <div style={{ marginTop: 4, marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8 }}>
          {node.children.map(child => (
            <div key={child.id} style={{ marginTop: 4 }}>
              <NodeWithChildren node={child} isCurrent={isCurrent && child.id === -1} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentChainPanel({
  chain, isLoading, currentId, allowedTargets, onConvert, onNavigate, isReadOnly,
}: DocumentChainPanelProps) {
  const [showConvert, setShowConvert] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        جاري تحميل سلسلة المستندات...
      </div>
    );
  }

  if (!chain) return null;

  const hasRelations = chain.ancestors.length > 0 || chain.descendants.length > 0;

  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px',
      background: 'var(--bg2)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: hasRelations ? 10 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>
          <i className="ti ti-link" style={{ fontSize: 12 }} />
          سلسلة المستندات
          {hasRelations && (
            <span style={{
              padding: '1px 6px', borderRadius: 99, fontSize: 10,
              background: 'var(--bg3)', color: 'var(--t4)',
            }}>
              {chain.ancestors.length + chain.descendants.length} مستند مرتبط
            </span>
          )}
        </div>

        {/* زر التحويل */}
        {!isReadOnly && allowedTargets.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowConvert(!showConvert)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 'var(--r2)',
                border: '1px solid var(--blue)', background: 'var(--blueb)',
                color: 'var(--blue)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              <i className="ti ti-arrows-exchange" style={{ fontSize: 12 }} />
              تحويل إلى...
              <i className={`ti ti-chevron-${showConvert ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
            </button>

            {showConvert && (
              <div style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4,
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                borderRadius: 'var(--r2)', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                zIndex: 100, minWidth: 160, overflow: 'hidden',
              }}>
                {allowedTargets.map(code => (
                  <button
                    key={code}
                    onClick={() => { setShowConvert(false); onConvert(code); }}
                    style={{
                      width: '100%', padding: '8px 12px', textAlign: 'right',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--t1)',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* السلسلة */}
      {hasRelations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* الآباء */}
          {chain.ancestors.map((ancestor, i) => (
            <div key={ancestor.id}>
              <ChainNodeCard node={ancestor} isCurrent={false} onNavigate={onNavigate} />
              <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', height: 6 }} />
            </div>
          ))}

          {/* المستند الحالي */}
          <ChainNodeCard node={chain.current} isCurrent onNavigate={onNavigate} />

          {/* الأبناء */}
          {chain.descendants.length > 0 && (
            <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8, marginTop: 4 }}>
              {chain.descendants.map(desc => (
                <div key={desc.id} style={{ marginTop: 4 }}>
                  <NodeWithChildren node={desc} isCurrent={false} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasRelations && (
        <div style={{ fontSize: 11, color: 'var(--t4)' }}>
          لا توجد مستندات مرتبطة
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/CreditCheckBar.tsx
//
// شريط يعرض حالة الائتمان للزبون.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { CreditCheckResult } from '../hooks/useCreditCheck';

interface CreditCheckBarProps {
  creditCheck:  CreditCheckResult | null | undefined;
  isLoading:    boolean;
  partyName?:   string;
}

export function CreditCheckBar({ creditCheck, isLoading, partyName }: CreditCheckBarProps) {
  if (isLoading) return null;
  if (!creditCheck) return null;

  // إذا لا يوجد حد ائتماني → لا نعرض شيئاً
  if (!creditCheck.credit_limit) {
    // لكن نعرض تحذير الفواتير المتأخرة إذا كانت موجودة
    if (creditCheck.overdue_invoices.count === 0) return null;
  }

  const usagePercent = creditCheck.credit_limit > 0
    ? Math.min(100, (creditCheck.used_credit / creditCheck.credit_limit) * 100)
    : 0;

  const barColor = creditCheck.will_exceed
    ? 'var(--red)'
    : usagePercent > 80
      ? 'var(--orange)'
      : 'var(--green)';

  return (
    <div style={{
      marginTop: 8, padding: '8px 12px',
      borderRadius: 'var(--r2)',
      background: creditCheck.will_exceed
        ? 'color-mix(in srgb, var(--red) 8%, transparent)'
        : 'var(--bg3)',
      border: creditCheck.will_exceed
        ? '1px solid color-mix(in srgb, var(--red) 30%, transparent)'
        : '1px solid var(--b2)',
    }}>
      {/* حد الائتمان */}
      {creditCheck.credit_limit > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-credit-card" style={{ fontSize: 12 }} />
              حد الائتمان: <b style={{ color: 'var(--t1)' }}>{fmtDZD(creditCheck.credit_limit)} دج</b>
            </span>
            <span style={{
              color: barColor, fontWeight: 700, fontSize: 11,
            }}>
              {creditCheck.will_exceed
                ? `تجاوز بـ ${fmtDZD(creditCheck.exceed_by)} دج`
                : `متاح: ${fmtDZD(creditCheck.available_credit ?? 0)} دج`}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 5, borderRadius: 99, background: 'var(--b2)',
            overflow: 'hidden', marginBottom: 6,
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, usagePercent)}%`,
              background: barColor,
              borderRadius: 99,
              transition: 'width .3s',
            }} />
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--t4)' }}>
            <span>مستخدم: {fmtDZD(creditCheck.used_credit)} دج</span>
            {creditCheck.credit_days > 0 && (
              <span>مدة الائتمان: {creditCheck.credit_days} يوم</span>
            )}
            {creditCheck.suggested_due_date && (
              <span>الاستحقاق المقترح: {creditCheck.suggested_due_date}</span>
            )}
          </div>
        </>
      )}

      {/* الفواتير المتأخرة */}
      {creditCheck.overdue_invoices.count > 0 && (
        <div style={{
          marginTop: creditCheck.credit_limit > 0 ? 8 : 0,
          padding: '5px 8px', borderRadius: 'var(--r1)',
          background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
          border: '1px solid var(--orange)',
          fontSize: 11, color: 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 12, flexShrink: 0 }} />
          {partyName ?? 'الزبون'} لديه{' '}
          <b>{creditCheck.overdue_invoices.count}</b> فاتورة متأخرة
          بقيمة <b>{fmtDZD(creditCheck.overdue_invoices.total_amount)} دج</b>
        </div>
      )}

      {/* تحذير تجاوز الحد */}
      {creditCheck.will_exceed && (
        <div style={{
          marginTop: 6, fontSize: 11, color: 'var(--red)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-ban" style={{ fontSize: 12 }} />
          هذا المستند سيتجاوز حد الائتمان — يتطلب موافقة المدير
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/ReturnDocumentModal.tsx
//
// Modal لإنشاء مستند مرتجع من فاتورة أصلية.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { fmtDZD } from '../utils/document.utils';
import { useCreateReturn } from '../hooks/useDocumentChain';
import type { LineItem } from '../types/document.types';

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
        {/* Header */}
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

        {/* Body */}
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

          {/* سبب الإرجاع */}
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

          {/* الأسطر */}
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

          {/* الإجمالي */}
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

        {/* Footer */}
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
