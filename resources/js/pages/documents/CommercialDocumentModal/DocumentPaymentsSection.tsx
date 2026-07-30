import { Section, Label, AlertBanner } from '../components/DocumentUIPrimitives';
import { CheckFormFields } from '../components/CheckFormFields';
import { AdvancePaymentsPanel } from '../components/AdvancePaymentsPanel';
import type { PaymentEntry } from '../types/document.types';
import { fmtDZD } from '../utils/document.utils';

interface DocumentPaymentsSectionProps {
  payments: PaymentEntry[];
  paymentModeOptions: Array<{
    id: number;
    label: string;
    treasury_account_id?: number | null;
    requires_reference?: boolean;
  }>;
  treasuryAccountMap: Map<number, { id: number; name: string; type: string }>;
  treasuryAccounts: Array<{ id: number; code: string; name: string; type: string }>;
  addPayment: () => void;
  addPaymentWithValues: (values: Partial<PaymentEntry>) => void;
  removePayment: (idx: number) => void;
  updatePayment: (idx: number, patch: Partial<PaymentEntry>) => void;
  paymentsExceedWarning: string | null;
  advancePayments: unknown;
  isLoadingAdvances: boolean;
  pmMode: string;
  totals: { remaining: number };
  affectsAccounting: boolean;
}

