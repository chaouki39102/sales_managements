// pages/documents/hooks/useQuickSaleLookups.ts
// استعلامات البيع السريع (منتجات، زبائن، طرق دفع، خزينة، مستودعات) + القيم الافتراضية
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { extractList } from '../quick-sale/quickSale.utils';
import type { Product, PaymentMode, TreasuryAccount } from '../quick-sale/quickSale.types';

export function useQuickSaleLookups(slug: string | null | undefined, open: boolean) {
  const { data: fiscalStampRaw } = useQuery({
    queryKey: [slug, 'settings', 'fiscal_stamp_enabled'],
    queryFn:  () => settingsApi.getValue('fiscal_stamp_enabled'),
    enabled:  !!slug && open,
    staleTime: 60_000,
  });
  const fiscalStampEnabled = useMemo(() => {
    const v = fiscalStampRaw?.value;
    return v === undefined || v === true || v === 'true' || v === 1 || v === '1';
  }, [fiscalStampRaw]);

  // Queries
  const { data: rawProducts = [], isLoading: loadingProds } = useQuery({
    queryKey: [slug, 'quick-sale-products'],
    queryFn: () =>
      apiGet<unknown>('/products', { per_page: 500, include: 'unit,tva' }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawParties = [] } = useQuery({
    queryKey: [slug, 'quick-sale-customers'],
    queryFn: () => apiGet<unknown>('/customers', { per_page: 500 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawPaymentModes = [] } = useQuery({
    queryKey: [slug, 'quick-sale-payment-modes'],
    queryFn: () => apiGet<unknown>('/payment-modes', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawTreasuryAccounts = [] } = useQuery({
    queryKey: [slug, 'quick-sale-treasury'],
    queryFn: () => apiGet<unknown>('/treasury-accounts', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: settingsDict } = useQuery({
    queryKey: [slug, 'settings-dict'],
    queryFn: () => settingsApi.list(),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawWarehouses = [] } = useQuery({
    queryKey: [slug, 'quick-sale-warehouses'],
    queryFn: () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const products = rawProducts as Product[];
  const parties = rawParties as Record<string, unknown>[];
  const paymentModes = rawPaymentModes as PaymentMode[];
  const treasuryAccounts = rawTreasuryAccounts as TreasuryAccount[];
  const warehouses = rawWarehouses as Record<string, unknown>[];

  // Defaults
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default);
    return dw ? String(dw.id) : warehouses[0] ? String(warehouses[0].id) : '';
  }, [warehouses]);

  // الدائم: طريقة الدفع نقدي (cash) وحساب الخزينة الأول
  const defaultPaymentModeId = useMemo(() => {
    const fromSettings = settingsDict?.default_payment_mode_id?.value;
    if (fromSettings) {
      const found = paymentModes.find(pm => pm.id === Number(fromSettings));
      if (found) return String(found.id);
    }
    const cash = paymentModes.find(
      pm => pm.name.toLowerCase().includes('نقد') || pm.code?.toLowerCase() === 'cash'
    );
    return cash ? String(cash.id) : paymentModes[0] ? String(paymentModes[0].id) : '';
  }, [paymentModes, settingsDict]);

  const defaultTreasuryId = useMemo(() => {
    const fromSettings = settingsDict?.default_treasury_account_id?.value;
    if (fromSettings) {
      const found = treasuryAccounts.find(t => t.id === Number(fromSettings));
      if (found) return String(found.id);
    }
    const def = treasuryAccounts.find(t => t.is_default);
    return def ? String(def.id) : treasuryAccounts[0] ? String(treasuryAccounts[0].id) : '';
  }, [treasuryAccounts, settingsDict]);

  return {
    fiscalStampEnabled,
    loadingProds,
    products,
    parties,
    paymentModes,
    treasuryAccounts,
    warehouses,
    defaultWarehouseId,
    defaultPaymentModeId,
    defaultTreasuryId,
  };
}
