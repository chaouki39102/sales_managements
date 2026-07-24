// ════════════════════════════════════════════════════════════════════════════
// pages/alerts/AlertsPage.tsx
// صفحة التنبيهات — عرض جميع التنبيهات
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { useNotification } from '@/hooks/useNotification';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';

interface Alert {
  id:           number;
  type:         string;
  title:        string;
  body:         string;
  severity:     string;
  document_id?: number | null;
  check_id?:    number | null;
  product_id?:  number | null;
  party_id?:    number | null;
  is_read:      boolean;
  read_at?:     string | null;
  created_at:   string;
}

const SEVERITY_CONFIG: Record<string, { label: string; variant: 'danger' | 'warning' | 'info' | 'gray'; icon: string }> = {
  critical: { label: 'حرج',   variant: 'danger',  icon: 'ti-alert-triangle' },
  high:     { label: 'مهم',   variant: 'warning', icon: 'ti-alert-circle' },
  medium:   { label: 'متوسط', variant: 'info',    icon: 'ti-info-circle' },
  low:      { label: 'منخفض', variant: 'gray',    icon: 'ti-bell' },
};

const TYPE_ICON: Record<string, string> = {
  overdue_invoice: 'ti-file-invoice',
  upcoming_check:  'ti-checks',
  low_stock:       'ti-package-off',
  credit_exceeded: 'ti-credit-card-off',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-DZ', {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

export default function AlertsPage() {
  const slug   = useActiveSlug();
  const qc     = useQueryClient();
  const { notify } = useNotification();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: [slug, 'alerts', 'all'],
    queryFn:  () => apiGet<Alert[]>('/alerts/all'),
    enabled:  !!slug,
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => apiPost(`/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [slug, 'alerts'] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiPost('/alerts/mark-all-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [slug, 'alerts'] });
      notify.success('تم تحديد الكل كمقروء');
    },
  });

  const filtered = filter === 'unread' ? alerts.filter(a => !a.is_read) : alerts;
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="alert-page-container">
      <PageHeader
        title="التنبيهات الذكية"
        description="مراقبة الأحداث والتنبيهات المهمة"
        breadcrumb={[
          { label: 'النظام', href: '/settings' },
          { label: 'التنبيهات الذكية' },
        ]}
        badge={unreadCount > 0 ? { label: `${unreadCount} جديد`, variant: 'danger' } : undefined}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="default"
              size="sm"
              icon={<i className="ti ti-checks" />}
              onClick={() => markAll.mutate()}
              loading={markAll.isPending}
            >
              تحديد الكل كمقروء
            </Button>
          ) : undefined
        }
      />

      {/* ── Filter Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {([
          { key: 'all',    label: 'الكل', count: alerts.length },
          { key: 'unread', label: 'غير مقروء', count: unreadCount },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`alert-tab-pill ${filter === tab.key ? 'active' : ''}`}
          >
            {tab.label}
            <span style={{
              marginRight: 6, fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 10,
              background: filter === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--bg4)',
              color: filter === tab.key ? '#fff' : 'var(--t4)',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading ? (
          <div className="card">
            <Skeleton variant="table" rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={filter === 'unread' ? 'ti-bell' : 'ti-bell-off'}
              text={filter === 'unread' ? 'لا توجد تنبيهات جديدة' : 'لا توجد تنبيهات'}
              sub={filter === 'unread' ? 'جميع التنبيهات مقروءة' : 'لم يتم تسجيل أي تنبيه بعد'}
            />
          </div>
        ) : (
          filtered.map(alert => {
            const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
            const icon = TYPE_ICON[alert.type] ?? 'ti-bell';
            return (
              <div
                key={alert.id}
                onClick={() => { if (!alert.is_read) markRead.mutate(alert.id); }}
                className="card alert-card"
                style={{
                  cursor: 'pointer',
                  borderRight: `4px solid ${alert.is_read ? 'var(--b2)' : `var(--${sev.variant === 'danger' ? 'red' : sev.variant === 'warning' ? 'gold' : sev.variant === 'info' ? 'blue' : 't4'})`}`,
                  background: alert.is_read ? 'var(--bg2)' : 'var(--bg3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: alert.is_read ? 'var(--bg4)' : `color-mix(in srgb, var(--${sev.variant === 'danger' ? 'red' : sev.variant === 'warning' ? 'gold' : sev.variant === 'info' ? 'blue' : 't4'}) 10%, transparent)`,
                    color: alert.is_read ? 'var(--t4)' : `var(--${sev.variant === 'danger' ? 'red' : sev.variant === 'warning' ? 'gold' : sev.variant === 'info' ? 'blue' : 't4'})`,
                  }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>
                        {alert.title}
                      </span>
                      <Badge variant={sev.variant} noDot>
                        {sev.label}
                      </Badge>
                      {!alert.is_read && (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: 'var(--em)', flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7 }}>
                      {alert.body}
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ flexShrink: 0, textAlign: 'left' }}>
                    <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                      {fmtDate(alert.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>


    </div>
  );
}
