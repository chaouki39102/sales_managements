import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface UserAlert {
  id:              number;
  type:            string;
  title:           string;
  body:            string;
  severity:        string;
  document_id?:    number | null;
  check_id?:       number | null;
  product_id?:     number | null;
  party_id?:       number | null;
  is_read:         boolean;
  read_at?:        string | null;
  created_at:      string;
}

interface AlertsResponse {
  alerts:       UserAlert[];
  unread_count: number;
}

export function useAlerts() {
  const slug   = useActiveSlug();
  const client = useQueryClient();

  const query = useQuery<AlertsResponse>({
    queryKey: [slug, 'alerts', 'unread'],
    queryFn: async () => {
      return apiGet<AlertsResponse>('/alerts/unread');
    },
    enabled: !!slug,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const markAsRead = useMutation({
    mutationFn: (alertId: number) => apiPost(`/alerts/${alertId}/read`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [slug, 'alerts'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => apiPost('/alerts/mark-all-read'),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [slug, 'alerts'] });
    },
  });

  return {
    alerts:       query.data?.alerts ?? [],
    unreadCount:  query.data?.unread_count ?? 0,
    isLoading:    query.isLoading,
    error:        query.error,
    refresh:      () => client.invalidateQueries({ queryKey: [slug, 'alerts'] }),
    markAsRead:   (id: number) => markAsRead.mutate(id),
    markAllAsRead: markAllAsRead.mutate,
  };
}
