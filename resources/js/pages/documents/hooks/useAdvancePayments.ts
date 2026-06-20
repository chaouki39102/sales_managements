import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface AdvancePayment {
  id:                number;
  payment_number:    string | null;
  payment_date:      string;
  amount:            number;
  unapplied_amount:  number;
  payment_mode_id:   number;
  payment_mode_name: string | null;
  reference:         string | null;
}

export function useAdvancePayments(partyId: number | null, enabled: boolean) {
  const slug = useActiveSlug();
  return useQuery<AdvancePayment[]>({
    queryKey: [slug, 'advance-payments', partyId],
    queryFn: async () => {
      if (!partyId) return [];
      return apiGet<AdvancePayment[]>(`/parties/${partyId}/advances`);
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 30_000,
    gcTime: 15_000,
  });
}
