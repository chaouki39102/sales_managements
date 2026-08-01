// lib/api/endpoints/partyBalances.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '@/lib/store/appStore';
import type { PartyBalance, PartyBalanceHistory, PartyTransaction, ProductRecapResponse, DetailedBalanceHistory, DetailedTransaction } from '../core/types';

export const partyBalancesApi = {
    getAll: (params?: Record<string, unknown>) =>
        apiGet<PartyBalance[]>('/party-balances', params),

    getOne: (partyId: number, date?: string) =>
        apiGet<PartyBalance>(`/party-balances/${partyId}`, date ? { date } : undefined),

    getHistory: (partyId: number, date?: string) =>
        apiGet<PartyBalanceHistory>(`/party-balances/${partyId}/history`, date ? { date } : undefined),

    getProductRecap: (partyId: number, date?: string) =>
        apiGet<ProductRecapResponse>(`/party-balances/${partyId}/product-recap`, date ? { date } : undefined),

    getDetailedHistory: (partyId: number, date?: string) =>
        apiGet<DetailedBalanceHistory>(`/party-balances/${partyId}/detailed-history`, date ? { date } : undefined),
};

export function usePartyBalances(params?: { date?: string; party_type_id?: number; search?: string }) {
    const slug   = useActiveSlug();
    const yearId = useSelectedYearId();

    return useQuery({
        queryKey: tenantKeys.partyBalances.list(slug ?? '', { ...params, year_id: yearId } as Record<string, unknown>),
        queryFn:  () => partyBalancesApi.getAll({ ...params, year_id: yearId ?? undefined }),
        enabled:  !!slug,
        staleTime: 2 * 60_000,

        // ✅ إصلاح: casting صريح لجميع الحقول الرقمية
        // الباكاند يُرجع decimal كـ string في بعض قواعد البيانات
        // extractData يعيد المصفوفة مباشرة — select تستقبلها كـ PartyBalance[]
        select: (data: unknown): PartyBalance[] => {
            let arr: PartyBalance[] = [];

            if (Array.isArray(data)) {
                arr = data as PartyBalance[];
            } else if (data && typeof data === 'object') {
                const obj = data as Record<string, unknown>;
                if (Array.isArray(obj['data'])) {
                    arr = obj['data'] as PartyBalance[];
                }
            }

            return arr.map(b => ({
                ...b,
                opening_balance:   Number(b.opening_balance   ?? 0),
                documents_balance: Number(b.documents_balance ?? 0),
                payments_total:    Number(b.payments_total    ?? 0),
                current_balance:   Number(b.current_balance   ?? 0),
            }));
        },
    });
}

export function usePartyBalance(partyId: number | null | undefined, date?: string) {
    const slug = useActiveSlug();

    return useQuery({
        queryKey: tenantKeys.partyBalances.detail(slug ?? '', partyId ?? 0, date),
        queryFn:  () => partyBalancesApi.getOne(partyId!, date),
        enabled:  !!slug && !!partyId,
        staleTime: 30_000,
        refetchOnMount: 'always',
        select: (data: unknown): PartyBalance | null => {
            if (!data || typeof data !== 'object') return null;
            const d = data as Record<string, unknown>;
            return {
                ...(d as unknown as PartyBalance),
                opening_balance:   Number(d.opening_balance   ?? 0),
                documents_balance: Number(d.documents_balance ?? 0),
                payments_total:    Number(d.payments_total    ?? 0),
                current_balance:   Number(d.current_balance   ?? 0),
            } as PartyBalance;
        },
    });
}

export function usePartyBalanceHistory(partyId: number | null, date?: string) {
    const slug = useActiveSlug();

    return useQuery({
        queryKey: tenantKeys.partyBalances.history(slug ?? '', partyId ?? 0, date),
        queryFn:  () => partyBalancesApi.getHistory(partyId!, date),
        enabled:  !!slug && !!partyId,
        staleTime: 30_000,
        select: (data: unknown): PartyBalanceHistory => {
            if (data && typeof data === 'object' && 'transactions' in data) {
                const d = data as Record<string, unknown>;
                const txns = Array.isArray(d.transactions) ? d.transactions : [];
                return {
                    opening_balance: Number((d as Record<string, unknown>).opening_balance ?? 0),
                    transactions: (txns as PartyTransaction[]).map(t => ({
                        ...t,
                        document_amount: Number(t.document_amount ?? 0),
                        payment_amount:  Number(t.payment_amount ?? 0),
                        remaining:       Number(t.remaining ?? 0),
                        doc_cost_ht:     Number(t.doc_cost_ht ?? 0),
                        margin_value:    Number(t.margin_value ?? 0),
                    })),
                };
            }
            return { opening_balance: 0, transactions: [] };
        },
    });
}

