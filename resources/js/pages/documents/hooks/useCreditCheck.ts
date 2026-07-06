import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface CreditCheckResult {
  party_id:              number;
  party_name:            string;
  credit_limit:          number;
  credit_days:           number;
  used_credit:           number;
  available_credit:      number | null;
  new_amount:            number;
  total_after:           number;
  will_exceed:           boolean;
  exceed_by:             number;
  suggested_due_date:    string | null;
  overdue_invoices:      { count: number; total_amount: number };
  is_tva_exempt:         boolean;
  is_final_consumer:     boolean;
  default_price_level_id: number | null;
  alerts:                Array<{ type: string; level: string; message: string }>;
  can_proceed:           boolean;
}

export function useCreditCheck(options: {
  partyId:    number | null;
  amount:     number;
  date:       string;
  isPurchase: boolean;
  enabled:    boolean;
}) {
  const slug = useActiveSlug();

  return useQuery<CreditCheckResult | null>({
    queryKey: [slug, 'credit-check', options.partyId, Math.round(options.amount), options.date],
    queryFn: async () => {
      if (!options.partyId) return null;
      return apiGet<CreditCheckResult>(
        `/parties/${options.partyId}/credit-check`,
        { amount: options.amount, date: options.date },
      );
    },
    enabled: !!slug && !!options.partyId && !options.isPurchase && options.enabled,
    staleTime: 30_000,
    gcTime: 10_000,
  });
}
