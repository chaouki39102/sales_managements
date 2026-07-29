import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { toApiPayload } from '@/pages/settings/print-settings/services/SettingsSerializer';

function stickerKeys(slug: string) {
  return [slug, 'print-templates'];
}

export function useStickerMutations() {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: stickerKeys(slug) });
  };

  const create = useMutation({
    mutationFn: (tpl: Record<string, unknown>) =>
      apiPost(`/${slug}/print-templates`, toApiPayload(tpl as any)),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiPut(`/${slug}/print-templates/${id}`, toApiPayload(data as any)),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiDelete(`/${slug}/print-templates/${id}`),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
