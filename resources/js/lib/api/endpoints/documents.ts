// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/documents.ts — النسخة المُعاد هيكلتها
//
// ══ ملاحظات ══════════════════════════════════════════════════════════════════
//
// UNIFIED PAYMENT PAYLOAD:
//   Frontend ALWAYS sends `payments[]` (never `new_payments[]`).
//   Backend `syncPayments()` handles UPSERT/DELETE by id presence.
//   The legacy `POST /documents/{id}/payments` endpoint (addPayments) is
//   preserved on the backend for external API consumers only — the frontend
//   no longer calls it.
//
// show: إضافة العلاقات الكاملة المطلوبة
//
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys, invalidatePosQueries, invalidateDashboardQueries } from '../core/queryKeys';
import { notifyOtherTabs } from '../core/crossTab';
import { useActiveSlug } from '../../store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type {
  CommercialDocument,
  CommercialDocumentLine,
  PaginatedResponse,
  ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentPaymentInput {
  id?:                  number;
  payment_mode_id:      number;
  amount:               number;
  reference?:           string | null;
  notes?:               string | null;
  client_ref?:          string | null;
  payment_date:         string;
  treasury_account_id?: number | null;
}

export interface DocumentLineInput {
  id?:                    number;
  product_id:             number;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage?:   number;
  discount_amount?:       number;
  tva_rate:               number;
  packaging_id?:          number | null;
  packaging_price?:       number | null;
  price_level_id?:        number | null;
  stock_lot_id?:          number | null;
}

// ─── P4.2 Compute Types ──────────────────────────────────────────────────────

export interface ComputeLineInput {
  product_id:             number;
  quantity:               number;
  packaging_id?:          number | null;
  price_level_id?:        number | null;
  warehouse_id?:          number | null;
  party_id?:              number | null;
  is_purchase?:           boolean;
  document_date?:         string;
}

export interface ComputeLineResult {
  product_id:             number;
  unit_price_ht:          number;
  packaging_id:           number | null;
  packaging_price:        number | null;
  quantity:               number;
  discount_percentage:    number;
  discount_amount:        number;
  tva_rate:               number;
  tva_amount:             number;
  total_ht:               number;
  total_ttc:              number;
  margin:                 number;
  stock_available:        number | null;
  warnings:               string[];
  lot_suggestions:        { id: number; label: string; quantity: number }[];
}

export interface ComputeTotalsResult {
  total_ht:               number;
  total_tva:              number;
  total_discount:         number;
  total_ttc:              number;
  total_stamp:            number;
  net_to_pay:             number;
  lines:                  ComputeLineResult[];
}

export interface DocumentCreateInput {
  document_type_id:  number;
  party_id?:         number | null;
  warehouse_id:      number;
  fiscal_year_id:    number;
  currency_id?:      number;
  exchange_rate?:    number;
  document_date:     string;
  due_date?:         string | null;
  notes?:            string | null;
  lines:             DocumentLineInput[];
  payments?:         DocumentPaymentInput[];
  pos_session_id?:   number | null;
  // ✅ price_level_id و apply_fiscal_stamp مُزالَان — الباكاند لا يستخدمهما
}

/** تحديث في وضع free (draft/pending) — كامل الحقول */
export interface DocumentUpdateFreeInput {
  party_id?:         number | null;
  warehouse_id?:     number;
  fiscal_year_id?:   number;
  currency_id?:      number;
  exchange_rate?:    number;
  document_date?:    string;
  due_date?:         string | null;
  notes?:            string | null;
  document_number?:  string;
  lines?:            DocumentLineInput[];
  payments?:         DocumentPaymentInput[];
}

export type DocumentUpdateInput = DocumentUpdateFreeInput;

export interface DocumentListParams extends ListParams {
  document_type_id?:  number;
  type_code?:         string;
  party_id?:          number;
  status?:            string;
  fiscal_year_id?:    number;
  date_from?:         string;
  date_to?:           string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {

  // ── CRUD ───────────────────────────────────────────────────────────────────

  list: (params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),

  byType: (typeCode: string, params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', {
      ...params,
      'filter[document_type.code]': typeCode,
    }),

  show: (id: number) =>
    apiGet<CommercialDocument>(`/documents/${id}`, {
      include: [
        'party',
        'warehouse',
        'documentType',
        'documentStatus',
        'fiscalYear',
        'currency',
        'validatedBy',
        'createdBy',
        'lines',
        'lines.product',
        'lines.product.unit',
        'lines.product.tva',
        'lines.product.packagings',
        'lines.product.lots',
        'lines.product.prices',
        'lines.product.prices.priceLevel',
        'lines.product.quantityDiscounts',
        'lines.packaging',
        'lines.stockLot',
        'payments',
        'payments.paymentMode',
        'payments.treasuryAccount',
      ].join(','),
    }),