export default function DocumentPaymentsSection({
  payments,
  paymentModeOptions, treasuryAccountMap, treasuryAccounts,
  addPayment, addPaymentWithValues, removePayment, updatePayment,
  paymentsExceedWarning,
  advancePayments, isLoadingAdvances,
  pmMode, totals, affectsAccounting,
}: DocumentPaymentsSectionProps) {
  if (!affectsAccounting) return null;

  return (
    <Section title="الدفعات" icon="ti-wallet" collapsible>

      <AdvancePaymentsPanel
        advances={advancePayments}
        isLoading={isLoadingAdvances}
        onApply={(adv) => {
          if (pmMode === 'locked') return;
          addPaymentWithValues({
            payment_mode_id: String((adv as Record<string, unknown>).payment_mode_id),
            amount: String((adv as Record<string, unknown>).unapplied_amount),
            reference: (adv as Record<string, unknown>).reference as string ?? '',
            payment_date: (adv as Record<string, unknown>).payment_date as string,
          });
        }}
        disabled={pmMode === 'locked'}
      />

      {paymentsExceedWarning && (
        <AlertBanner type="warning" message={paymentsExceedWarning} />
      )}

      {payments.length === 0 && (
        <div style={{
          padding: 12, fontSize: 12, color: 'var(--t4)',
          background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 12,
        }}>
          {pmMode === 'locked'
            ? 'المستند محمي — لا يمكن إضافة دفعات.'
            : 'لم تُضَف دفعات — سيتم إنشاء المستند دون تسديد.'}
        </div>
      )}

      {payments.map((pay, idx) => {
        const isExisting = pay.id !== undefined && pay.id !== null;
        const selectedMode = paymentModeOptions.find(
          (pm) => String(pm.id) === pay.payment_mode_id,
        );
        const autoTreasuryId = selectedMode?.treasury_account_id ?? null;
        const manualTreasuryStr = pay.treasury_account_id ? String(pay.treasury_account_id) : '';
        const effectiveTreasury = autoTreasuryId
          ? treasuryAccountMap.get(autoTreasuryId)
          : (manualTreasuryStr ? treasuryAccountMap.get(parseInt(manualTreasuryStr)) : null);

        const remainingForFill = totals.remaining;
        const isLast = idx === payments.length - 1;

        return (
          <div key={pay._clientRef ?? idx} style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 8, marginBottom: 10,
            padding: 12, borderRadius: 'var(--r2)',
            background: isExisting ? 'var(--goldb)' : 'var(--bg2)',
            border: `1px solid ${isExisting ? 'var(--gold)' : 'var(--b2)'}`,
          }}>
            <div>
              {idx === 0 && <Label>طريقة الدفع</Label>}
              <select
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: `1px solid ${!pay.payment_mode_id ? 'var(--red)' : 'var(--b3)'}`,
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', cursor: pmMode === 'locked' ? 'not-allowed' : 'pointer',
                  boxSizing: 'border-box',
                }}
                value={pay.payment_mode_id}
                onChange={(e) => updatePayment(idx, { payment_mode_id: e.target.value })}
              >
                <option value="">— اختر —</option>
                {paymentModeOptions.map((pm) => (
                  <option key={pm.id} value={String(pm.id)}>{pm.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                {idx === 0 && <Label>المبلغ</Label>}
                <input
                  type="number" min={0} step={0.01}
                  disabled={pmMode === 'locked'}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: '1px solid var(--b3)',
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  value={pay.amount}
                  onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                  placeholder="0.00"
                />
                {isLast && remainingForFill > 0.01 && (
                  <button
                    type="button"
                    onClick={() => updatePayment(idx, {
                      amount: String(Math.max(0, remainingForFill)),
                    })}
                    style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--em)',
                      marginTop: 3, padding: 0, background: 'none',
                      border: 'none', cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    ملء المتبقي ({fmtDZD(remainingForFill)})
                  </button>
                )}
              </div>

              {pmMode !== 'locked' && (
                <button
                  onClick={() => removePayment(idx)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--r1)',
                    border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                    background: 'var(--redb)', color: 'var(--red)',
                    cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: idx === 0 ? 'flex-end' : 'center',
                    marginTop: idx === 0 ? 18 : 0,
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: 13 }} />
                </button>
              )}
            </div>

            <div>
              {idx === 0 && <Label>المرجع</Label>}
              <input
                type="text"
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: `1px solid ${
                    selectedMode?.requires_reference && !pay.reference?.trim()
                      ? 'var(--red)' : 'var(--b3)'
                  }`,
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={pay.reference ?? ''}
                onChange={(e) => updatePayment(idx, { reference: e.target.value })}
                placeholder={selectedMode?.requires_reference ? 'إلزامي ★' : 'اختياري...'}
              />
            </div>

            <div>
              {idx === 0 && <Label>التاريخ</Label>}
              <input
                type="date"
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)',
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={pay.payment_date}
                onChange={(e) => updatePayment(idx, { payment_date: e.target.value })}
              />
            </div>

            <div>
              {idx === 0 && <Label>الحساب</Label>}
              {autoTreasuryId ? (
                <div style={{
                  padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)', background: 'var(--bg3)',
                  fontSize: 12, height: 38, display: 'flex', alignItems: 'center', gap: 6,
                  overflow: 'hidden', boxSizing: 'border-box',
                }}>
                  {effectiveTreasury ? (
                    <>
                      <i className={`ti ${
                        effectiveTreasury.type === 'bank' ? 'ti-building-bank' :
                        effectiveTreasury.type === 'cash' ? 'ti-cash' : 'ti-credit-card'
                      }`} style={{ fontSize: 12, color: 'var(--t4)', flexShrink: 0 }} />
                      <span style={{
                        color: 'var(--t2)', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {effectiveTreasury.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--t4)' }}>ح/ {autoTreasuryId}</span>
                  )}
                </div>
              ) : (
                <select
                  disabled={pmMode === 'locked'}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${!manualTreasuryStr ? 'var(--red)' : 'var(--b3)'}`,
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 12, fontFamily: 'Tajawal, sans-serif',
                    outline: 'none', cursor: pmMode === 'locked' ? 'not-allowed' : 'pointer',
                    height: 38, boxSizing: 'border-box',
                  }}
                  value={manualTreasuryStr}
                  onChange={(e) => updatePayment(idx, { treasury_account_id: e.target.value })}
                >
                  <option value="">— اختر حساباً ★ —</option>
                  {treasuryAccounts.map((ta) => (
                    <option key={ta.id} value={String(ta.id)}>
                      {ta.name} ({ta.type === 'bank' ? 'بنك' : ta.type === 'cash' ? 'نقدية' : 'شيك'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {effectiveTreasury?.type === 'check' && (
              <CheckFormFields
                checkNumber={pay.check_number}
                checkBank={pay.check_bank}
                checkDueDate={pay.check_due_date}
                onChange={(fields) => updatePayment(idx, fields)}
              />
            )}
          </div>
        );
      })}

      {pmMode !== 'locked' && (
        <button
          onClick={addPayment}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 'var(--r2)',
            border: '1px dashed var(--b3)', background: 'transparent',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--em)';
            e.currentTarget.style.color = 'var(--em)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--b3)';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <i className="ti ti-plus" />
          {pmMode === 'additive' ? 'إضافة دفعة جديدة' : 'إضافة دفعة'}
        </button>
      )}
    </Section>
  );
}
