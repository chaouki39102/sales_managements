// ════════════════════════════════════════════════
// resources/js/hooks/useLookup.ts
// Hook عام لصفحات الجداول البسيطة (CRUD)
// ════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api/client';

export interface LookupState<T> {
  items:    T[];
  loading:  boolean;
  error:    string | null;
  saving:   boolean;
}

export interface UseLookupReturn<T> {
  items:    T[];
  loading:  boolean;
  error:    string | null;
  saving:   boolean;
  refetch:  () => void;
  create:   (data: Partial<T>) => Promise<void>;
  update:   (id: number, data: Partial<T>) => Promise<void>;
  remove:   (id: number) => Promise<void>;
}

export function useLookup<T extends { id: number }>(endpoint: string): UseLookupReturn<T> {
  const [state, setState] = useState<LookupState<T>>({
    items: [], loading: true, error: null, saving: false,
  });

  const fetchAll = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await apiClient.get<{ data: T[] }>(endpoint);
      // يدعم كلا الشكلين: { data: [...] } أو { data: { data: [...] } }
      const raw = (res.data as any);
      const items: T[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.data?.data)
          ? raw.data.data
          : [];
      setState(s => ({ ...s, items, loading: false }));
    } catch (e: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: e?.response?.data?.message || 'حدث خطأ في جلب البيانات',
      }));
    }
  }, [endpoint]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (data: Partial<T>) => {
    setState(s => ({ ...s, saving: true }));
    try {
      const res = await apiClient.post<{ data: T }>(endpoint, data);
      const newItem = res.data.data;
      setState(s => ({ ...s, items: [newItem, ...s.items], saving: false }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.response?.data?.message || 'فشل الحفظ');
    }
  }, [endpoint]);

  const update = useCallback(async (id: number, data: Partial<T>) => {
    setState(s => ({ ...s, saving: true }));
    try {
      const res = await apiClient.put<{ data: T }>(`${endpoint}/${id}`, data);
      const updated = res.data.data;
      setState(s => ({
        ...s,
        items: s.items.map(i => i.id === id ? updated : i),
        saving: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.response?.data?.message || 'فشل التحديث');
    }
  }, [endpoint]);

  const remove = useCallback(async (id: number) => {
    setState(s => ({ ...s, saving: true }));
    try {
      await apiClient.delete(`${endpoint}/${id}`);
      setState(s => ({
        ...s,
        items: s.items.filter(i => i.id !== id),
        saving: false,
      }));
    } catch (e: any) {
      setState(s => ({ ...s, saving: false }));
      throw new Error(e?.response?.data?.message || 'فشل الحذف');
    }
  }, [endpoint]);

  return { ...state, refetch: fetchAll, create, update, remove };
}
