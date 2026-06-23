const STORAGE_KEY = 'pos-kb-override-';

export const KB_DEFAULTS: Record<string, string> = {
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
  fullscreen: 'F11',
  directPrint: 'Ctrl+P',
  quickSearch: 'Ctrl+F',
  gridView: 'Ctrl+ArrowUp',
  listView: 'Ctrl+ArrowDown',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  quickCat: 'Alt+1..9',
  qtyUp: 'NumpadAdd',
  qtyDown: 'NumpadSubtract',
  deleteItem: 'Delete',
  enterSearch: 'Enter',
  escape: 'Escape',
  confirmPayment: 'Ctrl+Enter',
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

export function matchOverride(slug: string | null, action: string, e: KeyboardEvent): boolean {
  if (!slug) return false;
  const overrides = readOverrides(slug);
  const expected = overrides[action] ?? KB_DEFAULTS[action];
  return normalizeEventKey(e) === expected;
}
