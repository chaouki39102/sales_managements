import React from 'react';

const STORAGE_KEY = 'pos-kb-override-';
const KB_CHANGE_EVENT = 'pos-kb-changed';

/** Default shortcuts — single key string per action */
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
  quickCash: 'F3',
};

// ─── Normalization ──────────────────────────────────────────────────────────

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

// ─── Storage (string[] per action) ──────────────────────────────────────────

export type KbOverrides = Record<string, string[]>;

function migrateRaw(raw: string | null): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result: Record<string, string[]> = {};
    for (const [action, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        result[action] = val.filter((v): v is string => typeof v === 'string' && v.length > 0);
      } else if (typeof val === 'string') {
        result[action] = val ? [val] : [];
      }
    }
    return result;
  } catch { return {}; }
}

export function readOverrides(slug: string | null): KbOverrides {
  if (!slug) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${slug}`);
    return migrateRaw(raw);
  } catch { return {}; }
}

export function saveOverrides(slug: string | null, overrides: KbOverrides): void {
  if (!slug) return;
  localStorage.setItem(`${STORAGE_KEY}${slug}`, JSON.stringify(overrides));
  window.dispatchEvent(new CustomEvent(KB_CHANGE_EVENT, { detail: { slug } }));
}

// ─── Matching ───────────────────────────────────────────────────────────────

/**
 * Check if event matches ANY shortcut assigned to the action.
 * An existing entry (even an empty array) means the action is explicitly
 * configured — the default is NOT applied. Only a missing entry falls back
 * to KB_DEFAULTS. This lets users set a shortcut to "none" by removing all.
 */
export function matchOverrideFrom(
  overrides: KbOverrides,
  action: string,
  e: KeyboardEvent,
): boolean {
  const combo = normalizeEventKey(e);
  const assigned = overrides[action];
  if (assigned) {
    return assigned.includes(combo);
  }
  const def = KB_DEFAULTS[action];
  return def ? combo === def : false;
}

// ─── Display helpers ────────────────────────────────────────────────────────

/** Get the first/primary shortcut for badge display (null = none) */
export function getEffectiveShortcut(slug: string | null, action: string): string | null {
  if (!slug) return null;
  const overrides = readOverrides(slug);
  const arr = overrides[action];
  if (arr) return arr[0] ?? null;
  const def = KB_DEFAULTS[action];
  return def || null;
}

/** Get all shortcuts for an action (empty array = explicitly none) */
export function getEffectiveShortcuts(slug: string | null, action: string): string[] {
  if (!slug) return [];
  const overrides = readOverrides(slug);
  const arr = overrides[action];
  if (arr) return arr;
  const def = KB_DEFAULTS[action];
  return def ? [def] : [];
}

// ─── CRUD helpers ───────────────────────────────────────────────────────────

/** Add a shortcut to an action. Returns true if added, false if duplicate. */
export function addShortcut(overrides: KbOverrides, action: string, combo: string): KbOverrides {
  const existing = overrides[action] ?? [];
  if (existing.includes(combo)) return overrides;
  return { ...overrides, [action]: [...existing, combo] };
}

/** Remove a specific shortcut from an action. When the last one is removed, stores [] = explicit "none". */
export function removeShortcut(overrides: KbOverrides, action: string, combo: string): KbOverrides {
  const existing = overrides[action] ?? [];
  const next = existing.filter(k => k !== combo);
  const result = { ...overrides };
  if (next.length === 0) {
    result[action] = [];
  } else {
    result[action] = next;
  }
  return result;
}

/** Clear all shortcuts for an action — stores [] = explicit "none" (default NOT restored) */
export function clearShortcuts(overrides: KbOverrides, action: string): KbOverrides {
  return { ...overrides, [action]: [] };
}

// ─── React hook ─────────────────────────────────────────────────────────────

export function useKbOverrides(slug: string | null): KbOverrides {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setV(x => x + 1);
    window.addEventListener(KB_CHANGE_EVENT, handler);
    return () => window.removeEventListener(KB_CHANGE_EVENT, handler);
  }, []);
  return React.useMemo(() => readOverrides(slug), [slug, v]);
}
