// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/attachments.ts — Polymorphic attachment management
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete, apiUpload, apiDownload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Exact class-string stored in `attachments.attachable_type` for documents. */
export const COMMERCIAL_DOCUMENT_ATTACHABLE = 'App\\Models\\CommercialDocument';

/** امتدادات مطابقة للسماحات الخلفية — keep in sync with AttachmentService::ALLOWED_EXTENSIONS. */
export const ATTACHMENT_ALLOWED_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'txt',
] as const;

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

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

  /** Builds the multipart FormData for `POST /attachments` (tenant-scoped via interceptor). */
  buildUploadFormData: (attachableType: string, attachableId: number, file: File, extras?: Record<string, string>) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('attachable_type', attachableType);
    fd.append('attachable_id', String(attachableId));
    fd.append('is_public', '0');
    if (extras) {
      for (const [k, v] of Object.entries(extras)) fd.append(k, v);
    }
    return fd;
  },

  // NOTE: paths are relative to the axios baseURL (`/api/v1`); the request
  // interceptor prepends `/{slug}/`. Never pass an absolute `/api/v1/...` here
  // (it would double-prefix).
  downloadUrl: (id: number) =>
    `/attachments/${id}/download`,

  viewUrl: (id: number) =>
    `/attachments/${id}/view`,

  download: (id: number): Promise<Blob> =>
    apiDownload(attachmentsApi.downloadUrl(id)),

  view: (id: number): Promise<Blob> =>
    apiDownload(attachmentsApi.viewUrl(id)),
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
    queryKey:  [...tenantKeys.lookups.attachments(slug ?? ''), 'by-attachable', type, id],
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
