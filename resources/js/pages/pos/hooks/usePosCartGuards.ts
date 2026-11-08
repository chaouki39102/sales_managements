// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosCartGuards.ts
//
// Cart invariants for POSPage:
//   • clear the cart on company switch (stale product_id values from another
//     company would be rejected by validateTenantRelationsMany with a 422);
//   • default client "Client Cash" on mount / after clearCart.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { useCashClient } from '@/lib/api/endpoints/parties';
import type { PosState } from './posPageTypes';

export function usePosCartGuards(params: {
  slug: string | null;
  pos: PosState;
  posRef: { readonly current: PosState };
}) {
  const { slug, pos, posRef } = params;

  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (prevSlugRef.current && prevSlugRef.current !== slug) {
      posRef.current.clearCart();
    }
    prevSlugRef.current = slug;
  }, [slug, posRef]); // posRef is a stable ref object — listed for lint only

  // ── Default client: "Client Cash" on mount / after clearCart ──────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) {
      pos.setClient(cashClient);
    }
  }, [cashClient, pos.client, pos.setClient, posRef]);
}
