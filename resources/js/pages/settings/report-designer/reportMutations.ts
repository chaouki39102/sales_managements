import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';
import { toApiPayload } from '@/pages/settings/print-settings/services/SettingsSerializer';

function reportKeys(slug: string) {
  return [slug, 'print-templates'];
}

export function useReportMutations() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: reportKeys(slug) });
  };

  const create = useMutation({
    mutationFn: (tpl: Partial<PrintTemplate>) =>
      apiPost(`/${slug}/print-templates`, toApiPayload(tpl)),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PrintTemplate> }) =>
      apiPut(`/${slug}/print-templates/${id}`, toApiPayload(data)),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/${slug}/print-templates/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}