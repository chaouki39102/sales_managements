// ════════════════════════════════════════════════════════════════════════════
// pages/audit/AuditLogPage.tsx
// صفحة سجل التدقيق
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuditLogs, type AuditLog, type AuditListParams } from '@/lib/api/endpoints/audits';
import { useNotification } from '@/hooks/useNotification';

const EVENT_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  created: { label: 'إنشاء', color: 'var(--green)',  bg: 'color-mix(in srgb, var(--green) 12%, transparent)', icon: 'ti-plus' },
  updated: { label: 'تعديل', color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)',  icon: 'ti-pencil' },
  deleted: { label: 'حذف',   color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)',   icon: 'ti-trash' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DiffView({ oldValues, newValues }: { oldValues: Record<string, unknown>; newValues: Record<string, unknown> }) {
  const allKeys = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];
  if (allKeys.length === 0) return <span style={{ color: 'var(--t3)', fontSize: 12 }}>—</span>;

  return (
    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
      {allKeys.map(key => {
        const oldVal = oldValues[key];
        const newVal = newValues[key];
        if (oldVal === newVal) return null;
        return (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ color: 'var(--t3)', fontWeight: 600, minWidth: 80 }}>{key}:</span>
            {oldVal !== undefined && (
              <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>
                {String(oldVal ?? '—')}
              </span>
            )}
            {oldVal !== undefined && <span style={{ color: 'var(--t3)' }}>→</span>}
            <span style={{ color: 'var(--green)' }}>
              {String(newVal ?? '—')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogPage() {
  const { notify } = useNotification();
  const [filters, setFilters] = useState<AuditListParams>({ page: 1, per_page: 25 });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useAuditLogs(filters);
  const items = data?.data ?? [];
  const meta  = data?.meta;

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'color-mix(in srgb, var(--purple) 12%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-history" style={{ fontSize: 20, color: 'var(--purple)' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>سجل التدقيق</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>سجل جميع العمليات على البيانات</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={filters.event ?? ''}
          onChange={e => setFilters(f => ({ ...f, event: e.target.value || undefined, page: 1 }))}
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg2)', fontSize: 13,
          }}
        >
          <option value="">جميع الأحداث</option>
          <option value="created">إنشاء</option>
          <option value="updated">تعديل</option>
          <option value="deleted">حذف</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--t3)',
          background: 'var(--bg2)', borderRadius: 12,
        }}>
          <i className="ti ti-history-off" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.3 }} />
          لا توجد سجلات
        </div>
      )}

      {/* Table */}
      {!isLoading && items.length > 0 && (
        <div style={{
          background: 'var(--bg1)', borderRadius: 12,
          border: '1px solid var(--border)', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                <th style={thStyle}>التاريخ</th>
                <th style={thStyle}>المستخدم</th>
                <th style={thStyle}>الحدث</th>
                <th style={thStyle}>النوع</th>
                <th style={thStyle}>الرقم</th>
                <th style={thStyle}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {items.map(log => {
                const evt = EVENT_LABELS[log.event] ?? EVENT_LABELS.updated;
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td style={tdStyle}>{formatDate(log.created_at)}</td>
                      <td style={tdStyle}>{log.user?.name ?? `#${log.user_id}`}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 12, fontSize: 11,
                          fontWeight: 600, background: evt.bg, color: evt.color,
                        }}>
                          <i className={`ti ${evt.icon}`} style={{ fontSize: 12 }} />
                          {evt.label}
                        </span>
                      </td>
                      <td style={tdStyle}>{log.auditable_type.split('\\').pop()}</td>
                      <td style={tdStyle}>#{log.auditable_id}</td>
                      <td style={tdStyle}>
                        <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 14, color: 'var(--t3)' }} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '12px 20px', background: 'var(--bg2)' }}>
                          <DiffView oldValues={log.old_values} newValues={log.new_values} />
                          {log.ip_address && (
                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t3)' }}>
                              IP: {log.ip_address}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '12px 0', borderTop: '1px solid var(--border)',
            }}>
              {Array.from({ length: Math.min(meta.last_page, 7) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setFilters(f => ({ ...f, page }))}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    background: page === (filters.page ?? 1) ? 'var(--blue)' : 'transparent',
                    color: page === (filters.page ?? 1) ? '#fff' : 'var(--t2)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 12,
  color: 'var(--t3)', borderBottom: '2px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'right', verticalAlign: 'middle',
};
