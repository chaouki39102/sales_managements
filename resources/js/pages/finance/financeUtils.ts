// resources/js/pages/finance/financeUtils.ts
// Formatting helpers and constants shared by the finance page tabs and modals.
import type React from 'react';
import type { TreasuryDraft, PartyDraft } from './types';

// ─── helpers ─────────────────────────────────────────────────────────────────
export const fmt = (n: number) =>
    n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function inputStyle(hasError: boolean): React.CSSProperties {
    return {
        width: '100%', padding: '5px 8px', background: 'var(--bg1)',
        border: `1px solid ${hasError ? '#ef4444' : 'var(--b2)'}`,
        borderRadius: 6, color: 'var(--t1)', fontSize: 12,
        fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box',
    };
}

export const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-DZ') : '—';

export const STATUS_LABEL: Record<string, string> = {
    confirmed: 'مؤكدة',
    pending:   'معلقة',
    cancelled: 'ملغاة',
};
export const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
    confirmed: 'success',
    pending:   'warning',
    cancelled: 'danger',
};

// ─── Opening balances draft factories ────────────────────────────────────────
export const emptyTreasuryDraft = (): TreasuryDraft => ({ treasury_account_id: '', opening_balance: '' });
export const emptyPartyDraft = (): PartyDraft => ({ party_id: '', balance_type: 'debit', opening_balance: '' });
