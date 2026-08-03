// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/portalAccess.ts — إدارة حسابات البوابة (الواجهة الإدارية)
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PortalAccessAccount {
  id:            number;
  party_id:      number;
  name:          string;
  email:         string;
  is_active:     boolean;
  last_login_at: string | null;
  created_at:    string | null;
  updated_at:    string | null;
}

export interface PortalAccessPayload {
  party_id:   number;
  name?:      string;
  email:      string;
  password:   string;
  is_active?: boolean;
}

export interface PortalAccessUpdate {
  name?:      string;
  email?:     string;
  password?:  string;
  is_active?: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const portalAccessApi = {
  forParty: (partyId: number) =>
    apiGet<PortalAccessAccount | null>(`/portal-access/for-party/${partyId}`),
  create: (data: PortalAccessPayload) =>
    apiPost<PortalAccessAccount>('/portal-access', data),
  update: (id: number, data: PortalAccessUpdate) =>
    apiPut<PortalAccessAccount>(`/portal-access/${id}`, data),
  remove: (id: number) =>
    apiDelete(`/portal-access/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function usePortalAccessForParty(partyId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: ['portal-access', slug, partyId],
    queryFn: () => portalAccessApi.forParty(partyId!),
    enabled: !!slug && !!partyId,
    staleTime: 30_000,
  });
}

export function usePortalAccessMutations() {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  const invalidate = (partyId: number) => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: ['portal-access', slug, partyId] });
  };

  return {
    create: useMutation({
      mutationFn: (data: PortalAccessPayload) => portalAccessApi.create(data),
      onSuccess: (_d, vars) => invalidate(vars.party_id),
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: PortalAccessUpdate; partyId: number }) =>
        portalAccessApi.update(id, data),
      onSuccess: (_d, vars) => invalidate(vars.partyId),
    }),
    remove: useMutation({
      mutationFn: ({ id }: { id: number; partyId: number }) => portalAccessApi.remove(id),
      onSuccess: (_d, vars) => invalidate(vars.partyId),
    }),
  };
}
