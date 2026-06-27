import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { PrintTemplate, PrintTemplateApiResponse, DocTypeCode } from '../types';

export const printTemplateKeys = {
  all:     (slug: string)              => [slug, 'print-templates']              as const,
  list:    (slug: string, code?: string) => [slug, 'print-templates', 'list', code] as const,
  detail:  (slug: string, id: number)  => [slug, 'print-templates', id]         as const,
};

function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  const {
    id, name, doc_type_code, paper_size, is_default, is_active,
    created_at, updated_at,
    ...config
  } = tpl as PrintTemplate;

  return {
    name:          name          ?? 'قالب جديد',
    doc_type_code: doc_type_code ?? 'FV',
    paper_size:    paper_size    ?? '80mm',
    is_default:    is_default    ?? false,
    is_active:     is_active     ?? true,
    config,
  };
}

function fromApiResponse(r: PrintTemplateApiResponse): PrintTemplate {
  return {
    id:            r.id,
    name:          r.name,
    doc_type_code: r.doc_type_code as DocTypeCode,
    paper_size:    r.paper_size as PrintTemplate['paper_size'],
    is_default:    r.is_default,
    is_active:     r.is_active,
    created_at:    r.created_at,
    updated_at:    r.updated_at,
    ...(r.config ?? {}),
  } as PrintTemplate;
}

export const printTemplatesApi = {
  list: (docTypeCode?: string) =>
    apiGet<PrintTemplateApiResponse[]>('/print-templates', docTypeCode
      ? { doc_type_code: docTypeCode } : undefined)
      .then(r => (Array.isArray(r) ? r : (r as any)?.data ?? []).map(fromApiResponse)),

  show: (id: number) =>
    apiGet<PrintTemplateApiResponse>(`/print-templates/${id}`)
      .then(fromApiResponse),

  create: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
    apiPost<PrintTemplateApiResponse>('/print-templates', toApiPayload(tpl as any))
      .then(fromApiResponse),

  update: (id: number, tpl: Partial<PrintTemplate>) =>
    apiPut<PrintTemplateApiResponse>(`/print-templates/${id}`, toApiPayload(tpl))
      .then(fromApiResponse),

  delete: (id: number) =>
    apiDelete(`/print-templates/${id}`),

  setDefault: (id: number) =>
    apiPost<PrintTemplateApiResponse>(`/print-templates/${id}/set-default`)
      .then(fromApiResponse),

  duplicate: (id: number, newName: string) =>
    apiPost<PrintTemplateApiResponse>(`/print-templates/${id}/duplicate`, { name: newName })
      .then(fromApiResponse),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePrintTemplates(docTypeCode?: DocTypeCode) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        printTemplateKeys.list(slug ?? '', docTypeCode),
    queryFn:         () => printTemplatesApi.list(docTypeCode),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePrintTemplate(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  printTemplateKeys.detail(slug ?? '', id!),
    queryFn:   () => printTemplatesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function usePrintTemplateMutations() {
  const slug = useActiveSlug();
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
      printTemplatesApi.create(tpl),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PrintTemplate> }) =>
      printTemplatesApi.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: printTemplatesApi.delete,
    onSuccess:  invalidateAll,
  });

  const setDefault = useMutation({
    mutationFn: printTemplatesApi.setDefault,
    onSuccess:  invalidateAll,
  });

  const duplicate = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      printTemplatesApi.duplicate(id, name),
    onSuccess: invalidateAll,
  });

  return { create, update, remove, setDefault, duplicate };
}
