import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface CustomerInsightsData {
  party_id:           number;
  party_name:         string;
  party_type:         string | null;
  document_count:     number;
  last_documents:     Array<{
    id:               number;
    document_number:  string;
    document_type:    string | null;
    type_name:        string | null;
    document_date:    string;
    net_to_pay:       number;
    remaining_amount: number;
    status:           string | null;
    status_label:     string | null;
  }>;
  monthly_avg_invoice: number | null;
  avg_payment_days:   number | null;
  top_products:       Array<{
    id:           number;
    name:         string;
    ref:          string | null;
    total_qty:    number;
    total_amount: number;
  }>;
}

export function useCustomerInsights(partyId: number | null, enabled: boolean) {
  const slug = useActiveSlug();
  return useQuery<CustomerInsightsData | null>({
    queryKey: [slug, 'customer-insights', partyId],
    queryFn: async () => {
      if (!partyId) return null;
      return apiGet<CustomerInsightsData>(`/parties/${partyId}/insights`);
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 60_000,
    gcTime: 30_000,
  });
}
