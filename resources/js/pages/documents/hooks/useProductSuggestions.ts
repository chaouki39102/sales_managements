import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface ProductSuggestion {
  id:              number;
  name:            string;
  ref:             string | null;
  order_count:     number;
  total_qty:       number;
  suggested_price: number | null;
  suggested_tva:   number | null;
}

export function useProductSuggestions(
  partyId:    number | null,
  isPurchase: boolean,
  enabled:    boolean,
) {
  const slug = useActiveSlug();
  return useQuery<ProductSuggestion[]>({
    queryKey: [slug, 'product-suggestions', partyId, isPurchase],
    queryFn: async () => {
      if (!partyId) return [];
      return apiGet<ProductSuggestion[]>(`/parties/${partyId}/product-suggestions`, {
        is_purchase: isPurchase,
        limit: 5,
      });
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 120_000,
    gcTime: 60_000,
  });
}
