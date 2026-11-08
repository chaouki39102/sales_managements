// lib/api/endpoints/reports/hooks/finance.ts — React Query hooks (finance).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { ReportBaseParams } from '../types/common';
import type { CashFlowParams, ExpensesReportParams, PaymentsReportParams, ProfitLossParams, TaxesReportParams } from '../types/finance';

export function useMonthlyReport(params?: Omit<ReportBaseParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'monthly', yearId, params],
    queryFn:   () => reportsApi.monthly({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function usePaymentsReport(params?: Omit<PaymentsReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'payments', yearId, params],
    queryFn:   () => reportsApi.payments({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useTvaReport(params?: Pick<TaxesReportParams, 'from_date' | 'to_date'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'taxes', yearId, params],
    queryFn:   () => reportsApi.taxes({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useProfitLossReport(params?: Omit<ProfitLossParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'profit-loss', yearId, params],
    queryFn:   () => reportsApi.profitLoss({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useCashFlowReport(params?: CashFlowParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'cash-flow', yearId, params],
    queryFn:   () => reportsApi.cashFlow({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useExpensesReport(params?: ExpensesReportParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'expenses', yearId, params],
    queryFn:   () => reportsApi.expenses({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}
