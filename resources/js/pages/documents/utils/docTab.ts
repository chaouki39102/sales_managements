import { useEffect, useState } from 'react';

export type DocTabErrors = {
  warehouse_id?: unknown;
  fiscal_year_id?: unknown;
  currency_id?: unknown;
};

export function usePersistedDocTab(docCode: string, errors?: DocTabErrors) {
  const key = `doc-tab:${docCode}`;
  const [extraTab, setExtraTabState] = useState<string>(() => {
    try { return localStorage.getItem(key) || 'advanced'; }
    catch { return 'advanced'; }
  });
  const setExtraTab = (next: string) => {
    setExtraTabState(next);
    try { localStorage.setItem(key, next); } catch {}
  };
  useEffect(() => {
    if ((errors?.warehouse_id || errors?.fiscal_year_id || errors?.currency_id) && extraTab !== 'advanced') {
      setExtraTab('advanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, errors?.warehouse_id, errors?.fiscal_year_id, errors?.currency_id]);

  return [extraTab, setExtraTab] as const;
}