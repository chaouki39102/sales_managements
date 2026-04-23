// ════════════════════════════════════════════════
// lib/api/invoices.ts
// ════════════════════════════════════════════════
import client from './client';
import type { CommercialDocument, PaginatedResponse } from '@/types';

export interface InvoiceFilters {
  search?: string;
  document_type_id?: number;
  party_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export const invoicesApi = {
  list:       (filters?: InvoiceFilters)               => client.get<PaginatedResponse<CommercialDocument>>('/commercial-documents', { params: filters }),
  get:        (id: number)                             => client.get<{ data: CommercialDocument }>(`/commercial-documents/${id}`),
  create:     (data: Partial<CommercialDocument>)      => client.post<{ data: CommercialDocument }>('/commercial-documents', data),
  update:     (id: number, data: Partial<CommercialDocument>) => client.put<{ data: CommercialDocument }>(`/commercial-documents/${id}`, data),
  delete:     (id: number)                             => client.delete(`/commercial-documents/${id}`),
  validate:   (id: number)                             => client.post(`/commercial-documents/${id}/validate`),
  lock:       (id: number)                             => client.post(`/commercial-documents/${id}/lock`),
  unlock:     (id: number)                             => client.post(`/commercial-documents/${id}/unlock`),
  cancel:     (id: number)                             => client.post(`/commercial-documents/${id}/cancel`),
  getUnpaid:  ()                                       => client.get<{ data: CommercialDocument[] }>('/commercial-documents/unpaid'),
  getOverdue: ()                                       => client.get<{ data: CommercialDocument[] }>('/commercial-documents/overdue'),
  getQRCode:  (id: number)                             => client.get(`/commercial-documents/${id}/qrcode`),
};


// ════════════════════════════════════════════════
// lib/api/parties.ts
// ════════════════════════════════════════════════
import type { Party, PaginatedResponse as PR } from '@/types';

export interface PartyFilters {
  search?: string;
  party_type_id?: number;
  active?: boolean;
  page?: number;
  per_page?: number;
}

export const partiesApi = {
  list:          (filters?: PartyFilters) => client.get<PR<Party>>('/parties', { params: filters }),
  get:           (id: number)             => client.get<{ data: Party }>(`/parties/${id}`),
  create:        (data: Partial<Party>)   => client.post<{ data: Party }>('/parties', data),
  update:        (id: number, data: Partial<Party>) => client.put<{ data: Party }>(`/parties/${id}`, data),
  delete:        (id: number)             => client.delete(`/parties/${id}`),
  getCustomers:  (filters?: PartyFilters) => client.get<PR<Party>>('/customers', { params: filters }),
  getSuppliers:  (filters?: PartyFilters) => client.get<PR<Party>>('/suppliers', { params: filters }),
};


// ════════════════════════════════════════════════
// lib/api/lookups.ts — جداول البحث الثابتة
// ════════════════════════════════════════════════
import type { Unit, Tva, Family, Brand, PriceLevel, Warehouse, FiscalYear, Currency, DocumentType, PaymentMode, TreasuryAccount } from '@/types';

export const lookupsApi = {
  units:             () => client.get<{ data: Unit[] }>('/units'),
  tvas:              () => client.get<{ data: Tva[] }>('/tvas'),
  families:          () => client.get<{ data: Family[] }>('/families'),
  brands:            () => client.get<{ data: Brand[] }>('/brands'),
  priceLevels:       () => client.get<{ data: PriceLevel[] }>('/price-levels'),
  warehouses:        () => client.get<{ data: Warehouse[] }>('/warehouses'),
  fiscalYears:       () => client.get<{ data: FiscalYear[] }>('/fiscal-years'),
  currentFiscalYear: () => client.get<{ data: FiscalYear }>('/fiscal-years/current'),
  currencies:        () => client.get<{ data: Currency[] }>('/currencies'),
  documentTypes:     () => client.get<{ data: DocumentType[] }>('/document-types'),
  paymentModes:      () => client.get<{ data: PaymentMode[] }>('/payment-modes'),
  treasuryAccounts:  () => client.get<{ data: TreasuryAccount[] }>('/treasury-accounts'),
  documentStatuses:  () => client.get<{ data: unknown[] }>('/document-statuses'),
};


// ════════════════════════════════════════════════
// lib/api/index.ts — تصدير مركزي
// ════════════════════════════════════════════════
export { dashboardApi }             from './dashboard';
export { productsApi, variantsApi } from './products';
export { default as apiClient }     from './client';
// invoicesApi, partiesApi, lookupsApi مُصدَّرة بالفعل أعلاه بـ export const