  create: (data: DocumentCreateInput) =>
    apiPost<CommercialDocument>('/documents', data),

  update: (id: number, data: DocumentUpdateInput) =>
    apiPut<CommercialDocument>(`/documents/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/documents/${id}`),

  checkNumber: (params: {
    document_number:   string;
    document_type_id:  number;
    exclude_id?:       number;
  }) =>
    apiGet<{ exists: boolean }>('/documents/check-number', params),

  nextNumber: (documentTypeId: number) =>
    apiGet<{ next_number: string; document_type_id: number }>('/documents/next-number', {
      document_type_id: documentTypeId,
    }),

  // ── Actions ────────────────────────────────────────────────────────────────

  validate: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/validate`),

  lock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/lock`),

  unlock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/unlock`),

  cancel: (id: number, reason: string) =>
    apiPost<CommercialDocument>(`/documents/${id}/cancel`, { cancellation_reason: reason }),

  qrcode: (id: number) =>
    apiGet<{ url: string }>(`/documents/${id}/qrcode`),

  share: (id: number) =>
    apiPost<{ share_url: string; expires_at: string }>(`/documents/${id}/share`),

  clone: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/clone`),

  // ── Lines ──────────────────────────────────────────────────────────────────

  lines: {
    list: (documentId: number) =>
      apiGet<CommercialDocumentLine[]>('/commercial-document-lines', {
        'filter[commercial_document_id]': documentId,
        include: 'product,packaging,stockLot',
      }),

    create: (data: DocumentLineInput & { commercial_document_id: number }) =>
      apiPost<CommercialDocumentLine>('/commercial-document-lines', data),

    update: (id: number, data: Partial<DocumentLineInput>) =>
      apiPut<CommercialDocumentLine>(`/commercial-document-lines/${id}`, data),

    delete: (id: number) =>
      apiDelete(`/commercial-document-lines/${id}`),
  },

  // ── Compute (P4.2) ──────────────────────────────────────────────────────────

  computeLine: (data: ComputeLineInput) =>
    apiPost<ComputeLineResult>('/documents/compute-line', data),

  computeTotals: (data: { lines: ComputeLineInput[]; apply_stamp?: boolean }) =>
    apiPost<ComputeTotalsResult>('/documents/compute-totals', data),

  convert: (id: number, data: { target_type_code: string }) =>
    apiPost<CommercialDocument>(`/documents/${id}/convert`, data),

  chain: (id: number) =>
    apiGet<{ chain: CommercialDocument[] }>(`/documents/${id}/chain`),

  creditCheck: (partyId: number, params: { amount: number; date?: string }) =>
    apiGet<{ credit_ok: boolean; outstanding: number; limit: number | null }>(`/parties/${partyId}/credit-check`, params),
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
  const slug                 = useActiveSlug();
  const qc                   = useQueryClient();
  const { selectedYear }     = useFiscalYear();

  const invalidateAll = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
      // المستندات تغيّر المخزون والأرصدة — حدّث بيانات POS واللوحة مباشرة
      invalidatePosQueries(qc, slug);
      invalidateDashboardQueries(qc, slug);
      notifyOtherTabs(slug);
    }
  };

  const invalidateOne = (doc: CommercialDocument) => {
    if (slug) {
      qc.setQueryData(tenantKeys.documents.detail(slug, doc.id), doc);
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
      invalidatePosQueries(qc, slug);
      invalidateDashboardQueries(qc, slug);
      notifyOtherTabs(slug);
    }
  };

  const invalidatePartyBalance = (partyId?: number | null) => {
    if (slug && partyId) {
      qc.invalidateQueries({ queryKey: [slug, 'party-balance', partyId] });
    }
  };

  // ── create ────────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: (data: Omit<DocumentCreateInput, 'fiscal_year_id'> & { fiscal_year_id?: number }) =>
      documentsApi.create({
        ...data,
        fiscal_year_id: data.fiscal_year_id ?? selectedYear?.id ?? 0,
      }),
    onSuccess: (doc) => {
      invalidateAll();
      invalidatePartyBalance(doc.party_id);
    },
  });

  // ── update ────────────────────────────────────────────────────────────────

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocumentUpdateInput }) =>
      documentsApi.update(id, data),
    onSuccess: (doc) => {
      invalidateOne(doc);
      invalidatePartyBalance(doc.party_id);
    },
  });

  // ── delete ────────────────────────────────────────────────────────────────

  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess:  invalidateAll,
  });

  // ── actions ───────────────────────────────────────────────────────────────

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
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      documentsApi.cancel(id, reason),
    onSuccess: invalidateOne,
  });

  return {
    create, update, remove,
    validate, lock, unlock, cancel,
    selectedYear,
  };
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
