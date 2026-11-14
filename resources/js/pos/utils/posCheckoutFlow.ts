// ════════════════════════════════════════════════════════════════════════════
// pos/utils/posCheckoutFlow.ts
//
// Sale-completion plumbing shared by the POS checkouts (classic, Pro, mobile,
// kiosk):
//  - a checkout lock: while a sale is being saved the cart cannot be edited
//    (it is cleared right after the save, so an edit would be lost) and a
//    second "complete sale" is refused (no double sale);
//  - print-once per document, so impatient clicks / retry never print twice;
//  - after-sale bookkeeping that waits for the receipt request to go first.
// ════════════════════════════════════════════════════════════════════════════
import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

let lockToken = 0;
let nextToken = 1;
let onBlocked: (() => void) | null = null;

/** Lock cart editing for one save. Returns a token, or 0 if a sale is already saving. */
export function beginCheckout(blocked?: () => void): number {
  if (lockToken) return 0;
  lockToken = nextToken++;
  onBlocked = blocked ?? null;
  return lockToken;
}

/** Release the lock (idempotent; only the owner's token releases it). */
export function endCheckout(token: number): void {
  if (token && token === lockToken) {
    lockToken = 0;
    onBlocked = null;
  }
}

export function isCheckoutLocked(): boolean {
  return lockToken !== 0;
}

/** Calls the blocked notifier and returns true when the cart is locked. */
export function rejectIfCheckoutLocked(): boolean {
  if (!lockToken) return false;
  onBlocked?.();
  return true;
}

type Mut = [StoreMutatorIdentifier, unknown][];

/**
 * Zustand middleware: every write to the store (internal `set` and external
 * `setState`) is dropped while a sale is saving.
 */
export function lockable<T, Mps extends Mut = [], Mcs extends Mut = []>(
  config: StateCreator<T, Mps, Mcs>,
): StateCreator<T, Mps, Mcs> {
  return ((set: any, get: any, api: any) => {
    const guard = (fn: (...a: any[]) => any) => (...a: any[]) =>
      rejectIfCheckoutLocked() ? undefined : fn(...a);
    api.setState = guard(api.setState);
    return (config as any)(guard(set), get, api);
  }) as StateCreator<T, Mps, Mcs>;
}

const printing = new Set<string>();

/** Run `print` unless the same document is already printing. */
export async function printOnce(key: string | null | undefined, print: () => Promise<unknown>): Promise<void> {
  if (!key) { await print(); return; }
  if (printing.has(key)) return;
  printing.add(key);
  try { await print(); } finally { printing.delete(key); }
}

/**
 * Run after-sale bookkeeping (session counters, cache refetches) once the
 * receipt print settles: the local server answers one request at a time, so
 * refetches sent first would delay the receipt. Capped so a slow or hung print
 * never holds it back.
 */
export function afterPrint(print: Promise<unknown> | null, work: () => void, capMs = 3000): void {
  if (!print) { work(); return; }
  let done = false;
  const run = () => { if (!done) { done = true; work(); } };
  print.then(run, run);
  setTimeout(run, capMs);
}

/** sonner options for a print-failure toast with a «إعادة الطباعة» button. */
export function retryPrintToast(retry: () => void) {
  return { duration: 15000, action: { label: 'إعادة الطباعة', onClick: retry } };
}
