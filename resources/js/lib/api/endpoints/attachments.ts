// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/attachments.ts — Polymorphic attachment management
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Attachment {
  id:             number;
  company_id:     number;
  file_name:      string;
  file_path:      string;
  file_type:      string;
  file_extension: string;
  file_size:      number;
  title:          string | null;
  description:    string | null;
  category:       string | null;
  is_public:      boolean;
  disk:           string;
  uploaded_by:    number | null;
  attachable_type: string | null;
  attachable_id:  number | null;
  url:            string;
  downloadUrl:    string;
  created_at:     string;
  updated_at:     string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const attachmentsApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<{ data: Attachment[] }>('/attachments', params),

  listByAttachable: (type: string, id: number) =>
    apiGet<{ data: Attachment[] }>('/attachments', {
      'filter[attachable_type]': type,
      'filter[attachable_id]':   id,
    }),

  show: (id: number) =>
    apiGet<Attachment>(`/attachments/${id}`),

  upload: (data: FormData, onProgress?: (p: number) => void) =>
    apiUpload<Attachment>('/attachments', data, onProgress),

  delete: (id: number) =>
    apiDelete(`/attachments/${id}`),

  downloadUrl: (id: number) =>
    `/api/v1/attachments/${id}/download`,
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAttachments(params?: Record<string, unknown>) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.lookups.attachments(slug ?? ''),
    queryFn:   () => attachmentsApi.list(params),
    enabled:   !!slug,
    staleTime: 2 * 60_000,
  });
}

export function useAttachmentsByAttachable(type: string | null, id: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.lookups.attachments(slug ?? ''),
    queryFn:   () => attachmentsApi.listByAttachable(type!, id!),
    enabled:   !!slug && !!type && id != null,
    staleTime: 2 * 60_000,
  });
}

export function useAttachmentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.lookups.all(slug) });
  };

  const upload = useMutation({
    mutationFn: ({ formData, onProgress }: { formData: FormData; onProgress?: (p: number) => void }) =>
      attachmentsApi.upload(formData, onProgress),
    onSuccess: inv,
  });

  const remove = useMutation({
    mutationFn: attachmentsApi.delete,
    onSuccess:  inv,
  });

  return { upload, remove };
}
