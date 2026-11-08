// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePosSystemSettingToggles.ts
//
// Company-level system settings edited from the POS Settings modal (synced
// with the settings DB, then the aggregated POS lookups are invalidated).
// Shared by POSPage and POSProPage.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { tenantKeys } from '@/lib/api/core/queryKeys';

export function usePosSystemSettingToggles(slug: string | null, queryClient: QueryClient) {
  const toggleFiscalStamp = useCallback(async (val: boolean) => {
    await settingsApi.update({ fiscal_stamp_enabled: val });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  const toggleAllowNegative = useCallback(async (val: boolean) => {
    await settingsApi.update({ allow_negative_stock: val });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  const saveDefaultPriceLevel = useCallback(async (id: number | null) => {
    await settingsApi.update({ default_price_level_id: id });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  return { toggleFiscalStamp, toggleAllowNegative, saveDefaultPriceLevel };
}
