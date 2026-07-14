// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/employees.ts
// Employees CRUD (tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';

import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import type { Employee } from '../core/types';

// ─── API ─────────────────────────────────────────────────────────────────────
export const employeesApi = {
  list:   (params?: Record<string, unknown>)       => apiGet<Employee[]>('/employees', params),
  show:   (id: number)                             => apiGet<Employee>(`/employees/${id}`),
  create: (data: Partial<Employee>)                => apiPost<Employee>('/employees', data),
  update: (id: number, data: Partial<Employee>)    => apiPut<Employee>(`/employees/${id}`, data),
  delete: (id: number)                             => apiDelete(`/employees/${id}`),
} as const;

// ─── Query hooks ─────────────────────────────────────────────────────────────
export function useEmployeesList(params?: { search?: string; employment_status?: string }) {
  return useTenantQuery<Employee[]>(
    (slug) => [slug, 'employees', params?.search ?? '', params?.employment_status ?? ''] as const,
    () => employeesApi.list({
      search: params?.search || undefined,
      employment_status: params?.employment_status || undefined,
    }),
  );
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────
export function useEmployeeCreate(onSuccess?: () => void) {
  return useTenantMutation(
    (data: Partial<Employee>) => employeesApi.create(data),
    (slug) => [slug, 'employees'] as const,
    { onSuccess },
  );
}

export function useEmployeeUpdate(onSuccess?: () => void) {
  return useTenantMutation(
    ({ id, data }: { id: number; data: Partial<Employee> }) => employeesApi.update(id, data),
    (slug) => [slug, 'employees'] as const,
    { onSuccess },
  );
}

export function useEmployeeDelete(onSuccess?: () => void) {
  return useTenantMutation(
    (id: number) => employeesApi.delete(id),
    (slug) => [slug, 'employees'] as const,
    { onSuccess },
  );
}
