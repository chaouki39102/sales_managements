import React from 'react';
import { Section, TotalCard, Toggle } from '../components/DocumentUIPrimitives';
import type { DocumentTotals, DocumentFormState } from '../types/document.types';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';
import { fmtDZD } from '../utils/document.utils';

interface DocumentTotalsSectionProps {
  totals: DocumentTotals;
  existingPayments: Array<unknown>;
  newPayments: Array<unknown>;
  partyBalance: PartyBalanceInfo | null;
  form: DocumentFormState;
  selectedParty: { name?: string } | null;
  isPurchase: boolean;
  isEdit: boolean;
  isReadOnly: boolean;
  set: (field: string, value: unknown) => void;
  stampEnabled?: boolean;
}

export default function DocumentTotalsSection({
  totals, existingPayments, newPayments,
  partyBalance, form, selectedParty,
  isPurchase, isEdit, isReadOnly, set,
  stampEnabled = true,
}: DocumentTotalsSectionProps) {
  return (
    <Section title="الإجماليات" icon="ti-calculator">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <TotalCard label="إجمالي HT" value={`${fmtDZD(totals.ht)} دج`} />
        <TotalCard
          label="الخصم الإجمالي"
          value={`${fmtDZD(totals.discount)} دج`}
          color="var(--red)" muted={totals.discount === 0}
        />
        <TotalCard label="TVA" value={`${fmtDZD(totals.tva)} دج`} />
        <TotalCard label="إجمالي TTC" value={`${fmtDZD(totals.ttc)} دج`} bg="var(--bg3)" />
        {totals.stamp > 0 && (
          <TotalCard
            label="الطابع الجبائي" value={`${fmtDZD(totals.stamp)} دج`}
            bg="var(--goldb)" color="var(--gold)" labelColor="var(--gold)"
          />
        )}
        <TotalCard
          label="المبلغ المستحق" value={`${fmtDZD(totals.netToPay)} دج`}
          bg="var(--em)" color="white" labelColor="rgba(255,255,255,.75)" large
        />
        {(existingPayments.length > 0 || newPayments.length > 0) && (
          <>
            <TotalCard
              label="المدفوع" value={`${fmtDZD(totals.totalPaid)} دج`}
              color="var(--green)" bg="var(--greenb)" labelColor="var(--green)"
            />
            <TotalCard
              label="المتبقي" value={`${fmtDZD(totals.remaining)} دج`}
              color={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
              bg={totals.remaining > 0.01 ? 'var(--redb)' : 'var(--greenb)'}
              labelColor={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
            />
          </>
        )}
      </div>

      {partyBalance && form.party_id && totals.netToPay > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 'var(--r2)',
          background: 'var(--bg3)', border: '1px solid var(--b2)',
          fontSize: 11.5, color: 'var(--t3)', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <i className="ti ti-calculator" style={{ color: 'var(--t4)' }} />
          <span>رصيد {selectedParty?.name ?? 'المتعامل'} الحالي:</span>
          <b style={{ color: partyBalance.balance_type === 'debit' ? 'var(--green)' : 'var(--red)' }}>
            {fmtDZD(partyBalance.current_balance)} دج
            ({partyBalance.balance_type === 'debit' ? 'مدين لنا' : 'نحن مدينون'})
          </b>
          <span style={{ color: 'var(--t4)' }}>·</span>
          <span>بعد هذا المستند سيصبح:</span>
          <b style={{ color: 'var(--em)' }}>
            {fmtDZD(
              isPurchase
                ? partyBalance.signed_balance - (totals.netToPay - totals.totalPaid)
                : partyBalance.signed_balance + (totals.netToPay - totals.totalPaid),
            )} دج
          </b>
        </div>
      )}

      {stampEnabled && (
        <Toggle
          checked={form.apply_stamp}
          onChange={(v: boolean) => set('apply_stamp', v)}
          label="الطابع الجبائي"
          subLabel="1% من TTC — بحد أقصى 2,500 دج — للفواتير ≥ 30,000 دج"
          disabled={isReadOnly}
        />
      )}
    </Section>
  );
}
