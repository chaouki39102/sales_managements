import React from 'react';

const STORAGE_KEY = 'pos-kb-override-';
const KB_CHANGE_EVENT = 'pos-kb-changed';

export const KB_DEFAULTS: Record<string, string> = {
  newSale: '',
  settings: '',
  toggleQuickbar: '',
  kioskMode: '',
  focusClient: 'Ctrl+K',
  closeSession: '',
  searchFocus: 'F2',
  payment: 'F4',
  holdCart: 'F5',
  heldCarts: 'F7',
  preview: 'F9',
  clearCart: 'F12',
  kbHelp: 'F1',
  filter: 'F3',
  manualProduct: 'F6',
  sessionStats: 'F8',
  returns: 'F10',
  fullscreen: 'F11',
  directPrint: 'Ctrl+P',
  quickSearch: 'Ctrl+F',
  gridView: 'Ctrl+ArrowUp',
  listView: 'Ctrl+ArrowDown',
  zoomIn: 'Ctrl+]',
  zoomOut: 'Ctrl+[',
  quickCat: 'Alt+1..9',
  qtyUp: 'NumpadAdd',
  qtyDown: 'NumpadSubtract',
  deleteItem: 'Delete',
  enterSearch: 'Enter',
  escape: 'Escape',
  confirmPayment: 'Ctrl+Enter',
  openDrawer: 'Ctrl+D',
  undoClear: 'Ctrl+Z',
  toggleHeld: 'Ctrl+ArrowRight',
  sessionInvoices: 'Ctrl+Shift+I',
  focusCart: 'Ctrl+Space',
  quickCash: '',
};

export function normalizeEventKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  const key = e.key;
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return parts.join('+');
  parts.push(key === ' ' ? 'Space' : key);
  return parts.join('+');
}

export function readOverrides(slug: string | null): Record<string, string> {
  if (!slug) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${slug}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Persist overrides and notify all components */
export function saveOverrides(slug: string | null, overrides: Record<string, string>): void {
  if (!slug) return;
  localStorage.setItem(`${STORAGE_KEY}${slug}`, JSON.stringify(overrides));
  window.dispatchEvent(new CustomEvent(KB_CHANGE_EVENT, { detail: { slug } }));
}

/** Like matchOverride but takes pre-read overrides — avoids 25× localStorage reads per keypress */
export function matchOverrideFrom(
  overrides: Record<string, string>,
  action: string,
  e: KeyboardEvent
): boolean {
  const expected = overrides[action] ?? KB_DEFAULTS[action];
  if (!expected) return false;
  return normalizeEventKey(e) === expected;
}

/** Get effective shortcut for an action (override or default, null if disabled) */
export function getEffectiveShortcut(slug: string | null, action: string): string | null {
  if (!slug) return null;
  const overrides = readOverrides(slug);
  const val = overrides[action];
  if (val === '') return null;
  return val ?? KB_DEFAULTS[action] ?? null;
}

/** React hook — returns current overrides, updates on saveOverrides() */
export function useKbOverrides(slug: string | null): Record<string, string> {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setV(x => x + 1);
    window.addEventListener(KB_CHANGE_EVENT, handler);
    return () => window.removeEventListener(KB_CHANGE_EVENT, handler);
  }, []);
  return React.useMemo(() => readOverrides(slug), [slug, v]);
}
