import { useCallback } from 'react';
import { apiGet } from '@/lib/api/core/client';

export function useLookupOptions(resource: string, which = 'name') {
  return useCallback(async () => {
    const res = await apiGet<any>(resource, { per_page: 9999 });
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    return [...new Set(list.map((x: any) => x[which]).filter(Boolean))] as string[];
  }, [resource, which]);
}