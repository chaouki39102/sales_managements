// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/crossTab.ts
// Cross-tab cache sync — BroadcastChannel
// ════════════════════════════════════════════════════════════════════════════
// React Query caches live per-tab: a mutation in tab A never reaches the POS
// open in tab B (and refetchOnWindowFocus is off), so stock/products look
// frozen until reload. Mutations broadcast `{slug}` here; every other tab
// invalidates its POS query families for that slug and live-mounted
// observers refetch immediately.

const CHANNEL = 'posdz-cache-sync';

type Listener = (slug: string) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function ensure(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev: MessageEvent) => {
      const slug = (ev.data as { slug?: unknown } | null)?.slug;
      if (typeof slug === 'string' && slug) {
        listeners.forEach((l) => l(slug));
      }
    };
  }
  return channel;
}

/** Broadcast a successful tenant mutation to all OTHER tabs (same slug). */
export function notifyOtherTabs(slug?: string | null): void {
  const ch = ensure();
  if (!ch || !slug) return;
  try {
    ch.postMessage({ slug });
  } catch {
    // channel closed / serialization issue — never break the mutation
  }
}

/** Subscribe this tab to other tabs' mutations. Returns an unsubscribe fn. */
export function onOtherTabMutation(cb: Listener): () => void {
  ensure();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
