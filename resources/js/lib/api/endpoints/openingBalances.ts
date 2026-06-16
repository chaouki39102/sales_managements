// lib/api/endpoints/openingBalances.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';

export const openingBalancesApi = {
    getParties: (fiscalYearId: number) =>
        apiGet('/opening-balances/parties', { fiscal_year_id: fiscalYearId, include: 'party', per_page: 200 }),
    getTreasury: (fiscalYearId: number) =>
        apiGet('/opening-balances/treasury', { fiscal_year_id: fiscalYearId, include: 'treasuryAccount', per_page: 200 }),
};

export function useOpeningParties(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: tenantKeys.openingBalances.parties(slug, yearId!),
        queryFn: () => openingBalancesApi.getParties(yearId!),
        enabled: !!slug && !!yearId,
        select: (data: any) => data.data || [],
    });
}

export function useOpeningTreasury(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: tenantKeys.openingBalances.treasury(slug, yearId!),
        queryFn: () => openingBalancesApi.getTreasury(yearId!),
        enabled: !!slug && !!yearId,
        select: (data: any) => data.data || [],
    });
}
