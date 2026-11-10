// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosCartGuards.ts
//
// Cart invariants for POSPage:
//   • clear the cart on company switch (stale product_id values from another
//     company would be rejected by validateTenantRelationsMany with a 422);
//   • clear a persisted client that belongs to another company (stale cart
//     state rehydrated in a new company would send an invalid party_id);
//   • default client "Client Cash" on mount / after clearCart.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { useCashClient } from '@/lib/api/endpoints/parties';
import type { PosState } from './posPageTypes';

export function usePosCartGuards(params: {
  slug: string | null;
  activeCompanyId?: number | null;
  pos: PosState;
  posRef: { readonly current: PosState };
}) {
  const { slug, activeCompanyId = null, pos, posRef } = params;

  const prevSlugRef = useRef(slug);
  useEffect(() => {
    const slugChanged = prevSlugRef.current && prevSlugRef.current !== slug;
    const client = posRef.current.client;
    const staleClient =
      !!activeCompanyId &&
      !!client?.company_id &&
      client.company_id !== activeCompanyId;

    if (slugChanged || staleClient) {
      posRef.current.clearCart();
    }
    prevSlugRef.current = slug;
  }, [slug, activeCompanyId, posRef]); // posRef is a stable ref object — listed for lint only

  // ── Default client: "Client Cash" on mount / after clearCart ──────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) {
      pos.setClient(cashClient);
    }
  }, [cashClient, pos.client, pos.setClient, posRef]);
}
