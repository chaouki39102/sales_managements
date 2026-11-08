// resources/js/pages/finance/hooks/useFinanceQueries.ts
// Lookup + list queries used by the finance page.
import { useQuery } from '@tanstack/react-query';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { apiGet } from '@/lib/api/core/client';
import type { PaymentFilters } from '../types';

// ─── قراءة قوائم lookups ─────────────────────────────────────────────────────
export function useTreasuryAccountTypes() {
    return useQuery({
        queryKey: ['treasury-account-types'],
        queryFn:  () => apiGet<any>('/treasury-account-types').then(r => r?.data ?? []),
        staleTime: Infinity,
    });
}

export function useTreasuryAccounts(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: [slug, 'treasury-accounts', yearId],
        queryFn:  () => apiGet<any>('/treasury-accounts', {
            fiscal_year_id: yearId ?? undefined,
        }),
        enabled:  !!slug,
        select: (data: any) => Array.isArray(data) ? data
            : Array.isArray(data?.data) ? data.data : [],
    });
}

export function usePaymentModes(slug: string) {
    return useQuery({
        queryKey: [slug, 'payment-modes'],
        queryFn:  () => apiGet<any>('/payment-modes').then(r => r?.data ?? []),
        enabled:  !!slug,
    });
}

export function usePayments(slug: string, yearId: number | null, filters: PaymentFilters) {
    const params: Record<string, unknown> = {
        'filter[fiscal_year_id]': yearId ?? undefined,
        per_page:       50,
        include:        'party,paymentMode,treasuryAccount',
        ...filters,
    };
    // حذف القيم الفارغة
    Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k];
    });

    return useQuery({
        queryKey: tenantKeys.payments.list(slug, params),
        queryFn:  () => apiGet<any>('/payments', params),
        enabled:  !!slug,
        select: (data: any) => ({
            items: Array.isArray(data)
                ? data
                : Array.isArray(data?.data) ? data.data : [],
            meta: data?.meta ?? null,
        }),
    });
}
