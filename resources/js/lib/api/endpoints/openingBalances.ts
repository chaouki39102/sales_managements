// lib/api/endpoints/openingBalances.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import type { PaginatedResponse } from '../core/types';

// extractData already strips envelope; paginated → { data: T[], meta }, non-paginated → T[]
function toArray(result: any): any[] {
    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && Array.isArray(result.data)) return result.data;
    return [];
}

export const openingBalancesApi = {
    getParties: (fiscalYearId: number) =>
        apiGet<PaginatedResponse<any>>('/opening-balance-parties', { 'filter[fiscal_year_id]': fiscalYearId, include: 'party', per_page: 200 }),
    getTreasury: (fiscalYearId: number) =>
        apiGet<PaginatedResponse<any>>('/opening-balance-treasury', { 'filter[fiscal_year_id]': fiscalYearId, include: 'treasuryAccount', per_page: 200 }),

    createParty: (data: any) =>
        apiPost('/opening-balance-parties', data),
    updateParty: (id: number, data: any) =>
        apiPut(`/opening-balance-parties/${id}`, data),
    deleteParty: (id: number) =>
        apiDelete(`/opening-balance-parties/${id}`),

    createTreasury: (data: any) =>
        apiPost('/opening-balance-treasury', data),
    updateTreasury: (id: number, data: any) =>
        apiPut(`/opening-balance-treasury/${id}`, data),
    deleteTreasury: (id: number) =>
        apiDelete(`/opening-balance-treasury/${id}`),
};

export function useOpeningParties(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: tenantKeys.openingBalances.parties(slug, yearId!),
        queryFn: () => openingBalancesApi.getParties(yearId!),
        enabled: !!slug && !!yearId,
        select: toArray,
    });
}

export function useOpeningTreasury(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: tenantKeys.openingBalances.treasury(slug, yearId!),
        queryFn: () => openingBalancesApi.getTreasury(yearId!),
        enabled: !!slug && !!yearId,
        select: toArray,
    });
}
