import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { useActiveSlug } from '@/lib/store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: number;
  company_id: number;
  name: string;
  doc_type_code: string | null;
  subject: string | null;
  body: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaceholderItem {
  key: string;
  label: string;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const emailTemplatesApi = {
  list: (docTypeCode?: string) =>
    apiGet<EmailTemplate[]>('/email-templates', docTypeCode ? { doc_type_code: docTypeCode } : undefined),

  show: (id: number) =>
    apiGet<EmailTemplate>(`/email-templates/${id}`),

  create: (data: Partial<EmailTemplate>) =>
    apiPost<EmailTemplate>('/email-templates', data),

  update: (id: number, data: Partial<EmailTemplate>) =>
    apiPut<EmailTemplate>(`/email-templates/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/email-templates/${id}`),

  setDefault: (id: number) =>
    apiPost<EmailTemplate>(`/email-templates/${id}/set-default`),

  placeholders: () =>
    apiGet<PlaceholderItem[]>('/email-templates/placeholders'),
};

// ─── React Query hooks (slug-aware) ───────────────────────────────────────────

const emailTplKeys = {
  all:       (slug: string | null) => [slug, 'email-templates'] as const,
  list:      (slug: string | null, docTypeCode?: string) =>
    [slug, 'email-templates', 'list', docTypeCode] as const,
  detail:    (slug: string | null, id: number) =>
    [slug, 'email-templates', id] as const,
  placeholders: (slug: string | null) =>
    [slug, 'email-templates', 'placeholders'] as const,
};

/**
 * Runtime hook — fetches email templates for a doc type.
 * Used by DocumentsPage, DocumentViewModal, InvoicesPage.
 */
export function useEmailTemplatesList(docTypeCode?: string) {
  const slug = useActiveSlug();
  return useQuery<EmailTemplate[]>({
    queryKey: emailTplKeys.list(slug, docTypeCode),
    queryFn:  () => emailTemplatesApi.list(docTypeCode),
    enabled:  !!slug,
    staleTime: 60_000,
  });
}

/**
 * Fetch all email templates for the company (no filter).
 * Used by Settings MailTab.
 */
export function useEmailTemplates() {
  const slug = useActiveSlug();
  return useQuery<EmailTemplate[]>({
    queryKey: emailTplKeys.all(slug),
    queryFn:  () => emailTemplatesApi.list(),
    enabled:  !!slug,
    staleTime: 30_000,
  });
}

export function useEmailTemplateMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: emailTplKeys.all(slug) });

  return {
    create: useMutation({
      mutationFn: (data: Partial<EmailTemplate>) => emailTemplatesApi.create(data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...data }: Partial<EmailTemplate> & { id: number }) =>
        emailTemplatesApi.update(id, data),
      onSuccess: invalidate,
    }),
    delete: useMutation({
      mutationFn: (id: number) => emailTemplatesApi.delete(id),
      onSuccess: invalidate,
    }),
    setDefault: useMutation({
      mutationFn: (id: number) => emailTemplatesApi.setDefault(id),
      onSuccess: invalidate,
    }),
  };
}

export function usePlaceholders() {
  const slug = useActiveSlug();
  return useQuery<PlaceholderItem[]>({
    queryKey: emailTplKeys.placeholders(slug),
    queryFn:  () => emailTemplatesApi.placeholders(),
    enabled:  !!slug,
    staleTime: Infinity,
  });
}
