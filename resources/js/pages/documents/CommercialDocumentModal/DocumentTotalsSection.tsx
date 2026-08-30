import { Section } from '../components/DocumentUIPrimitives';
import type { DocumentTotals, DocumentFormState } from '../types/document.types';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';
import { fmtDZD, toNum } from '../utils/document.utils';

interface DocumentTotalsSectionProps {
  totals: DocumentTotals;
  payments: Array<unknown>;
  partyBalance: PartyBalanceInfo | null;
  form: DocumentFormState;
  selectedParty: { name?: string } | null;
  isPurchase: boolean;
  isEdit: boolean;
  existingDocument?: Record<string, unknown>;
}

interface RowProps {
  label: string;
  value: string;
  valueColor?: string;
  accent?: 'em' | 'gold' | 'red' | 'green';
  negative?: boolean;
}

function Row({ label, value, valueColor, accent, negative }: RowProps) {
  const icon =
    accent === 'em' ? 'ti-arrow-up-right' :
    accent === 'gold' ? 'ti-coin' :
    accent === 'red' ? 'ti-alert-triangle' :
    accent === 'green' ? 'ti-check' : 'ti-point-filled';
  const cursorColor =
    accent === 'em' ? 'var(--em)' :
    accent === 'gold' ? 'var(--gold)' :
    accent === 'red' ? 'var(--red)' :
    accent === 'green' ? 'var(--green)' : 'var(--t4)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '5px 0',
      borderBottom: '1px solid var(--b1)',
    }}>
      <span style={{ width: 14, fontSize: 9, color: cursorColor, marginLeft: 6 }}>
        <i className={`ti ${icon}`} />
      </span>
      <span style={{ flex: 1, fontSize: 12, color: 'var(--t3)' }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, color: negative ? 'var(--red)' : (valueColor ?? 'var(--t1)'),
        fontVariantNumeric: 'tabular-nums', direction: 'ltr',
      }}>
        {value}
      </span>
    </div>
  );
}

export default function DocumentTotalsSection({
  totals, payments,
  partyBalance, form, selectedParty,
  isPurchase, isEdit,
  existingDocument,
}: DocumentTotalsSectionProps) {
  const futureBalance = partyBalance && form.party_id && (totals.netToPay ?? 0) > 0
    ? (() => {
        const existingNetToPay = isEdit
          ? toNum(((existingDocument?.total_ttc as number) ?? 0) as number)
            + toNum(((existingDocument?.total_stamp as number) ?? 0) as number)
          : 0;
        const existingPaymentsSum = isEdit
          ? ((existingDocument?.payments as unknown[]) ?? [])
              .reduce((s: number, p: unknown) => s + toNum(((p as Record<string, unknown>).amount as number) ?? 0), 0)
          : 0;
        const deltaDoc = (totals.netToPay ?? 0) - existingNetToPay;
        const deltaPmt = totals.totalPaid - existingPaymentsSum;
        return isPurchase
          ? partyBalance!.signed_balance - deltaDoc + deltaPmt
          : partyBalance!.signed_balance + deltaDoc - deltaPmt;
      })()
    : null;

  const showPaymentsBlock = payments.length > 0;

  return (
    <Section title="الإجماليات" icon="ti-calculator">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 12,
      }}>
        {/* ── عمود تفصيل الحساب ── */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r2)', padding: '12px 14px',
        }}>
          <div style={{
            fontSize: 11.5, fontWeight: 800, color: 'var(--em)', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-report-money" style={{ fontSize: 14 }} />
            تفصيل الحساب
          </div>
          <Row label="إجمالي HT" value={`${fmtDZD(totals.ht)} دج`} />
          <Row
            label="الخصم الإجمالي"
            value={`${fmtDZD(totals.discount)} دج`}
            valueColor="var(--red)"
            accent="red"
          />
          <Row label="TVA" value={`${fmtDZD(totals.tva)} دج`} />
          <Row label="إجمالي TTC" value={`${fmtDZD(totals.ttc)} دج`} accent="em" />
          {totals.stamp > 0 && (
            <Row
              label="الطابع الجبائي"
              value={`${fmtDZD(totals.stamp)} دج`}
              valueColor="var(--gold)"
              accent="gold"
            />
          )}
        </div>

        {/* ── عمود النتيجة ── */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r2)', padding: '12px 14px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontSize: 11.5, fontWeight: 800, color: 'var(--em)', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-wallet" style={{ fontSize: 14 }} />
            المبلغ المستحق
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--em)', color: 'white', borderRadius: 'var(--r2)',
            padding: '14px 16px', marginBottom: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
              صافي المستحق
            </span>
            <span style={{
              fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              direction: 'ltr',
            }}>
              {fmtDZD(totals.netToPay)} دج
            </span>
          </div>

          {showPaymentsBlock ? (
            <>
              <Row
                label="المدفوع"
                value={`${fmtDZD(totals.totalPaid)} دج`}
                valueColor="var(--green)"
                accent="green"
              />
              <Row
                label="المتبقي"
                value={`${fmtDZD(totals.remaining)} دج`}
                valueColor={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
                accent={totals.remaining > 0.01 ? 'red' : 'green'}
                negative={totals.remaining > 0.01}
              />
            </>
          ) : (
            <Row
              label="غير مدفوع"
              value={`${fmtDZD(totals.netToPay)} دج`}
              valueColor="var(--red)"
              accent="red"
            />
          )}
        </div>
      </div>

      {partyBalance && form.party_id && (totals.netToPay ?? 0) > 0 && (
        <div style={{
          marginTop: 12, padding: '9px 14px', borderRadius: 'var(--r2)',
          background: 'var(--bg3)', border: '1px solid var(--b2)',
          fontSize: 11.5, color: 'var(--t3)',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <i className="ti ti-calculator" style={{ color: 'var(--t4)' }} />
          <span>رصيد {selectedParty?.name ?? 'المتعامل'} الحالي:</span>
          <b style={{ color: partyBalance.balance_type === 'debit' ? 'var(--red)' : 'var(--green)' }}>
            {fmtDZD(partyBalance.current_balance)} دج
          </b>
          <span style={{ color: 'var(--t4)' }}>·</span>
          <span>بعد هذا المستند سيصبح:</span>
          <b style={{ color: 'var(--em)' }}>
            {futureBalance !== null ? `${fmtDZD(futureBalance)} دج` : ''}
          </b>
        </div>
      )}
    </Section>
  );
}
