// ════════════════════════════════════════════════════════════════════════════
// pages/finance/BankReconciliationPage.tsx
// المطابقة البنكية — صفحة مستقلة
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useReconciliationQueries, useReconciliationMutations } from '@/lib/api/endpoints/reconciliation';
import type { ReconciledPayment } from '@/lib/api/endpoints/reconciliation';

const fmtDZD = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BankReconciliationPage() {
  const { unreconciled, reconciled } = useReconciliationQueries();
  const mutations = useReconciliationMutations();

  const [tab, setTab] = useState<'unreconciled' | 'reconciled'>('unreconciled');
  const [bankRefInput, setBankRefInput] = useState<Record<number, string>>({});

  const handleReconcile = (paymentId: number) => {
    const ref = bankRefInput[paymentId]?.trim();
    if (!ref) return;
    mutations.reconcile.mutate(
      { payment_id: paymentId, bank_reference: ref },
      { onSuccess: () => setBankRefInput(prev => { const n = { ...prev }; delete n[paymentId]; return n; }) },
    );
  };

  const handleUnreconcile = (paymentId: number) => {
    if (!window.confirm('تأكيد إلغاء المطابقة؟')) return;
    mutations.unreconcile.mutate(paymentId);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 'var(--r2)',
    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? 'color-mix(in srgb, var(--em) 12%, transparent)' : 'transparent',
    color: active ? 'var(--em)' : 'var(--t3)',
    fontFamily: 'inherit',
  });

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)', background: 'var(--bg1)',
    color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
    width: 140, outline: 'none',
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 'var(--r2)',
    background: 'var(--bg2)', border: '1px solid var(--b2)',
  };

  return (
    <div style={{ padding: 24, direction: 'rtl' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--t1)' }}>
        المطابقة البنكية
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button style={tabStyle(tab === 'unreconciled')} onClick={() => setTab('unreconciled')}>
          غير مطابقة ({unreconciled.data?.length ?? 0})
        </button>
        <button style={tabStyle(tab === 'reconciled')} onClick={() => setTab('reconciled')}>
          مطابقة ({reconciled.data?.length ?? 0})
        </button>
      </div>

      {/* Unreconciled tab */}
      {tab === 'unreconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unreconciled.isLoading && (
            <div style={{ color: 'var(--t4)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', fontSize: 14 }} />
              جاري التحميل…
            </div>
          )}
          {(unreconciled.data?.length ?? 0) === 0 && !unreconciled.isLoading && (
            <div style={{ color: 'var(--t4)', fontSize: 13, padding: 20, textAlign: 'center' }}>
              لا توجد مدفوعات غير مطابقة
            </div>
          )}
          {unreconciled.data?.map((p) => (
            <div key={p.id} style={cardStyle}>
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--t1)' }}>
                  {p.party_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{p.payment_number}</span>
                  <span>{p.payment_date}</span>
                  <span>{p.payment_mode}</span>
                  {p.reference && <span>مرجع: {p.reference}</span>}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                {fmtDZD(p.amount)} دج
              </div>
              <input
                type="text"
                placeholder="مرجع البنك..."
                value={bankRefInput[p.id] ?? ''}
                onChange={(e) => setBankRefInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReconcile(p.id); }}
                style={inputStyle}
              />
              <button
                disabled={!bankRefInput[p.id]?.trim() || mutations.reconcile.isPending}
                onClick={() => handleReconcile(p.id)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--em)',
                  background: 'color-mix(in srgb, var(--em) 10%, transparent)',
                  color: 'var(--em)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  opacity: !bankRefInput[p.id]?.trim() || mutations.reconcile.isPending ? 0.5 : 1,
                }}
              >
                {mutations.reconcile.isPending ? 'جاري...' : 'تطابق'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reconciled tab */}
      {tab === 'reconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(reconciled.data?.length ?? 0) === 0 && !reconciled.isLoading && (
            <div style={{ color: 'var(--t4)', fontSize: 13, padding: 20, textAlign: 'center' }}>
              لا توجد مطابقات سابقة
            </div>
          )}
          {reconciled.data?.map((p) => (
            <div key={p.id} style={{ ...cardStyle, opacity: 0.8 }}>
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--t1)' }}>
                  {p.party_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{p.payment_number}</span>
                  <span>{p.payment_date}</span>
                  <span style={{ color: 'var(--em)' }}>✓ مطابق</span>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                {fmtDZD(p.amount)} دج
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace' }}>
                {p.bank_reference}
              </div>
              <button
                onClick={() => handleUnreconcile(p.id)}
                disabled={mutations.unreconcile.isPending}
                title="إلغاء المطابقة"
                style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--b1)',
                  background: 'var(--bg2)', color: 'var(--t3)', fontSize: 13,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'all .15s',
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
