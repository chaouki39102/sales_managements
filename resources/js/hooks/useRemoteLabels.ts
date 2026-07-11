// ════════════════════════════════════════════════
// hooks/useRemoteLabels.ts
// ════════════════════════════════════════════════

import { useMemo }    from 'react';
import { useQueries } from '@tanstack/react-query';
import apiClient      from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

// ── Types (مستقلة — لا تستورد من LookupPage) ──
// نفس تعريفات LookupPage لكن هنا لتجنب circular import
export interface RemoteLabelFieldDef {
  key:              string;
  type?:            string;
  remoteEndpoint?:  string;
  remoteLabel?:     string;
  remoteValue?:     string;
}

export type RemoteLabels = Record<string, Record<string | number, string>>;

// ── Hook ──────────────────────────────────────
export function useRemoteLabels(
  fields:   RemoteLabelFieldDef[],
  endpoint: string,
): RemoteLabels {

  const slug = useActiveSlug();

  // استخراج الحقول التي تحتاج remote fetch
  // [endpoint] كـ dependency بدل fields لأن fields تتغير مرجعها كل render
  const remoteFields = useMemo(
    () => fields.filter(f => f.type === 'remote-select' && f.remoteEndpoint),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint],
  );

  // useQueries — hook واحد يدير N queries بأمان
  const results = useQueries({
    queries: remoteFields.map(f => ({
      queryKey: [slug, 'remote-labels', f.remoteEndpoint] as const,
      queryFn: () =>
        apiClient
          .get(f.remoteEndpoint!, { params: { per_page: 500 } })
          .then(res => {
            const raw = res.data as any;
            const arr: any[] = Array.isArray(raw?.data)
              ? raw.data
              : Array.isArray(raw?.data?.data)
                ? raw.data.data
                : [];
            const labelField = f.remoteLabel ?? 'arabic_name';
            const valueField = f.remoteValue ?? 'id';
            const map: Record<string | number, string> = {};
            arr.forEach(i => {
              map[i[valueField]] =
                i[labelField] ?? i.arabic_name ?? i.name ?? String(i[valueField]);
            });
            return { key: f.key, map };
          }),
      staleTime: 30 * 60_000,
      gcTime:    60 * 60_000,
      retry:     false,
    })),
  });

  // دمج النتائج في RemoteLabels
  return useMemo(() => {
    const labels: RemoteLabels = {};
    results.forEach(r => {
      if (r.data) labels[r.data.key] = r.data.map;
    });
    return labels;
  }, [results]);
}