export function usePartyProductRecap(partyId: number | null, date?: string) {
    const slug = useActiveSlug();

    return useQuery({
        queryKey: tenantKeys.partyBalances.productRecap(slug ?? '', partyId ?? 0, date),
        queryFn:  () => partyBalancesApi.getProductRecap(partyId!, date),
        enabled:  !!slug && !!partyId,
        staleTime: 30_000,
        select: (data: unknown): ProductRecapResponse => {
            if (data && typeof data === 'object' && 'products' in data) {
                const d = data as Record<string, unknown>;
                const products = Array.isArray(d.products) ? d.products : [];
                const summary = (d.summary ?? {}) as Record<string, number>;
                return {
                    products: (products as Record<string, unknown>[]).map(p => ({
                        product_id:      Number(p.product_id ?? 0),
                        product_name:    String(p.product_name ?? ''),
                        product_ref:     String(p.product_ref ?? ''),
                        unit_name:       String(p.unit_name ?? ''),
                        brand_name:      String(p.brand_name ?? ''),
                        family_name:     String(p.family_name ?? ''),
                        sale_qty:        Number(p.sale_qty ?? 0),
                        sale_ht:         Number(p.sale_ht ?? 0),
                        sale_ttc:        Number(p.sale_ttc ?? 0),
                        purchase_qty:    Number(p.purchase_qty ?? 0),
                        purchase_ht:     Number(p.purchase_ht ?? 0),
                        purchase_ttc:    Number(p.purchase_ttc ?? 0),
                        total_qty:       Number(p.total_qty ?? 0),
                        total_ht:        Number(p.total_ht ?? 0),
                        total_ttc:       Number(p.total_ttc ?? 0),
                        total_tva:       Number(p.total_tva ?? 0),
                        total_discount:  Number(p.total_discount ?? 0),
                        doc_count:       Number(p.doc_count ?? 0),
                        effective_cost_price: Number(p.effective_cost_price ?? 0),
                        cost_ht:         Number(p.cost_ht ?? 0),
                        margin_value:    Number(p.margin_value ?? 0),
                        margin_pct:      Number(p.margin_pct ?? 0),
                    })),
                    summary: {
                        product_count:      Number(summary.product_count ?? 0),
                        total_sale_ht:      Number(summary.total_sale_ht ?? 0),
                        total_sale_ttc:     Number(summary.total_sale_ttc ?? 0),
                        total_purchase_ht:  Number(summary.total_purchase_ht ?? 0),
                        total_purchase_ttc: Number(summary.total_purchase_ttc ?? 0),
                        total_cost_ht:      Number(summary.total_cost_ht ?? 0),
                        total_margin_value: Number(summary.total_margin_value ?? 0),
                        total_margin_pct:   Number(summary.total_margin_pct ?? 0),
                    },
                };
            }
            return { products: [], summary: { product_count: 0, total_sale_ht: 0, total_sale_ttc: 0, total_purchase_ht: 0, total_purchase_ttc: 0, total_cost_ht: 0, total_margin_value: 0, total_margin_pct: 0 } };
        },
    });
}

export function usePartyDetailedHistory(partyId: number | null, date?: string) {
    const slug = useActiveSlug();

    return useQuery({
        queryKey: tenantKeys.partyBalances.detailedHistory(slug ?? '', partyId ?? 0, date),
        queryFn:  () => partyBalancesApi.getDetailedHistory(partyId!, date),
        enabled:  !!slug && !!partyId,
        staleTime: 30_000,
        select: (data: unknown): DetailedBalanceHistory => {
            if (data && typeof data === 'object' && 'transactions' in data) {
                const d = data as Record<string, unknown>;
                const txns = Array.isArray(d.transactions) ? d.transactions : [];
                return {
                    opening_balance: Number(d.opening_balance ?? 0),
                    transactions: (txns as Record<string, unknown>[]).map(t => ({
                        type:            String(t.type ?? 'document') as 'document' | 'payment',
                        id:              Number(t.id ?? 0),
                        seq:             Number(t.seq ?? 0),
                        date:            String(t.date ?? ''),
                        datetime:        (t.datetime as string) ?? null,
                        reference:       String(t.reference ?? ''),
                        label:           String(t.label ?? ''),
                        type_code:       (t.type_code as string) ?? null,
                        document_amount: Number(t.document_amount ?? 0),
                        payment_amount:  Number(t.payment_amount ?? 0),
                        remaining:       Number(t.remaining ?? 0),
                        doc_cost_ht:     Number(t.doc_cost_ht ?? 0),
                        margin_value:    Number(t.margin_value ?? 0),
                        lines: Array.isArray(t.lines) ? (t.lines as Record<string, unknown>[]).map(l => ({
                            product_name:  String(l.product_name ?? ''),
                            product_ref:   String(l.product_ref ?? ''),
                            unit_name:     String(l.unit_name ?? ''),
                            quantity:      Number(l.quantity ?? 0),
                            unit_price_ht: Number(l.unit_price_ht ?? 0),
                            discount_pct:  Number(l.discount_pct ?? 0),
                            total_ht:      Number(l.total_ht ?? 0),
                            total_tva:     Number(l.total_tva ?? 0),
                            total_ttc:     Number(l.total_ttc ?? 0),
                            tva_rate:      Number(l.tva_rate ?? 0),
                            cost_price_ht: Number(l.cost_price_ht ?? 0),
                            line_cost_ht:  Number(l.line_cost_ht ?? 0),
                            line_margin:   Number(l.line_margin ?? 0),
                        })) : [],
                    })) as DetailedTransaction[],
                };
            }
            return { opening_balance: 0, transactions: [] };
        },
    });
}