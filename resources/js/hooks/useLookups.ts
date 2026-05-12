// ════════════════════════════════════════════════
// resources/js/hooks/useLookups.ts
// ✅ مُصحَّح: يستخدم apiClient مباشرة + slug في queryKey
//    لضمان عزل كاش كل شركة عن الأخرى
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import type {
  Family, Brand, ProductType, Unit,
  TvaRate, PriceLevel, InventoryValuationMethod, Warehouse,
} from '@/types/product';

// ── مساعد لاستخراج المصفوفة من أي شكل رد ────────
function extractList<T>(response: any): T[] {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data))       return response.data;
  if (Array.isArray(response))             return response;
  return [];
}

// ── إعدادات مشتركة ───────────────────────────────
const STALE = Infinity; // lookup data نادراً ما تتغير

export function useLookups() {
  const { activeCompany } = useAuth();
  const slug = activeCompany?.slug ?? '';
  const enabled = !!slug; // لا تجلب قبل تحديد الشركة

  const families = useQuery<Family[]>({
    queryKey: ['families', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/families', { params: { per_page: 200 } })
        .then(r => extractList<Family>(r.data)),
  });

  const brands = useQuery<Brand[]>({
    queryKey: ['brands', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/brands', { params: { per_page: 200 } })
        .then(r => extractList<Brand>(r.data)),
  });

  const productTypes = useQuery<ProductType[]>({
    queryKey: ['product-types', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/product-types', { params: { per_page: 50 } })
        .then(r => extractList<ProductType>(r.data)),
  });

  const units = useQuery<Unit[]>({
    queryKey: ['units', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/units', { params: { per_page: 100 } })
        .then(r => extractList<Unit>(r.data)),
  });

  const tvaRates = useQuery<TvaRate[]>({
    queryKey: ['tvas', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/tvas', { params: { per_page: 20 } })
        .then(r => extractList<TvaRate>(r.data)),
  });

  const priceLevels = useQuery<PriceLevel[]>({
    queryKey: ['price-levels', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/price-levels', { params: { per_page: 50 } })
        .then(r => extractList<PriceLevel>(r.data)),
  });

  const valuationMethods = useQuery<InventoryValuationMethod[]>({
    queryKey: ['valuation-methods', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/inventory-valuation-methods', { params: { per_page: 20 } })
        .then(r => extractList<InventoryValuationMethod>(r.data)),
  });

  const warehouses = useQuery<Warehouse[]>({
    queryKey: ['warehouses', slug],
    enabled,
    staleTime: STALE,
    queryFn: () =>
      apiClient.get('/warehouses', { params: { per_page: 50 } })
        .then(r => extractList<Warehouse>(r.data)),
  });

  return {
    families:         families.data       ?? [],
    brands:           brands.data         ?? [],
    productTypes:     productTypes.data   ?? [],
    units:            units.data          ?? [],
    tvaRates:         tvaRates.data       ?? [],
    priceLevels:      priceLevels.data    ?? [],
    valuationMethods: valuationMethods.data ?? [],
    warehouses:       warehouses.data     ?? [],
    isLoading:
      families.isLoading   ||
      brands.isLoading     ||
      productTypes.isLoading,
  };
}
