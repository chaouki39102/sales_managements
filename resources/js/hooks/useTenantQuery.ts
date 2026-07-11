// ════════════════════════════════════════════════════════════════════════════
// hooks/useTenantQuery.ts
//
// Wrappers that enforce slug-scoped keys and enabled: !!slug guards.
// Use these in page-level components to prevent cross-tenant data leaks.
//
// useTenantQuery  — wraps useQuery  (read)
// useTenantMutation — wraps useMutation (write, auto-invalidates on success)
// ════════════════════════════════════════════════════════════════════════════

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useActiveSlug } from '@/lib/store/appStore';

// ─── useTenantQuery ──────────────────────────────────────────────────────────
//
// Automatically:
//   1. Reads slug from Zustand store
//   2. Passes slug to keyFn for the queryKey
//   3. Sets enabled: !!slug (merged with any custom enabled)
//
// Usage:
//   const { data } = useTenantQuery(
//     (slug) => tenantKeys.lookups.warehouses(slug),
//     () => apiGet('/warehouses', { per_page: 50 }),
//   );
//
// With extra options:
//   const { data } = useTenantQuery(
//     (slug) => tenantKeys.expenses.list(slug, params),
//     () => expensesApi.list(params),
//     { enabled: !!yearId, staleTime: 60_000 },
//   );

export function useTenantQuery<T>(
  keyFn: (slug: string) => readonly unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn' | 'enabled'> & {
    enabled?: boolean;
  },
): ReturnType<typeof useQuery<T>> {
  const slug = useActiveSlug() ?? '';

  return useQuery<T>({
    queryKey: keyFn(slug),
    queryFn,
    enabled: !!slug && (options?.enabled ?? true),
    ...options,
  });
}

// ─── useTenantQueryPaginated ─────────────────────────────────────────────────
//
// Convenience wrapper for paginated lists. Adds keepPreviousData + staleTime
// defaults appropriate for list views.

export function useTenantQueryPaginated<T>(
  keyFn: (slug: string) => readonly unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn' | 'enabled'> & {
    enabled?: boolean;
  },
): ReturnType<typeof useQuery<T>> {
  const slug = useActiveSlug() ?? '';

  return useQuery<T>({
    queryKey: keyFn(slug),
    queryFn,
    enabled: !!slug && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    ...options,
  });
}

// ─── useTenantMutation ───────────────────────────────────────────────────────
//
// Automatically invalidates a slug-scoped query key on success.
// Returns the UseMutationResult directly — call .mutate() as usual.
//
// Usage:
//   const deleteMut = useTenantMutation(
//     (id: number) => apiDelete(`/payment-modes/${id}`),
//     (slug) => tenantKeys.lookups.paymentModes(slug),
//   );
//
// With custom onSuccess:
//   const saveMut = useTenantMutation(
//     (data) => apiPost('/payment-modes', data),
//     (slug) => tenantKeys.lookups.paymentModes(slug),
//     { onSuccess: () => onClose() },
//   );

export function useTenantMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeyFn: (slug: string) => readonly unknown[],
  options?: UseMutationOptions<TData, Error, TVariables>,
): UseMutationResult<TData, Error, TVariables> {
  const slug = useActiveSlug() ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (slug) qc.invalidateQueries({ queryKey: invalidateKeyFn(slug) });
      options?.onSuccess?.(data, variables, context);
    },
    onError: options?.onError,
    onMutate: options?.onMutate,
    onSettled: options?.onSettled,
  });
}
