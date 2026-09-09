// ════════════════════════════════════════════════════════════════════════════
// pages/audit/AuditLogPage.tsx
// صفحة سجل التدقيق
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useAuditLogs, type AuditListParams, type AuditDiffRow } from '@/lib/api/endpoints/audits';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Card from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/shadcn/table';
import type { BackendMeta } from '@/hooks/usePagination';

const EVENT_CONFIG: Record<string, { label: string; variant: 'success' | 'info' | 'danger'; icon: string }> = {
  created: { label: 'إنشاء', variant: 'success', icon: 'ti-plus' },
  updated: { label: 'تعديل', variant: 'info',    icon: 'ti-pencil' },
  deleted: { label: 'حذف',   variant: 'danger',  icon: 'ti-trash' },
};

const TYPE_LABELS: Record<string, string> = {
  Product: 'منتج', Party: 'طرف', CommercialDocument: 'مستند', Payment: 'دفعة',
  Expense: 'مصروف', Check: 'شيك', Family: 'فئة', Brand: 'علامة',
  Warehouse: 'مستودع', User: 'مستخدم', Employee: 'موظف', Company: 'شركة',
  TreasuryAccount: 'خزينة', ExpenseCategory: 'فئة مصروف', ApprovalThreshold: 'عتبة موافقة',
  Unit: 'وحدة', Role: 'دور', Permission: 'صلاحية', Currency: 'عملة',
  DocumentType: 'نوع مستند', FiscalYear: 'سنة مالية', PaymentMode: 'طريقة دفع',
  PortalOrder: 'طلب بوابة', PortalUser: 'مستخدم بوابة', PrintTemplate: 'قالب طباعة',
  StockMovement: 'حركة مخزون', Attachment: 'مرفق', Setting: 'إعداد', Wilaya: 'ولاية', Commune: 'بلدية',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function typeFallback(auditableType: string) {
  const base = auditableType.split('\\').pop() ?? '';
  return TYPE_LABELS[base] ?? base;
}

function DiffView({ diff }: { diff: AuditDiffRow[] }) {
  if (!diff || diff.length === 0) return <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>;

  return (
    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
      {diff.map(row => (
        <div key={row.key} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--t4)', fontWeight: 600, minWidth: 110, fontSize: 11 }}>{row.label}</span>
          {row.old !== null && row.old !== undefined && row.old !== '—' && (
            <span style={{ color: 'var(--red)', textDecoration: 'line-through', opacity: 0.8 }}>
              {String(row.old)}
            </span>
          )}
          {row.old !== null && row.old !== undefined && row.old !== '—' && (
            <span style={{ color: 'var(--t4)' }}>→</span>
          )}
          <span style={{ color: 'var(--em)', fontWeight: 500 }}>
            {String(row.new ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditListParams>({ page: 1, per_page: 25 });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useAuditLogs(filters);
  const items = data?.data ?? [];
  const meta  = data?.meta as BackendMeta | undefined;

  return (
    <div className="audit-page-container">
      <PageHeader
        title="سجل التدقيق"
        description="سجل جميع العمليات على البيانات"
        breadcrumb={[
          { label: 'النظام', href: '/settings' },
          { label: 'سجل التدقيق' },
        ]}
        badge={meta ? { label: `${meta.total ?? items.length} سجل`, variant: 'info' } : undefined}
      />

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([
            { key: '',      label: 'جميع الأحداث' },
            { key: 'created', label: 'إنشاء' },
            { key: 'updated', label: 'تعديل' },
            { key: 'deleted', label: 'حذف' },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilters(f => ({ ...f, event: opt.key || undefined, page: 1 }))}
              className={`audit-tab-pill ${filters.event === opt.key || (!filters.event && opt.key === '') ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Card noHeader style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <Skeleton variant="table" rows={6} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="ti-history-off" text="لا توجد سجلات" sub="لم يتم تسجيل أي عملية بعد" />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <Table className="audit-tbl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="audit-th">التاريخ</TableHead>
                    <TableHead className="audit-th">المستخدم</TableHead>
                    <TableHead className="audit-th">الحدث</TableHead>
                    <TableHead className="audit-th">النوع</TableHead>
                    <TableHead className="audit-th">الرقم</TableHead>
                    <TableHead className="audit-th" style={{ width: 40 }} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(log => {
                    const evt = EVENT_CONFIG[log.event] ?? EVENT_CONFIG.updated;
                    const isExpanded = expandedId === log.id;
                    const typeLabel = log.auditable_type_label ?? typeFallback(log.auditable_type);
                    const displayLabel = log.auditable?.display_label;
                    return (
                      <React.Fragment key={log.id}>
                        <TableRow
                          className={`audit-tr-hover ${isExpanded ? 'audit-tr-active' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <TableCell className="audit-td" style={{ color: 'var(--t3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell className="audit-td">
                            <span style={{ fontWeight: 600 }}>
                              {log.user_label || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="audit-td">
                            <Badge variant={evt.variant} noDot>
                              <i className={`ti ${evt.icon}`} style={{ marginLeft: 4, fontSize: 11 }} />
                              {log.event_label ?? evt.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="audit-td" style={{ color: 'var(--t2)' }}>
                            {typeLabel}
                          </TableCell>
                          <TableCell className="audit-td" style={{ fontSize: 12 }}>
                            {displayLabel ? (
                              <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{displayLabel}</span>
                            ) : (
                              <span style={{ color: 'var(--t4)' }}>#{log.auditable_id}</span>
                            )}
                          </TableCell>
                          <TableCell className="audit-td" style={{ textAlign: 'center' }}>
                            <i
                              className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`}
                              style={{ fontSize: 14, color: 'var(--t4)', transition: 'transform .2s' }}
                            />
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} style={{ padding: '16px 20px', background: 'var(--bg3)' }}>
                              {log.action_summary && (
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>
                                  {log.action_summary}
                                </div>
                              )}
                              <DiffView diff={log.humanized_diff} />
                              {log.ip_address && (
                                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 12 }}>
                                  <span><i className="ti ti-world" style={{ marginLeft: 4 }} />IP: {log.ip_address}</span>
                                  {log.url && <span style={{ fontFamily: 'monospace', fontSize: 10, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{log.url}</span>}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {meta && meta.last_page > 1 && (
              <div style={{ padding: '0 16px', borderTop: '1px solid var(--b1)' }}>
                <Pagination
                  meta={meta}
                  onPageChange={(page) => setFilters(f => ({ ...f, page }))}
                  onPerPageChange={(per_page) => setFilters(f => ({ ...f, per_page, page: 1 }))}
                />
              </div>
            )}
          </>
        )}

        {isFetching && !isLoading && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 14, animation: 'spin 1s linear infinite', color: 'var(--em)' }} />
          </div>
        )}
      </Card>


    </div>
  );
}
