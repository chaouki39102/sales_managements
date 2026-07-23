import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { ApiClient } from '../contracts/ApiClient';
import type { PrintTemplatesApi } from '../contracts/TemplateRepository';
import type { PrintTemplate, PrintTemplateApiResponse, DocTypeCode } from '../types';
import type { LibraryApiResponse } from '../template-library/types';
import { usePrintTemplatesApi, useSlug } from '../providers/PrintSettingsContext';
import { toApiPayload as serializePayload, fromApiResponse as deserializeResponse } from '../services/SettingsSerializer';

// ─── Query key factory ─────────────────────────────────────────────────────
export const printTemplateKeys = {
  all:     (slug: string)              => [slug, 'print-templates']              as const,
  list:    (slug: string, code?: string) => [slug, 'print-templates', 'list', code] as const,
  detail:  (slug: string, id: number)  => [slug, 'print-templates', id]         as const,
};

// ─── Pure helpers ──────────────────────────────────────────────────────────

function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  return serializePayload(tpl) as unknown as Record<string, unknown>;
}

// ─── Factory: creates PrintTemplatesApi from an ApiClient ──────────────────

export function createPrintTemplatesApi(api: ApiClient): PrintTemplatesApi {
  return {
    list: (docTypeCode?: string) =>
      api.get<PrintTemplateApiResponse[]>('/print-templates', docTypeCode
        ? { doc_type_code: docTypeCode } : undefined)
        .then(r => (Array.isArray(r) ? r : (r as Record<string, unknown>)?.data ?? [] as PrintTemplateApiResponse[]).map(deserializeResponse)),

    show: (id: number) =>
      api.get<PrintTemplateApiResponse>(`/print-templates/${id}`)
        .then(deserializeResponse),

    create: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      api.post<PrintTemplateApiResponse>('/print-templates', toApiPayload(tpl as unknown as Partial<PrintTemplate>))
        .then(deserializeResponse),

    update: (id: number, tpl: Partial<PrintTemplate>) =>
      api.put<PrintTemplateApiResponse>(`/print-templates/${id}`, toApiPayload(tpl))
        .then(deserializeResponse),

    delete: (id: number) =>
      api.delete(`/print-templates/${id}`),

    setDefault: (id: number) =>
      api.post<PrintTemplateApiResponse>(`/print-templates/${id}/set-default`)
        .then(deserializeResponse),

    duplicate: (id: number, newName: string) =>
      api.post<PrintTemplateApiResponse>(`/print-templates/${id}/duplicate`, { name: newName })
        .then(deserializeResponse),

    library: () =>
      api.get<LibraryApiResponse[]>('/print-templates/library')
        .then(r => (Array.isArray(r) ? r : (r as Record<string, unknown>)?.data ?? [] as LibraryApiResponse[])),

    installLibrary: (templateId: string, docTypeCode?: string) =>
      api.post<PrintTemplateApiResponse>('/print-templates/library/install', {
        template_id: templateId,
        ...(docTypeCode ? { doc_type_code: docTypeCode } : {}),
      }).then(deserializeResponse),

    uploadLogo: (file: File, onProgress?: (p: number) => void) => {
      const fd = new FormData();
      fd.append('logo', file);
      return api.upload<{ path: string; url: string }>('/print-templates/upload-logo', fd, onProgress);
    },
  };
}

// ─── React Query hooks (depend on context for api + slug) ─────────────────

export function usePrintTemplates(docTypeCode?: DocTypeCode) {
  const api = usePrintTemplatesApi();
  const slug = useSlug();
  return useQuery({
    queryKey:        printTemplateKeys.list(slug ?? '', docTypeCode),
    queryFn:         () => api.list(docTypeCode),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePrintTemplateMutations() {
  const api = usePrintTemplatesApi();
  const slug = useSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: printTemplateKeys.all(slug) });
  };

  const invalidateOne = (tpl: PrintTemplate) => {
    if (slug && tpl.id) {
      qc.setQueryData(printTemplateKeys.detail(slug, tpl.id), tpl);
      qc.invalidateQueries({ queryKey: printTemplateKeys.all(slug) });
    }
  };

  const create = useMutation({
    mutationFn: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      api.create(tpl),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PrintTemplate> }) =>
      api.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: api.delete,
    onSuccess:  invalidateAll,
  });

  const setDefault = useMutation({
    mutationFn: api.setDefault,
    onSuccess:  invalidateAll,
  });

  const duplicate = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.duplicate(id, name),
    onSuccess: invalidateAll,
  });

  const installLibrary = useMutation({
    mutationFn: ({ templateId, docTypeCode }: { templateId: string; docTypeCode?: string }) =>
      api.installLibrary(templateId, docTypeCode),
    onSuccess: invalidateAll,
  });

  return { create, update, remove, setDefault, duplicate, installLibrary };
}
