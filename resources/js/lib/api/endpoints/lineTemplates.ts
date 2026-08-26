// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/lineTemplates.ts — قوالب أسطر المستندات
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineTemplateLine {
  product_id:             string;
  description:            string;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage:    number;
  discount_amount_fixed:  number;
  tva_rate:               number;
  packaging_id:           string;
  line_note:              string;
  _packQty:               number;
}

export interface LineTemplate {
  id:         number;
  company_id: number;
  name:       string;
  lines:      LineTemplateLine[];
  created_at: string;
  updated_at: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const lineTemplatesApi = {
  list:   ()                          => apiGet<LineTemplate[]>('/line-templates'),
  show:   (id: number)                => apiGet<LineTemplate>(`/line-templates/${id}`),
  create: (data: { name: string; lines: LineTemplateLine[] }) =>
                                        apiPost<LineTemplate>('/line-templates', data),
  update: (id: number, data: { name: string; lines: LineTemplateLine[] }) =>
                                        apiPut<LineTemplate>(`/line-templates/${id}`, data),
  delete: (id: number)                => apiDelete(`/line-templates/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLineTemplates() {
  const slug = useActiveSlug();
  return useQuery<LineTemplate[]>({
    queryKey: tenantKeys.lineTemplates.list(slug ?? ''),
    queryFn:  () => lineTemplatesApi.list(),
    enabled:  !!slug,
    staleTime: 60_000,
    select: (data) => {
      // apiGet returns PaginatedResponse<LineTemplate> = { data: T[], meta, links }
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'data' in data) {
        const paged = data as { data: unknown };
        if (Array.isArray(paged.data)) return paged.data as LineTemplate[];
      }
      return [];
    },
  });
}

export function useLineTemplateMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.lineTemplates.all(slug) }); };

  return {
    create: useMutation({ mutationFn: lineTemplatesApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: { name: string; lines: LineTemplateLine[] } }) =>
                                        lineTemplatesApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: lineTemplatesApi.delete,  onSuccess: inv }),
  };
}
