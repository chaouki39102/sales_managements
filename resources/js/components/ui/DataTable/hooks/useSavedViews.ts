// DataTable/hooks/useSavedViews.ts

import { useCallback } from 'react';
import type { SavedView, SavedViewsConfig } from '../types';

// ─── useSavedViews (حفظ واسترجاع العروض) ────────────────────────────────────

export function useSavedViews(config: SavedViewsConfig) {
  const { tableKey, maxViews = 10 } = config;
  const storageKey = `datatable_views_${tableKey}`;
  const loadViews = useCallback((): SavedView[] => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }, [storageKey]);
  const saveView = useCallback((name: string, viewData: Omit<SavedView, 'id' | 'name' | 'createdAt'>) => {
    const views = loadViews();
    const newView: SavedView = { id: Date.now().toString(), name, createdAt: Date.now(), ...viewData };
    const updated = [newView, ...views].slice(0, maxViews);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return newView;
  }, [loadViews, storageKey, maxViews]);
  const deleteView = useCallback((id: string) => {
    const views = loadViews();
    const filtered = views.filter(v => v.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
  }, [loadViews, storageKey]);
  const applyView = useCallback((view: SavedView, applyCallback: (view: SavedView) => void) => {
    applyCallback(view);
  }, []);
  return { loadViews, saveView, deleteView, applyView };
}
