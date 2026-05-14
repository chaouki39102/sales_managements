// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/documents.ts
// ✅ مصحح: lines endpoints + fiscal_year_id + typeCode صحيح
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type {
  CommercialDocument,
  CommercialDocumentLine,
  PaginatedResponse,
  ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentCreateInput {
  document_type_id:  number;
  party_id?:         number | null;
  warehouse_id:      number;
  fiscal_year_id:    number;           // ✅ مطلوب — يُمرَّر دائماً
  document_date:     string;
  due_date?:         string | null;
  notes?:            string | null;
  fiscal_stamp?:     number;
  lines?:            DocumentLineInput[];
}

export interface DocumentLineInput {
  id?:                    number;       // للتعديل
  product_variant_id?:    number | null;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage?:   number;
  tva_rate:               number;
}

export interface DocumentListParams extends ListParams {
  document_type_id?:  number;
  type_code?:         string;   // ✅ الاسم الصحيح
  party_id?:          number;
  status?:            string;
  fiscal_year_id?:    number;
  date_from?:         string;
  date_to?:           string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {
  // ── Documents CRUD ─────────────────────────────────────────────────────────
  list: (params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),

  // ✅ إصلاح: الفلتر بـ document_type_id أو type_code حسب الباكاند
  byType: (typeCode: string, params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', {
      ...params,
      'filter[document_type.code]': typeCode,  // ✅ Spatie filter الصحيح
    }),

  show: (id: number) =>
    apiGet<CommercialDocument>(`/documents/${id}`, {
      include: 'party,warehouse,documentType,lines.productVariant,payments.paymentMode',
    }),

  create: (data: DocumentCreateInput) =>
    apiPost<CommercialDocument>('/documents', data),

  update: (id: number, data: Partial<DocumentCreateInput>) =>
    apiPut<CommercialDocument>(`/documents/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/documents/${id}`),

  // ── Document Actions ───────────────────────────────────────────────────────
  validate: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/validate`),

  lock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/lock`),

  unlock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/unlock`),

  cancel: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/cancel`),

  qrcode: (id: number) =>
    apiGet<{ url: string }>(`/documents/${id}/qrcode`),

  // ── Lines ──────────────────────────────────────────────────────────────────
  // ✅ مفقودة في النسخة الأصلية — ضرورية لإضافة/تعديل سطور
  lines: {
    list: (documentId: number) =>
      apiGet<CommercialDocumentLine[]>(`/commercial-document-lines`, {
        'filter[commercial_document_id]': documentId,
      }),

    create: (data: DocumentLineInput & { commercial_document_id: number }) =>
      apiPost<CommercialDocumentLine>('/commercial-document-lines', data),

    update: (id: number, data: Partial<DocumentLineInput>) =>
      apiPut<CommercialDocumentLine>(`/commercial-document-lines/${id}`, data),

    delete: (id: number) =>
      apiDelete(`/commercial-document-lines/${id}`),
  },
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDocuments(params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.list(slug ?? '', params),
    queryFn:         () => documentsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocumentsByType(typeCode: string, params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.byType(slug ?? '', typeCode, params),
    queryFn:         () => documentsApi.byType(typeCode, params),
    enabled:         !!slug && !!typeCode,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.documents.detail(slug ?? '', id!),
    queryFn:   () => documentsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useDocumentMutations() {
  const slug       = useActiveSlug();
  const qc         = useQueryClient();
  const { selectedYear } = useFiscalYear();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  };

  const invalidateOne = (doc: CommercialDocument) => {
    if (slug) {
      qc.setQueryData(tenantKeys.documents.detail(slug, doc.id), doc);
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  };

  // ✅ يُضيف fiscal_year_id تلقائياً من السياق
  const create = useMutation({
    mutationFn: (data: Omit<DocumentCreateInput, 'fiscal_year_id'> & { fiscal_year_id?: number }) =>
      documentsApi.create({
        ...data,
        fiscal_year_id: data.fiscal_year_id ?? selectedYear?.id ?? 0,
      }),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentCreateInput> }) =>
      documentsApi.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess:  invalidateAll,
  });

  const validate = useMutation({
    mutationFn: documentsApi.validate,
    onSuccess:  invalidateOne,
  });

  const lock = useMutation({
    mutationFn: documentsApi.lock,
    onSuccess:  invalidateOne,
  });

  const unlock = useMutation({
    mutationFn: documentsApi.unlock,
    onSuccess:  invalidateOne,
  });

  const cancel = useMutation({
    mutationFn: documentsApi.cancel,
    onSuccess:  invalidateOne,
  });

  return { create, update, remove, validate, lock, unlock, cancel, selectedYear };
}

// ─── Line Mutations ───────────────────────────────────────────────────────────

export function useDocumentLineMutations(documentId: number) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: tenantKeys.documents.detail(slug, documentId) });
    }
  };

  const create = useMutation({
    mutationFn: (data: DocumentLineInput) =>
      documentsApi.lines.create({ ...data, commercial_document_id: documentId }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentLineInput> }) =>
      documentsApi.lines.update(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: documentsApi.lines.delete,
    onSuccess:  invalidate,
  });

  return { create, update, remove };
}
