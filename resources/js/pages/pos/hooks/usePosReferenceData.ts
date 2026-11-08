// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosReferenceData.ts
//
// Reference data for POSPage, read from the aggregated lookups: lookup lists,
// default warehouse / currency / treasury, cached warehouse id, company-level
// allow_negative_stock + default price level, and the client balance.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { parseLookupBool } from '@/pos/utils/posSaleHelpers';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';

export function usePosReferenceData(params: {
  slug: string | null;
  posLookups: PosAggregatedLookups | undefined;
  settings: POSSettings;
  clientId: number | undefined;
}) {
  const { slug, posLookups, settings, clientId } = params;

  // ── Lookups from aggregated hook (called at top) ────────────────────────
  const warehouses       = posLookups?.warehouses ?? [];
  const documentTypes    = posLookups?.documentTypes ?? [];
  const priceLevelsList  = posLookups?.priceLevels ?? [];
  const currencies       = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears      = posLookups?.fiscalYears ?? [];
  const paymentModes     = posLookups?.paymentModes ?? [];

  // ── Client balance ──────────────────────────────────────────────────────────
  const { data: clientBalance } = useQuery({
    queryKey: tenantKeys.partyBalances.detail(slug ?? '', clientId!),
    queryFn:  () => partyBalancesApi.getOne(clientId!),
    enabled:  !!slug && !!clientId,
    staleTime: 30_000,
  });

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const realWarehouseId  = defaultWarehouse?.id ?? null;
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── Cached warehouse ID (avoid cascading delay for stock query) ────────────
  const WAREHOUSE_CACHE_KEY = `pos-warehouse-id-${slug}`;
  const [cachedWarehouseId, setCachedWarehouseId] = useState<number | null>(() => {
    try {
      const c = localStorage.getItem(WAREHOUSE_CACHE_KEY);
      if (c) { const n = parseInt(c, 10); if (!isNaN(n)) return n; }
    } catch {}
    return null;
  });
  // Use cached ID as fallback until the real warehouse query resolves
  const effectiveWarehouseId = realWarehouseId ?? cachedWarehouseId;
  // Sync cache when real warehouse becomes known
  useEffect(() => {
    if (realWarehouseId !== null && realWarehouseId !== cachedWarehouseId) {
      setCachedWarehouseId(realWarehouseId);
      try { localStorage.setItem(WAREHOUSE_CACHE_KEY, String(realWarehouseId)); } catch {}
    }
  }, [cachedWarehouseId, realWarehouseId]);

  // ── Company-level allow_negative_stock (from aggregated lookup) ──────────────
  const systemAllowNeg = parseLookupBool(posLookups?.settings?.allow_negative_stock, false);
  const allowNegSetting = systemAllowNeg;

  const dbDefaultPriceLevelId = (() => {
    const v = posLookups?.settings?.default_price_level_id;
    return v != null && v !== '' && v !== 0 ? Number(v) : null;
  })();

  return {
    warehouses, documentTypes, priceLevelsList, currencies, treasuryAccounts, fiscalYears, paymentModes,
    clientBalance,
    defaultWarehouse, defaultCurrency, defaultTreasury,
    effectiveWarehouseId, allowNegSetting, dbDefaultPriceLevelId,
  };
}
