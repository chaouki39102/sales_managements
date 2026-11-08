// resources/js/pages/finance/types.ts
// Shared types for the treasury & finance page.

// ─── Payments list ────────────────────────────────────────────────────────────
export interface PaymentFilters {
    status?:              string;
    party_id?:            number;
    treasury_account_id?: number;
    payment_mode_id?:     number;
    date_from?:           string;
    date_to?:             string;
    search?:              string;
}

// ─── Opening balances draft rows ─────────────────────────────────────────────
export interface TreasuryDraft { treasury_account_id: number | ''; opening_balance: string; }
export interface PartyDraft { party_id: number | ''; balance_type: 'debit' | 'credit'; opening_balance: string; }
