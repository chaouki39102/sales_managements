// ════════════════════════════════════════════════════════════════════════════
// usePrintTemplatesList — runtime hook for loading print templates
//
// Depends ONLY on RuntimeContext (no PrintSettingsProvider needed).
// Reads from the same React Query cache as the designer hooks, so cache
// invalidations from the Print Settings page are reflected here.
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { DocTypeCode } from '@/pages/settings/print-settings/types';
import { useRuntime } from './PrintRuntimeContext';

export function usePrintTemplatesList(docTypeCode?: DocTypeCode) {
  const { templateRepository, slug } = useRuntime();
  return useQuery({
    queryKey:  [slug, 'print-templates', 'list', docTypeCode],
    queryFn:   () => templateRepository.list(docTypeCode),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
