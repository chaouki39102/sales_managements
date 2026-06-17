// lib/api/endpoints/partyBalances.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import type { PartyBalance } from '../core/types';

export const partyBalancesApi = {
    getAll: (params?: { date?: string; party_type_id?: number; search?: string }) =>
        apiGet<PartyBalance[]>('/party-balances', params as Record<string, unknown>),

    getOne: (partyId: number, date?: string) =>
        apiGet<PartyBalance>(`/party-balances/${partyId}`, date ? { date } : undefined),
};

export function usePartyBalances(params?: { date?: string; party_type_id?: number; search?: string }) {
    const slug = useActiveSlug();

    return useQuery({
        queryKey: tenantKeys.partyBalances.list(slug ?? '', params as Record<string, unknown>),
        queryFn:  () => partyBalancesApi.getAll(params),
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
