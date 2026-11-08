// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/posPageTypes.ts — shared types for the POSPage hooks
// ════════════════════════════════════════════════════════════════════════════
import type { usePOS } from '@/pos/hooks/usePOS';

/** Return value of usePOS() as used by POSPage and its hooks. */
export type PosState = ReturnType<typeof usePOS>;

/** Manager-PIN gate request (discounts over the threshold). */
export type PinModalRequest = {
  requestedDiscount: number;
  reason: 'max_exceeded' | 'pin_required';
  onSuccess: () => void;
} | null;

export type { CompleteSaleParams } from '@/pos/utils/posSaleHelpers';
