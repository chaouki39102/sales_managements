// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/settings.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

export interface Setting { key: string; value: unknown; group: string; }

export const settingsApi = {
  list:     ()                         => apiGet<Setting[]>('/settings'),
  update:   (settings: Record<string, unknown>) => apiPut<Setting[]>('/settings', settings),
  byGroup:  (group: string)            => apiGet<Setting[]>(`/settings/group/${group}`),
} as const;

export function useSettings() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.settings.current(slug ?? ''),
    queryFn:  settingsApi.list,
    enabled:  !!slug,
    staleTime: 15 * 60_000,
  });
}

export function useSettingsMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return {
    update: useMutation({
      mutationFn: settingsApi.update,
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: tenantKeys.settings.all(slug) });
      },
    }),
  };
}
