// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/audits.ts
// سجل التدقيق
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { useActiveSlug } from '../../store/appStore';
import type { PaginatedResponse, ListParams } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id:            number;
  company_id:    number;
  auditable_type: string;
  auditable_type_label: string;
  auditable_id:  number;
  event:         'created' | 'updated' | 'deleted';
  event_label:   string;
  action_summary: string;
  old_values:    Record<string, unknown>;
  new_values:    Record<string, unknown>;
  url:           string;
  ip_address:    string;
  user_agent:    string;
  user_id:       number | null;
  user?:         { id: number; name: string; email: string } | null;
  user_label:    string;
  auditable?:    { id: number; type_label: string; display_label: string } | null;
  humanized_diff: AuditDiffRow[];
  tags:          string | null;
  created_at:    string;
}

export interface AuditDiffRow {
  key:   string;
  label: string;
  old:   unknown;
  new:   unknown;
}

export interface AuditListParams extends ListParams {
  user_id?: number;
  event?:   string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const auditsApi = {
  list:    (params?: AuditListParams) =>
    apiGet<PaginatedResponse<AuditLog>>('/audits', params),

  show:    (id: number) =>
    apiGet<AuditLog>(`/audits/${id}`),

  byUser:  (userId: number, params?: ListParams) =>
    apiGet<PaginatedResponse<AuditLog>>(`/audits/user/${userId}`, params),

  byEvent: (event: string, params?: ListParams) =>
    apiGet<PaginatedResponse<AuditLog>>(`/audits/event/${event}`, params),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditLogs(params?: AuditListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'audits', params],
    queryFn:         () => auditsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}
