import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { fmtDZD } from '../utils/document.utils';

interface UnreconciledPayment {
  id:              number;
  payment_number:  string;
  payment_date:    string;
  amount:          number;
  party_name:      string;
  payment_mode:    string;
  treasury_account: string | null;
  reference:       string | null;
  bank_reference:  string | null;
}

export function BankReconciliationPage() {
  const slug    = useActiveSlug();
  const client  = useQueryClient();
  const [tab, setTab] = useState<'unreconciled' | 'reconciled'>('unreconciled');
  const [bankRefInput, setBankRefInput] = useState<Record<number, string>>({});

  const unreconciledQuery = useQuery<UnreconciledPayment[]>({
    queryKey: [slug, 'reconciliation', 'unreconciled'],
    queryFn: () => apiGet('/reconciliation/unreconciled'),
    enabled: !!slug,
  });

  const reconciledQuery = useQuery<UnreconciledPayment[]>({
    queryKey: [slug, 'reconciliation', 'reconciled'],
    queryFn: () => apiGet('/reconciliation/reconciled'),
    enabled: !!slug,
  });

  const reconcileMutation = useMutation({
    mutationFn: (data: { payment_id: number; bank_reference: string }) =>
      apiPost('/reconciliation/reconcile', data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [slug, 'reconciliation'] });
    },
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 'var(--r2)',
    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? 'var(--emb)' : 'transparent',
    color: active ? 'var(--em)' : 'var(--t3)',
    fontFamily: 'inherit',
  });

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)', background: 'var(--bg1)',
    color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
    width: 140, outline: 'none',
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--t1)' }}>
        المطابقة البنكية
      </h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button style={tabStyle(tab === 'unreconciled')} onClick={() => setTab('unreconciled')}>
          غير مطابقة ({unreconciledQuery.data?.length ?? 0})
        </button>
        <button style={tabStyle(tab === 'reconciled')} onClick={() => setTab('reconciled')}>
          مطابقة ({reconciledQuery.data?.length ?? 0})
        </button>
      </div>

      {tab === 'unreconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unreconciledQuery.isLoading && <div style={{ color: 'var(--t4)', fontSize: 13 }}>جاري التحميل...</div>}
          {unreconciledQuery.data?.length === 0 && (
            <div style={{ color: 'var(--t4)', fontSize: 13 }}>لا توجد مدفوعات غير مطابقة</div>
          )}
          {unreconciledQuery.data?.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--r2)',
                background: 'var(--bg2)', border: '1px solid var(--b2)',
              }}
            >
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--t1)' }}>
                  {p.party_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
                  <span>{p.payment_number}</span>
                  <span>{p.payment_date}</span>
                  <span>{p.payment_mode}</span>
                  {p.reference && <span>مرجع: {p.reference}</span>}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                {fmtDZD(p.amount)}
              </div>
              <input
                type="text"
                placeholder="مرجع البنك..."
                value={bankRefInput[p.id] ?? ''}
                onChange={(e) => setBankRefInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                style={inputStyle}
              />
              <button
                disabled={!bankRefInput[p.id]?.trim() || reconcileMutation.isPending}
                onClick={() => {
                  const ref = bankRefInput[p.id]?.trim();
                  if (ref) {
                    reconcileMutation.mutate({ payment_id: p.id, bank_reference: ref });
                    setBankRefInput((prev) => ({ ...prev, [p.id]: '' }));
                  }
                }}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--em)', background: 'var(--emb)',
                  color: 'var(--em)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                تطابق
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'reconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reconciledQuery.data?.length === 0 && (
            <div style={{ color: 'var(--t4)', fontSize: 13 }}>لا توجد مطابقات سابقة</div>
          )}
          {reconciledQuery.data?.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--r2)',
                background: 'var(--bg2)', border: '1px solid var(--b2)',
                opacity: 0.8,
              }}
            >
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--t1)' }}>
                  {p.party_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
                  <span>{p.payment_number}</span>
                  <span>{p.payment_date}</span>
                  <span style={{ color: 'var(--em)' }}>✓ مطابق</span>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                {fmtDZD(p.amount)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace' }}>
                {p.bank_reference}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
