// ════════════════════════════════════════════════════════════════════════════
// pages/alerts/AlertsPage.tsx
// صفحة التنبيهات — عرض جميع التنبيهات
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { useNotification } from '@/hooks/useNotification';

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

const severityCfg: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'حرج',   color: '#dc2626', bg: '#fef2f2' },
  high:     { label: 'مهم',   color: '#f59e0b', bg: '#fffbeb' },
  medium:   { label: 'متوسط', color: '#2563eb', bg: '#eff6ff' },
  low:      { label: 'منخفض', color: '#6b7280', bg: '#f3f4f6' },
};

const typeIcon: Record<string, string> = {
  overdue_invoice: 'ti-alert-circle',
  upcoming_check:  'ti-checks',
  low_stock:       'ti-package-off',
  credit_exceeded: 'ti-credit-card-off',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: [slug, 'alerts'] }); notify.success('تم تحديد الكل كمقروء'); },
  });

  const filtered = filter === 'unread' ? alerts.filter(a => !a.is_read) : alerts;
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div style={{ padding: 24, direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>
          التنبيهات
          {unreadCount > 0 && (
            <span style={{
              marginRight: 10, fontSize: 11, fontWeight: 700, padding: '2px 8px',
              borderRadius: 12, background: 'color-mix(in srgb, var(--red) 12%, transparent)',
              color: 'var(--red)',
            }}>
              {unreadCount} جديد
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--b2)',
              background: 'var(--bg2)', color: 'var(--t2)', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-checks" style={{ fontSize: 13 }} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: filter === f ? 'color-mix(in srgb, var(--em) 12%, transparent)' : 'transparent',
              color: filter === f ? 'var(--em)' : 'var(--t3)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {f === 'all' ? 'الكل' : 'غير مقروء'} ({f === 'all' ? alerts.length : unreadCount})
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
          <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', fontSize: 20 }} />
          <div style={{ marginTop: 8 }}>جارٍ التحميل…</div>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)', fontSize: 14 }}>
          {filter === 'unread' ? 'لا توجد تنبيهات جديدة' : 'لا توجد تنبيهات'}
        </div>
      )}

      {filtered.map(alert => {
        const sev = severityCfg[alert.severity] ?? severityCfg.low;
        return (
          <div
            key={alert.id}
            onClick={() => { if (!alert.is_read) markRead.mutate(alert.id); }}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: alert.is_read ? 'var(--bg2)' : 'color-mix(in srgb, var(--blue) 4%, var(--bg2))',
              border: `1px solid var(--b1)`, marginBottom: 8,
              borderRight: `4px solid ${sev.color}`,
              cursor: 'pointer', transition: 'background .12s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className={`ti ${typeIcon[alert.type] ?? 'ti-bell'}`} style={{ fontSize: 16, color: sev.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{alert.title}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                  background: sev.bg, color: sev.color,
                }}>
                  {sev.label}
                </span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>{fmtDate(alert.created_at)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, paddingRight: 24 }}>
              {alert.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
