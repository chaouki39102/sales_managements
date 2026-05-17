// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminActivityPage.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   • import apiClient from '@/lib/api/core/client' — كان apiClient الـ default
//     export ولكن الـ client.ts يُصدَّر كـ named export وليس default
//
// الحل:
//   • استخدام activityApi من lib/api/admin/system.ts مباشرة
//   • أو استيراد apiGet من core/client بدل apiClient
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { activityApi } from '@/lib/api/admin';      // ✅ بدل apiClient المباشر
import { apiGet }       from '@/lib/api/core/client'; // ✅ للـ export mutation
import type { ActivityLog } from '@/types/admin';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import Button      from '@/components/ui/Button';
import Badge       from '@/components/ui/Badge';
import SelectInput from '@/components/forms/SelectInput';
import DatePicker  from '@/components/ui/DatePicker';
import Modal       from '@/components/ui/Modal';
import AlertBar    from '@/components/ui/AlertBar';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_OPTIONS = [
  { label: 'الكل',                  value: '' },
  { label: 'إنشاء (created)',        value: 'created' },
  { label: 'تعديل (updated)',        value: 'updated' },
  { label: 'حذف (deleted)',          value: 'deleted' },
  { label: 'تسجيل دخول (login)',     value: 'login' },
  { label: 'تعليق (suspended)',      value: 'suspended' },
  { label: 'توثيق (verified)',       value: 'verified' },
];

const getBadgeVariant = (
  event: string,
): 'success' | 'danger' | 'warning' | 'info' | 'gray' => {
  if (event === 'created') return 'success';
  if (event === 'deleted') return 'danger';
  if (event === 'updated') return 'warning';
  if (event === 'login')   return 'info';
  return 'gray';
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ar-DZ', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AdminActivityPage() {
  const [search,    setSearch]    = useState('');
  const [event,     setEvent]     = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [page,      setPage]      = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);

  const params = useMemo(() => ({
    search:    search   || undefined,
    event:     event    || undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
    page,
    per_page: 20,
  }), [search, event, dateFrom, dateTo, page]);

  // ✅ استخدام activityApi بدل apiClient
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:  ['admin', 'activity', params],
    queryFn:   () => activityApi.list(params),
    staleTime: 60_000,
  });

  // ✅ export mutation — apiGet للـ CSV export
  const exportMutation = useMutation({
    mutationFn: (p: typeof params) =>
      apiGet<Blob>('/admin/activity-log/export', p as any),
  });

  const logs = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="سجل النشاطات"
        description="جميع الأحداث والعمليات التي تمت عبر المنصة"
        actions={
          <Button
            variant="primary"
            icon={<i className="ti ti-download" />}
            onClick={() => exportMutation.mutate(params)}
            loading={exportMutation.isPending}
          >
            تصدير CSV
          </Button>
        }
      />

      {/* ── فلاتر ───────────────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr 1fr 1fr auto',
          gap: 12, alignItems: 'flex-end',
        }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="بحث في الحدث، المسؤول، IP..."
            debounce={400}
          />
          <SelectInput
            label="نوع الحدث"
            options={EVENT_OPTIONS}
            value={event}
            onChange={setEvent}
          />
          <DatePicker label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
          <DatePicker label="إلى تاريخ" value={dateTo}   onChange={setDateTo}   />
          <Button
            variant="default"
            icon={<i className="ti ti-filter" />}
            onClick={() => setPage(1)}
          >
            تطبيق
          </Button>
        </div>
      </Card>

      {/* ── الجدول ──────────────────────────────────────────────────────────── */}
      <Card padding={0}>
        {isError && (
          <AlertBar variant="red">
            تعذّر تحميل سجل النشاطات.{' '}
            <button
              onClick={() => refetch()}
              style={{
                textDecoration: 'underline', background: 'none',
                border: 'none', cursor: 'pointer', color: 'inherit',
              }}
            >
              إعادة المحاولة
            </button>
          </AlertBar>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="tw">
            <thead>
              <tr>
                <th>الحدث</th>
                <th>الوصف</th>
                <th>المسؤول</th>
                <th>الشركة</th>
                <th>IP</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center' }}>
                    <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
                    لا توجد سجلات
                  </td>
                </tr>
              ) : logs.map((log: ActivityLog) => (
                <tr key={log.id}>
                  <td><Badge variant={getBadgeVariant(log.event)}>{log.event}</Badge></td>
                  <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>{log.description}</td>
                  <td>{log.causer?.name || '—'}</td>
                  <td>{log.company?.name || '—'}</td>
                  <td>{log.ip_address || '—'}</td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td>
                    <Button size="xs" onClick={() => handleViewDetails(log)}>تفاصيل</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: 'var(--t4)' }}>
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} إجمالي)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button disabled={page === 1}              onClick={() => setPage(p => p - 1)} size="sm">السابقة</Button>
              <Button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)} size="sm">التالية</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── تفاصيل النشاط ───────────────────────────────────────────────────── */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="تفاصيل النشاط"
        size="lg"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <strong>الحدث:</strong>{' '}
              <Badge variant={getBadgeVariant(selectedLog.event)}>
                {selectedLog.event}
              </Badge>
            </div>
            <div><strong>الوصف:</strong> {selectedLog.description}</div>
            <div>
              <strong>المسؤول:</strong>{' '}
              {selectedLog.causer?.name || '—'} ({selectedLog.causer?.email || '—'})
            </div>
            <div>
              <strong>نوع الكيان:</strong>{' '}
              {selectedLog.subject_type || '—'} (رقم {selectedLog.subject_id || '—'})
            </div>
            <div><strong>الشركة:</strong> {selectedLog.company?.name || '—'}</div>
            <div><strong>عنوان IP:</strong> {selectedLog.ip_address || '—'}</div>
            <div><strong>التاريخ:</strong> {formatDateTime(selectedLog.created_at)}</div>
            <div>
              <strong>البيانات القديمة:</strong>
              <pre style={{
                background: 'var(--bg3)', padding: 10, borderRadius: 8,
                overflow: 'auto', fontSize: 12, maxHeight: 200,
              }}>
                {JSON.stringify(selectedLog.old_values, null, 2)}
              </pre>
            </div>
            <div>
              <strong>البيانات الجديدة:</strong>
              <pre style={{
                background: 'var(--bg3)', padding: 10, borderRadius: 8,
                overflow: 'auto', fontSize: 12, maxHeight: 200,
              }}>
                {JSON.stringify(selectedLog.new_values, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
