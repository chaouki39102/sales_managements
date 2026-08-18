// ════════════════════════════════════════════════════════════════════════════
// lib/store/storeBridge.ts — zero-dependency callback bridge
//
// client.ts needs to call appActions.reset() but MUST NOT import appStore
// (that creates a circular chunk dependency). This tiny module holds a
// callback reference — appStore registers it at init, client.ts invokes it.
// ════════════════════════════════════════════════════════════════════════════

type ResetFn = () => void;

let _reset: ResetFn | null = null;

export function registerReset(fn: ResetFn): void {
  _reset = fn;
}

export function callReset(): void {
  try { _reset?.(); } catch {}
}
