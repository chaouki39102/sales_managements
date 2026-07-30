import { fmtDZD } from '../utils/document.utils';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';

export default function PartyBalanceBadge({
  balance,
  isLoading,
  partyLabel,
}: {
  balance: PartyBalanceInfo | null;
  isLoading: boolean;
  partyLabel: string;
}) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        fontSize: 11, color: 'var(--t4)', marginTop: 6,
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 12 }} />
        جاري تحميل رصيد {partyLabel}...
      </div>
    );
  }

  if (!balance) return null;

  const isPositive = balance.current_balance >= 0;
  const color = isPositive ? 'var(--red)' : 'var(--green)';
  const bg = isPositive ? 'var(--redb)' : 'var(--greenb)';
  const icon = isPositive ? 'ti-trending-up' : 'ti-trending-down';

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 'var(--r2)',
        background: bg, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        fontSize: 12,
      }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 13 }} />
        <span style={{ color: 'var(--t3)' }}>رصيد {partyLabel}:</span>
        <span style={{ fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
          {fmtDZD(balance.current_balance)} دج
        </span>
      </div>

      <div style={{
        display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--t4)', flexWrap: 'wrap',
      }}>
        <span>رصيد افتتاحي: <b>{fmtDZD(balance.opening_balance)}</b></span>
        <span>·</span>
        <span>مستندات: <b>{fmtDZD(balance.documents_balance)}</b></span>
        <span>·</span>
        <span>دفعات: <b>{fmtDZD(balance.payments_total)}</b></span>
      </div>
    </div>
  );
}
