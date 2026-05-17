

# =========================================
# 🧠 pages/admin
# =========================================

## FILE: resources/js/pages/admin/AdminActivityPage.tsx
```
// pages/admin/AdminActivityPage.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import type { ActivityLog } from '@/types/admin';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SelectInput from '@/components/forms/SelectInput';
import DatePicker from '@/components/ui/DatePicker';
import Modal from '@/components/ui/Modal';
import AlertBar from '@/components/ui/AlertBar';

const EVENT_OPTIONS = [
  { label: 'الكل', value: '' },
  { label: 'إنشاء (created)', value: 'created' },
  { label: 'تعديل (updated)', value: 'updated' },
  { label: 'حذف (deleted)', value: 'deleted' },
  { label: 'تسجيل دخول (login)', value: 'login' },
  { label: 'تعليق (suspended)', value: 'suspended' },
  { label: 'توثيق (verified)', value: 'verified' },
];

const getBadgeVariant = (event: string): 'success' | 'danger' | 'warning' | 'info' | 'gray' => {
  if (event === 'created') return 'success';
  if (event === 'deleted') return 'danger';
  if (event === 'updated') return 'warning';
  if (event === 'login') return 'info';
  return 'gray';
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ar-DZ', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function AdminActivityPage() {
  const [search, setSearch] = useState('');
  const [event, setEvent] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const params = useMemo(
    () => ({
      search: search || undefined,
      event: event || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      per_page: 20,
    }),
    [search, event, dateFrom, dateTo, page]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'activity', params],
    queryFn:  () => apiClient.get('/admin/activity-log', { params }).then(r => r.data),
    staleTime: 60_000,
  });
  const exportMutation = useMutation({
    mutationFn: (p: typeof params) => apiClient.get('/admin/activity-log/export', { params: p }),
  });
  const logs = data?.data ?? [];
  const meta = data?.meta;

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

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="بحث في الحدث، المسؤول، IP..." debounce={400} />
          <SelectInput label="نوع الحدث" options={EVENT_OPTIONS} value={event} onChange={setEvent} />
          <DatePicker label="من تاريخ" value={dateFrom} onChange={setDateFrom} />
          <DatePicker label="إلى تاريخ" value={dateTo} onChange={setDateTo} />
          <Button variant="default" icon={<i className="ti ti-filter" />} onClick={() => setPage(1)}>تطبيق</Button>
        </div>
      </Card>

      <Card padding={0}>
        {isError && (
          <AlertBar variant="red">
            تعذّر تحميل سجل النشاطات.{' '}
            <button onClick={() => refetch()} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              إعادة المحاولة
            </button>
          </AlertBar>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="tw">
            <thead>
              <tr>
                <th>الحدث</th><th>الوصف</th><th>المسؤول</th><th>الشركة</th><th>IP</th><th>التاريخ</th><th></th>
                </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center' }}><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /></td></tr>
                : logs.length === 0
                ? <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>لا توجد سجلات</td></tr>
                : logs.map(log => (
                    <tr key={log.id}>
                      <td><Badge variant={getBadgeVariant(log.event)}>{log.event}</Badge></td>
                      <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>{log.description}</td>
                      <td>{log.causer?.name || '—'}</td>
                      <td>{log.company?.name || '—'}</td>
                      <td>{log.ip_address || '—'}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                      <td><Button size="xs" onClick={() => handleViewDetails(log)}>تفاصيل</Button></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--t4)' }}>الصفحة {meta.current_page} من {meta.last_page} ({meta.total} إجمالي)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button disabled={page === 1} onClick={() => setPage(p => p - 1)} size="sm">السابقة</Button>
              <Button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)} size="sm">التالية</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="تفاصيل النشاط" size="lg">
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><strong>الحدث:</strong> <Badge variant={getBadgeVariant(selectedLog.event)}>{selectedLog.event}</Badge></div>
            <div><strong>الوصف:</strong> {selectedLog.description}</div>
            <div><strong>المسؤول:</strong> {selectedLog.causer?.name || '—'} ({selectedLog.causer?.email || '—'})</div>
            <div><strong>نوع الكيان:</strong> {selectedLog.subject_type || '—'} (رقم {selectedLog.subject_id || '—'})</div>
            <div><strong>الشركة:</strong> {selectedLog.company?.name || '—'}</div>
            <div><strong>عنوان IP:</strong> {selectedLog.ip_address || '—'}</div>
            <div><strong>التاريخ:</strong> {formatDateTime(selectedLog.created_at)}</div>
            <div><strong>البيانات القديمة:</strong><pre style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 200 }}>{JSON.stringify(selectedLog.old_values, null, 2)}</pre></div>
            <div><strong>البيانات الجديدة:</strong><pre style={{ background: 'var(--bg3)', padding: 10, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 200 }}>{JSON.stringify(selectedLog.new_values, null, 2)}</pre></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminBootPage.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminBootPage.tsx
//
// صفحة خاصة بالسوبر أدمن — يصل إليها بعد أول دخول
// تعرض AdminBootModal مباشرة وعند اكتماله تنقله لـ /admin/dashboard
//
// Route: /admin/boot  (في RequireSuperAdmin guard)
// ════════════════════════════════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import AdminBootModal from '@/components/modals/AdminBootModal';

export default function AdminBootPage() {
  const navigate = useNavigate();

  return (
    // خلفية بسيطة تحت المودال
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <AdminBootModal
        onComplete={() => navigate('/admin/dashboard', { replace: true })}
      />
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminCompaniesPage.tsx
```
// pages/admin/AdminCompaniesPage.tsx
import { useState, useMemo } from 'react';
import { useAdminCompanies } from '@/hooks/admin';
import { useDebounce } from '@/hooks/useDebounce';
import CompanyDrawer from '@/components/admin/CompanyDrawer';
import { Avatar, StatusBadge, EmptyState, Spinner, fmtDate } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import type { AdminCompany, AdminCompaniesFilter } from '@/types/admin';

const PLANS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};

export default function AdminCompaniesPage() {
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 350);
  const [status,  setStatus]  = useState<AdminCompaniesFilter['status']>('');
  const [plan,    setPlan]    = useState('');
  const [sortBy,  setSortBy]  = useState<'name' | 'created_at' | 'users_count'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page,    setPage]    = useState(1);
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  const filter = useMemo<AdminCompaniesFilter>(() => ({
    search:   search || undefined,
    status:   status || undefined,
    plan:     plan   || undefined,
    sort_by:  sortBy,
    sort_dir: sortDir,
    page,
    per_page: 20,
  }), [search, status, plan, sortBy, sortDir, page]);

  const { data, isLoading, isError, refetch } = useAdminCompanies(filter);

  const companies: AdminCompany[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? <i className={`ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'}`} style={{ fontSize: 11 }} />
      : <i className="ti ti-selector" style={{ fontSize: 11, opacity: .3 }} />;

  return (
    <div>
      <PageHeader
        title="الشركات"
        description={`${meta?.total ?? 0} شركة في المنصة`}
        actions={
          <Button variant="primary" icon={<i className="ti ti-refresh" />} onClick={() => refetch()}>
            تحديث
          </Button>
        }
      />

      {/* ── فلاتر ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو البريد..."
          style={{ flex: 1, minWidth: 200 }}
        />

        {([
          { val: '',            label: 'كل الحالات' },
          { val: 'active',      label: 'نشطة' },
          { val: 'suspended',   label: 'موقوفة' },
          { val: 'inactive',    label: 'غير نشطة' },
          { val: 'verified',    label: 'موثّقة' },
          { val: 'unverified',  label: 'غير موثقة' },
        ] as { val: typeof status; label: string }[]).map(opt => (
          <button
            key={opt.val}
            onClick={() => { setStatus(opt.val); setPage(1); }}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${status === opt.val ? 'var(--em)' : 'var(--b2)'}`,
              background: status === opt.val ? 'var(--emb)' : 'var(--bg3)',
              color: status === opt.val ? 'var(--em)' : 'var(--t3)',
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
            }}
          >{opt.label}</button>
        ))}

        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}
        >
          <option value="">كل الخطط</option>
          {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* ── الجدول ────────────────────────────────────────────────────────── */}
      <Card padding={0}>
        {isError && (
          <div style={{ padding: '12px 16px', background: '#ef44441a', color: '#ef4444', fontSize: 13 }}>
            تعذّر تحميل البيانات.{' '}
            <button onClick={() => refetch()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}>
              إعادة المحاولة
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
                {[
                  { label: 'الشركة',     col: 'name'        as typeof sortBy },
                  { label: 'الخطة',      col: null },
                  { label: 'المستخدمون', col: 'users_count' as typeof sortBy },
                  { label: 'الحالة',     col: null },
                  { label: 'الإنشاء',    col: 'created_at'  as typeof sortBy },
                  { label: '',           col: null },
                ].map((th, i) => (
                  <th
                    key={i}
                    onClick={() => th.col && toggleSort(th.col)}
                    style={{
                      padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 800,
                      color: 'var(--t4)', letterSpacing: .4, textTransform: 'uppercase',
                      cursor: th.col ? 'pointer' : 'default', userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {th.label}{th.col && <SortIcon col={th.col} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: 40 }}><Spinner /></td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40 }}>
                  <EmptyState icon="ti-building-off" text="لا توجد شركات" />
                </td></tr>
              ) : companies.map(co => (
                <tr
                  key={co.id}
                  onClick={() => setSelected(co)}
                  style={{ borderBottom: '1px solid var(--b1)', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar id={co.id} name={co.name} size={32} radius={9} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{co.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                          /{co.slug}
                          {co.owner && ` · ${co.owner.name}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: (PLAN_COLORS[co.plan] || '#6b7280') + '22',
                      color: PLAN_COLORS[co.plan] || '#6b7280',
                    }}>
                      {PLANS[co.plan] ?? co.plan}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>
                    {co.users_count}
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>/ {co.max_users || '∞'}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge active={co.active} suspended={co.is_suspended} />
                    {co.verified_at && (
                      <i className="ti ti-shield-check" style={{ marginRight: 6, fontSize: 13, color: '#10b981' }} title="موثّق" />
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>
                    {fmtDate(co.created_at)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <i className="ti ti-chevron-left" style={{ fontSize: 14, color: 'var(--t4)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} شركة)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" disabled={page === 1}              onClick={() => setPage(p => p - 1)}>السابقة</Button>
              <Button size="sm" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <CompanyDrawer
          company={selected}
          onClose={refresh => { setSelected(null); if (refresh) refetch(); }}
        />
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminDashboardPage.tsx
```
// ════════════════════════════════════════════════
// pages/admin/AdminDashboardPage.tsx
// لوحة تحكم احترافية للسوبر أدمن
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';


const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};

const QUICK_ACTIONS = [
  { label: 'إضافة شركة',          icon: 'ti-building-plus',     to: '/admin/companies' },
  { label: 'إدارة المستخدمين',    icon: 'ti-users',             to: '/admin/users' },
  { label: 'الإعدادات العامة',    icon: 'ti-settings',          to: '/admin/settings' },
  { label: 'سجل النشاط',          icon: 'ti-activity',          to: '/admin/activity' },
];

export default function AdminDashboardPage() {
//   const { data: stats, isLoading, isError, refetch } = useAdminDashboard();
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn:  () => apiClient.get('/admin/dashboard').then(r => (r.data as any)?.data ?? r.data),
    staleTime: 2 * 60_000,
  });
  const navigate = useNavigate();

  if (isLoading) return <div className="empty" style={{ padding: 60 }}><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, color: 'var(--em)' }} /> جار التحميل...</div>;
  if (isError) return <AlertBar variant="red">فشل تحميل البيانات. <Button onClick={() => refetch()}>إعادة المحاولة</Button></AlertBar>;
  if (!stats) return null;

  const { companies, users, recent_companies } = stats;

  return (
    <div>
      <PageHeader title="لوحة تحكم النظام" description="نظرة شاملة على كامل المنصة" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard variant="green" icon="ti-building-store" label="إجمالي الشركات" value={companies.total} />
        <KpiCard variant="blue" icon="ti-circle-check" label="شركات نشطة" value={companies.active} />
        <KpiCard variant="red" icon="ti-ban" label="موقوفة" value={companies.suspended} />
        <KpiCard variant="purple" icon="ti-users" label="إجمالي المستخدمين" value={users.total} />
        <KpiCard variant="gold" icon="ti-user-plus" label="مستخدمون جدد" value={users.new_this_month} sub="هذا الشهر" />
        <KpiCard variant="teal" icon="ti-shield-check" label="موثّقة" value={companies.verified ?? 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* توزيع الخطط */}
        <Card title="توزيع الخطط">
          {Object.entries(companies.by_plan).map(([plan, count]) => {
            const total = companies.total || 1;
            const pct = Math.round((count / total) * 100);
            const color = PLAN_COLORS[plan] || '#6b7280';
            return (
              <div key={plan} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--t2)' }}>{PLAN_LABELS[plan] || plan}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{count} شركة ({pct}%)</span>
                </div>
                <div className="pb"><div className="pb-f" style={{ width: `${pct}%`, background: color }} /></div>
              </div>
            );
          })}
        </Card>

        {/* أحدث الشركات */}
        <Card title="أحدث الشركات" actions={<Button size="sm" onClick={() => navigate('/admin/companies')}>عرض الكل →</Button>}>
          {recent_companies.slice(0, 5).map(co => (
            <div key={co.id} className="sr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--b1)' }}>
              <div>
                <strong style={{ fontSize: 13 }}>{co.name}</strong><br />
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</span>
              </div>
              <Badge variant={co.is_suspended ? 'danger' : co.active ? 'success' : 'gray'}>
                {co.is_suspended ? 'موقوف' : co.active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          ))}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="إجراءات سريعة">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(action => (
            <Button
              key={action.to}
              variant="secondary"
              icon={<i className={`ti ${action.icon}`} />}
              onClick={() => navigate(action.to)}
              style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="secondary" icon={<i className="ti ti-refresh" />} onClick={() => refetch()} style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}>
            تحديث البيانات
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminPlansPage.tsx
```
// pages/admin/AdminPlansPage.tsx
import { useAdminPlans, useAdminDashboard } from '@/hooks/useAdmin';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';

const PLAN_ICONS: Record<string, string> = {
  starter: 'ti-seedling', professional: 'ti-rocket', enterprise: 'ti-building', custom: 'ti-adjustments',
};
const PLAN_LABELS: Record<string, string> = {
  starter: 'المبتدئ', professional: 'الاحترافي', enterprise: 'المؤسسة', custom: 'المخصص',
};

export default function AdminPlansPage() {
  const { data: plans, isLoading } = useAdminPlans();
  const { data: stats } = useAdminDashboard();
  const byPlan = stats?.companies.by_plan ?? {};

  if (isLoading) return <div className="empty"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جار التحميل...</div>;

  return (
    <div>
      <PageHeader title="الخطط" subtitle="نظرة عامة على الخطط المتاحة واشتراكات الشركات" />
      <div className="g3">
        {(plans ?? []).map(plan => {
          const count = byPlan[plan.key] ?? 0;
          return (
            <Card key={plan.key} title={<><i className={`ti ${PLAN_ICONS[plan.key]}`} /> {PLAN_LABELS[plan.key]}</>} subtitle={`${count} شركة مشتركة`}>
              <div className="sr"><span>المستخدمون</span><strong>{plan.max_users === 0 ? 'غير محدود' : plan.max_users}</strong></div>
              <div className="sr"><span>المنتجات</span><strong>{plan.max_products === 0 ? 'غير محدود' : plan.max_products.toLocaleString('ar')}</strong></div>
              <div className="sr"><span>المخازن</span><strong>{plan.max_warehouses === 0 ? 'غير محدود' : plan.max_warehouses}</strong></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminReportsPage.tsx
```
// pages/admin/AdminReportsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { adminApi } from '@/lib/api/admin';
import LineChart from '@/components/charts/LineChart';



export default function AdminReportsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', period],
    queryFn: () => adminApi.getReports(period),
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>تحميل التقارير...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="تقارير النظام" description="إحصائيات الاستخدام والنمو" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Button variant={period === '7d' ? 'primary' : 'default'} onClick={() => setPeriod('7d')}>آخر 7 أيام</Button>
        <Button variant={period === '30d' ? 'primary' : 'default'} onClick={() => setPeriod('30d')}>آخر 30 يوم</Button>
        <Button variant={period === '90d' ? 'primary' : 'default'} onClick={() => setPeriod('90d')}>آخر 90 يوم</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="عدد المستخدمين الجدد">
          <LineChart data={data?.users ?? []} height={240} color="var(--blue)" />
        </Card>
        <Card title="عدد الشركات الجديدة">
          <LineChart data={data?.companies ?? []} height={240} color="var(--em)" />
        </Card>
        <Card title="نداءات API اليومية">
          <LineChart data={data?.apiCalls ?? []} height={240} color="var(--purple)" />
        </Card>
        <Card title="الإيرادات الشهرية (MRR)">
          <LineChart data={data?.revenue ?? []} height={240} color="var(--gold)" />
        </Card>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminSettingsPage.tsx
```
// pages/admin/AdminSettingsPage.tsx
import { useState, useEffect } from 'react';
import { useSystemSettings, useMaintenanceMutations } from '@/hooks/admin';
import { maintenanceApi } from '@/lib/api/admin';
import { SectionTitle, FlashBar } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import type { SystemSettings } from '@/types/admin';

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: checked ? 'var(--em)' : 'var(--bg4)', position: 'relative', transition: '.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '.2s', right: checked ? 3 : 23, boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
    </button>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 6 }}>{label}</label>
      <input type="number" value={value} min={min} onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' as const }} />
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { data, isLoading, update } = useSystemSettings();
  const maint = useMaintenanceMutations();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [flash, setFlash]       = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { if (data) setSettings(data); }, [data]);

  const flash$ = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 2500); };

  const save = async <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, [key]: value });
    try {
      await update.mutateAsync({ [key]: value } as any);
      flash$(true, 'تم الحفظ تلقائياً');
    } catch {
      setSettings(prev);
      flash$(false, 'فشل الحفظ');
    }
  };

  if (isLoading || !settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--t4)' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جارٍ التحميل...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="إعدادات النظام" description="إدارة التكوين العام للمنصة" />

      {flash && <FlashBar ok={flash.ok} msg={flash.msg} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Card title="الإعدادات العامة">
          <Row label="تسجيل مستخدمين جدد"       sub="السماح للزوار بإنشاء حسابات">
            <Toggle checked={settings.allow_registration}  onChange={v => save('allow_registration', v)} />
          </Row>
          <Row label="إنشاء شركات جديدة"        sub="السماح للمستخدمين بإنشاء شركات">
            <Toggle checked={settings.allow_new_companies} onChange={v => save('allow_new_companies', v)} />
          </Row>
          <Row label="وضع التصحيح (Debug)"      sub="أوقفه في الإنتاج">
            <Toggle checked={settings.debug_mode}          onChange={v => save('debug_mode', v)} />
          </Row>
          <Row label="API العام"                sub="طلبات بدون مصادقة">
            <Toggle checked={settings.public_api}          onChange={v => save('public_api', v)} />
          </Row>
        </Card>

        <Card title="الحدود الافتراضية">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '8px 0' }}>
            <NumField label="مدة التجربة المجانية (أيام)" value={settings.free_trial_days}      onChange={v => save('free_trial_days', v)}      min={1} />
            <NumField label="حد المستخدمين — مجاني"        value={settings.free_max_users}       onChange={v => save('free_max_users', v)}       min={1} />
            <NumField label="حد المنتجات — Starter"        value={settings.starter_max_products} onChange={v => save('starter_max_products', v)} min={1} />
          </div>
        </Card>

        <Card title="وضع الصيانة">
          <Row label="تفعيل وضع الصيانة" sub="المستخدمون العاديون سيرون صفحة الصيانة">
            <Toggle
              checked={settings.maintenance_mode}
              onChange={v => {
                save('maintenance_mode', v);
                v ? maint.enable.mutate(settings.maintenance_message) : maint.disable.mutate();
              }}
            />
          </Row>
          {settings.maintenance_mode && (
            <div style={{ paddingTop: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 6 }}>رسالة الصيانة</label>
              <textarea
                value={settings.maintenance_message}
                onChange={e => setSettings(s => s ? { ...s, maintenance_message: e.target.value } : s)}
                onBlur={e => save('maintenance_message', e.target.value)}
                rows={2} placeholder="رسالة تُعرض للمستخدمين..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'Tajawal, sans-serif' }}
              />
            </div>
          )}
        </Card>

        <Card title="أدوات النظام">
          <div style={{ padding: '8px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {([
              { label: 'مسح الكاش',                icon: 'ti-trash',           action: () => maint.clearCache.mutate(), pending: maint.clearCache.isPending },
              { label: 'تشغيل المهام المجدولة',   icon: 'ti-clock-play',       action: () => maintenanceApi.enable(),   pending: false },
              { label: 'نسخ احتياطي',              icon: 'ti-database-export',  action: () => {},                       pending: false },
            ]).map(btn => (
              <button key={btn.label} onClick={() => { if (confirm(`${btn.label}؟`)) btn.action(); }} disabled={btn.pending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #ef444433', background: '#ef44440d', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: btn.pending ? 'not-allowed' : 'pointer', fontFamily: 'Tajawal, sans-serif', opacity: btn.pending ? .6 : 1 }}>
                <i className={`ti ${btn.pending ? 'ti-loader' : btn.icon}`} style={{ animation: btn.pending ? 'spin 1s linear infinite' : 'none' }} />
                {btn.label}
              </button>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminUsersPage.tsx
```
// pages/admin/AdminUsersPage.tsx
import { useState, useMemo } from 'react';
import { useAdminUsers } from '@/hooks/admin';
import { useDebounce } from '@/hooks/useDebounce';
import UserDrawer from '@/components/admin/UserDrawer';
import { Avatar, StatusBadge, EmptyState, Spinner, fmtDate } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import type { AdminUser, AdminUsersFilter } from '@/types/admin';
import { ROLES } from '@/constants/roles';

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  [ROLES.SUPER_ADMIN]: { label: 'Super Admin', color: '#ef4444' },
  [ROLES.ADMIN]:       { label: 'Admin',        color: '#6366f1' },
  manager:             { label: 'Manager',       color: '#0ea5e9' },
  cashier:             { label: 'Cashier',       color: '#f59e0b' },
  viewer:              { label: 'Viewer',        color: '#6b7280' },
};

export default function AdminUsersPage() {
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 350);
  const [role,     setRole]     = useState('');
  const [active,   setActive]   = useState('');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const filter = useMemo<AdminUsersFilter>(() => ({
    search:   search  || undefined,
    role:     role    || undefined,
    active:   active  || undefined,
    page,
    per_page: 20,
  }), [search, role, active, page]);

  const { data, isLoading, isError, refetch } = useAdminUsers(filter);

  const users: AdminUser[] = (data as any)?.data ?? [];
  const meta  = (data as any)?.meta;

  return (
    <div>
      <PageHeader title="المستخدمون" description={`${meta?.total ?? 0} مستخدم في المنصة`} />

      {/* ── فلاتر ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو البريد..."
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
          style={selectStyle}>
          <option value="">كل الأدوار</option>
          <option value="super-admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
        </select>
        <select value={active} onChange={e => { setActive(e.target.value); setPage(1); }}
          style={selectStyle}>
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">معطل</option>
        </select>
      </div>

      {isError && (
        <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: '#ef44441a', color: '#ef4444', fontSize: 13 }}>
          تعذّر التحميل.{' '}
          <button onClick={() => refetch()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
                {['المستخدم', 'الدور', 'الشركات', 'آخر دخول', 'الحالة', 'الإنشاء', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--t4)', letterSpacing: .4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: 40 }}><Spinner /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40 }}>
                  <EmptyState icon="ti-users" text="لا يوجد مستخدمون" />
                </td></tr>
              ) : users.map(u => {
                const rb = ROLE_BADGE[u.role ?? ''];
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    style={{ borderBottom: '1px solid var(--b1)', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar id={u.id} name={u.name} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{u.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {rb ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: rb.color + '22', color: rb.color }}>{rb.label}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--t4)' }}>{u.role ?? 'user'}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>{u.companies_count ?? 0}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDate(u.last_login_at)}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge active={u.active} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <i className="ti ti-chevron-left" style={{ fontSize: 14, color: 'var(--t4)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} مستخدم)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" disabled={page === 1}              onClick={() => setPage(p => p - 1)}>السابقة</Button>
              <Button size="sm" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <UserDrawer
          user={selected}
          onClose={refresh => { setSelected(null); if (refresh) refetch(); }}
        />
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--b2)',
  background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12,
  fontFamily: 'Tajawal, sans-serif', cursor: 'pointer',
};
```

## FILE: resources/js/pages/admin/CompaniesPage.tsx
```
// ════════════════════════════════════════════════════════════
// pages/admin/CompaniesPage.tsx — إدارة الشركات (Super Admin)
// ════════════════════════════════════════════════════════════
import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { useAuth } from '@/context/AuthContext';

import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import PageHeader   from '@/components/ui/PageHeader';
import AlertBar     from '@/components/ui/AlertBar';
import EmptyState   from '@/components/ui/EmptyState';
import KpiCard      from '@/components/ui/KpiCard';
import SearchInput  from '@/components/ui/SearchInput';
import Switch       from '@/components/ui/Switch';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════
interface Company {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  activity?: string;
  nif?: string; nis?: string; rc?: string; ai?: string;
  active: boolean;
  is_suspended: boolean;
  is_operational: boolean;
  is_verified: boolean;
  is_on_trial: boolean;
  trial_days_remaining?: number | null;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  max_users: number;
  max_products: number;
  max_warehouses: number;
  notes?: string;
  owner?: { id: number; name: string };
  owner_id?: number;
  created_at?: string;
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'deactivated' | 'trial' | 'verified';
type Tab = 'companies' | 'super';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════
const AV_COLORS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#0d7a8c,#22d3ee)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];
const avColor  = (id: number) => AV_COLORS[id % AV_COLORS.length];
const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const PLAN_META: Record<string, { label: string; color: string; bg: string }> = {
  free:         { label: 'مجاني',       color: 'var(--t4)',    bg: 'var(--bg4)' },
  starter:      { label: 'Starter',     color: 'var(--blue)',  bg: 'var(--blueb)' },
  professional: { label: 'Pro',         color: 'var(--em)',    bg: 'var(--emb)' },
  enterprise:   { label: 'Enterprise',  color: 'var(--gold)',  bg: 'var(--goldb)' },
};

const PLANS = ['free', 'starter', 'professional', 'enterprise'] as const;

function statusInfo(co: Company) {
  if (co.is_suspended)  return { label: 'معلّقة',   color: 'var(--red)',   bg: 'var(--redb)',  icon: 'ti-lock' };
  if (!co.active)    return { label: 'موقوفة',   color: 'var(--t4)',    bg: 'var(--bg4)',   icon: 'ti-minus-circle' };
  if (co.is_on_trial)   return { label: `تجريبية · ${co.trial_days_remaining ?? '?'} يوم`, color: 'var(--gold)', bg: 'var(--goldb)', icon: 'ti-clock' };
  if (co.is_verified)   return { label: 'موثّقة',   color: 'var(--em)',    bg: 'var(--emb)',   icon: 'ti-rosette-discount-check' };
  return                       { label: 'نشطة',     color: 'var(--blue)',  bg: 'var(--blueb)', icon: 'ti-circle-check' };
}

// ════════════════════════════════════════════════════════════
// Style helpers
// ════════════════════════════════════════════════════════════
const actionBtn = (): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--t3)',
  transition: '.13s', flexShrink: 0,
});
const hoverBtn = (e: React.MouseEvent, bg: string, color: string) => {
  const el = e.currentTarget as HTMLButtonElement;
  el.style.background = bg;
  el.style.color = color;
  el.style.borderColor = color + '44';
};
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--b3)', background: 'var(--bg3)',
  color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif',
  fontSize: 13, outline: 'none',
};

// ════════════════════════════════════════════════════════════
// CompanyAvatar
// ════════════════════════════════════════════════════════════
function CompanyAvatar({ name, id, size = 42 }: { name: string; id: number; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      flexShrink: 0, background: avColor(id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 900, color: '#fff', letterSpacing: -1,
    }}>
      {initials(name)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// EditCompanyDrawer — درج تعديل الشركة
// ════════════════════════════════════════════════════════════
function EditCompanyDrawer({
  company, onClose, onSaved,
}: {
  company: Company;
  onClose: () => void;
  onSaved: (updated: Partial<Company>) => void;
}) {
  const [tab, setTab]     = useState<'basic' | 'legal' | 'admin' | 'danger'>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [toast, setToast]   = useState('');

  const [form, setForm] = useState({
    name:            company.name            ?? '',
    commercial_name: company.commercial_name ?? '',
    email:           company.email           ?? '',
    phone:           company.phone           ?? '',
    mobile:          company.mobile          ?? '',
    activity:        company.activity        ?? '',
    address:         company.address         ?? '',
    nif:             company.nif             ?? '',
    nis:             company.nis             ?? '',
    rc:              company.rc              ?? '',
    ai:              company.ai              ?? '',
    plan:            company.plan            ?? 'free',
    max_users:       company.max_users       ?? 3,
    max_products:    company.max_products    ?? 500,
    max_warehouses:  company.max_warehouses  ?? 1,
    notes:           company.notes           ?? '',
    active:       company.active       ?? true,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const f = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    try {
      const { plan, max_users, max_products, max_warehouses, notes, active, ...basic } = form;

      // ① البيانات الأساسية
      await apiClient.put(`/companies/${company.slug}`, { ...basic, active });

      // ② الخطة — إن تغيّرت
      if (
        plan !== company.plan ||
        max_users !== company.max_users ||
        max_products !== company.max_products ||
        max_warehouses !== company.max_warehouses
      ) {
        await apiClient.patch(`/companies/${company.slug}/plan`, {
          plan, max_users, max_products, max_warehouses,
        });
      }

      // ③ الملاحظات الداخلية
      if (notes !== (company.notes ?? '')) {
        await apiClient.patch(`/admin/companies/${company.id}/notes`, { notes });
      }

      onSaved({ ...form });
      showToast('✅ تم الحفظ بنجاح');
      setTimeout(onClose, 600);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    const isSusp = company.is_suspended;
    try {
      if (isSusp) {
        await apiClient.post(`/companies/${company.slug}/unsuspend`);
      } else {
        const reason = prompt('سبب التعليق:') ?? 'قرار إداري';
        await apiClient.post(`/companies/${company.slug}/suspend`, { reason });
      }
      onSaved({ is_suspended: !isSusp });
      showToast(isSusp ? 'تم رفع التعليق' : 'تم تعليق الشركة');
    } catch { setError('فشلت العملية'); }
  };

  const handleVerify = async () => {
    try {
      if (company.is_verified) {
        await apiClient.post(`/companies/${company.slug}/unverify`);
        onSaved({ is_verified: false });
        showToast('تم إلغاء التوثيق');
      } else {
        await apiClient.post(`/companies/${company.slug}/verify`);
        onSaved({ is_verified: true });
        showToast('✅ تم توثيق الشركة');
      }
    } catch { setError('فشلت العملية'); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const TABS = [
    { key: 'basic',  label: 'أساسي',   icon: 'ti-building' },
    { key: 'legal',  label: 'قانوني',  icon: 'ti-file-certificate' },
    { key: 'admin',  label: 'الخطة',   icon: 'ti-star' },
    { key: 'danger', label: 'إجراءات', icon: 'ti-shield' },
  ] as const;

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 9001,
        width: 420, background: 'var(--bg2)',
        boxShadow: '4px 0 40px rgba(0,0,0,.3)',
        display: 'flex', flexDirection: 'column', direction: 'rtl',
        animation: 'slideFromRight .22s cubic-bezier(.34,1.2,.64,1)',
      }}>
        <style>{`@keyframes slideFromRight { from{transform:translateX(-30px);opacity:0} to{transform:none;opacity:1} }`}</style>

        {/* Header */}
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: 'var(--bg3)',
        }}>
          <CompanyAvatar name={company.name} id={company.id} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{company.slug}</div>
          </div>
          <button onClick={onClose} style={{ ...actionBtn(), width: 32, height: 32 }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 4px', flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 14px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
              color: tab === t.key ? 'var(--em)' : 'var(--t4)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 5,
              transition: '.12s', whiteSpace: 'nowrap',
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 0' }}>

          {error && (
            <div style={{ padding: '10px 13px', borderRadius: 10, background: 'var(--redb)', color: 'var(--red)', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
              {error}
              <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}>×</button>
            </div>
          )}

          {/* ── أساسي ── */}
          {tab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <DF label="الاسم الرسمي" req>
                <input value={form.name} onChange={e => f('name')(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <DF label="الاسم التجاري">
                <input value={form.commercial_name} onChange={e => f('commercial_name')(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <DF label="البريد الإلكتروني">
                  <input value={form.email} onChange={e => f('email')(e.target.value)} style={inp} dir="ltr"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </DF>
                <DF label="الهاتف">
                  <input value={form.phone} onChange={e => f('phone')(e.target.value)} style={inp} dir="ltr"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </DF>
              </div>
              <DF label="النشاط التجاري">
                <input value={form.activity} onChange={e => f('activity')(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <DF label="العنوان">
                <textarea value={form.address} onChange={e => f('address')(e.target.value)} rows={2}
                  style={{ ...inp, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-power" style={{ color: form.active ? 'var(--em)' : 'var(--t4)' }} />
                  حالة الشركة
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: form.active ? 'var(--em)' : 'var(--t4)', fontWeight: 700 }}>
                    {form.active ? 'نشطة' : 'موقوفة'}
                  </span>
                  <Switch checked={form.active} onChange={() => f('active')(!form.active)} />
                </div>
              </div>
            </div>
          )}

          {/* ── قانوني ── */}
          {tab === 'legal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                { key: 'nif' as const, label: 'NIF — رقم التعريف الجبائي' },
                { key: 'nis' as const, label: 'NIS — رقم الإحصاء' },
                { key: 'rc'  as const, label: 'RC — السجل التجاري' },
                { key: 'ai'  as const, label: 'AI — رقم المادة' },
              ].map(({ key, label }) => (
                <DF key={key} label={label}>
                  <input value={form[key]} onChange={e => f(key)(e.target.value)} style={{ ...inp, direction: 'ltr', textAlign: 'left' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </DF>
              ))}
            </div>
          )}

          {/* ── الخطة ── */}
          {tab === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '10px 13px', borderRadius: 10, background: 'var(--emb)', border: '1px solid var(--embo)', color: 'var(--em)', fontSize: 12, display: 'flex', gap: 8 }}>
                <i className="ti ti-shield-check" />
                هذه الإعدادات مقتصرة على Super Admin
              </div>

              <DF label="خطة الاشتراك">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {PLANS.map(p => {
                    const meta = PLAN_META[p];
                    const active = form.plan === p;
                    return (
                      <button key={p} onClick={() => f('plan')(p)} style={{
                        padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${active ? meta.color : 'var(--b2)'}`,
                        background: active ? meta.bg : 'var(--bg3)',
                        color: active ? meta.color : 'var(--t3)',
                        transition: '.13s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        {active && <i className="ti ti-check" style={{ fontSize: 12 }} />}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </DF>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {([
                  { key: 'max_users'      as const, label: 'حد المستخدمين', icon: 'ti-users' },
                  { key: 'max_products'   as const, label: 'حد المنتجات',   icon: 'ti-package' },
                  { key: 'max_warehouses' as const, label: 'حد المستودعات', icon: 'ti-building-warehouse' },
                ] as const).map(({ key, label, icon }) => (
                  <DF key={key} label={label}>
                    <div style={{ position: 'relative' }}>
                      <i className={`ti ${icon}`} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--t4)', pointerEvents: 'none' }} />
                      <input type="number" min={1} value={form[key]}
                        onChange={e => f(key)(Number(e.target.value) as any)}
                        style={{ ...inp, paddingRight: 28, textAlign: 'center', direction: 'ltr' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                    </div>
                  </DF>
                ))}
              </div>

              <DF label="ملاحظات داخلية">
                <textarea value={form.notes} onChange={e => f('notes')(e.target.value)} rows={3}
                  placeholder="ملاحظات مرئية للـ Super Admin فقط..."
                  style={{ ...inp, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
            </div>
          )}

          {/* ── إجراءات ── */}
          {tab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 13px', borderRadius: 10, background: 'var(--redb)', border: '1px solid var(--redbo)', color: 'var(--red)', fontSize: 12, display: 'flex', gap: 8 }}>
                <i className="ti ti-alert-triangle" style={{ flexShrink: 0, fontSize: 14 }} />
                هذه الإجراءات تؤثر مباشرة على وصول الشركة للنظام
              </div>

              {/* تعليق / رفع */}
              <div style={{ padding: '14px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
                  {company.is_suspended ? 'الشركة معلّقة حالياً' : 'تعليق الشركة مؤقتاً'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 12 }}>
                  {company.is_suspended
                    ? 'رفع التعليق سيُعيد الوصول لجميع أعضاء الشركة'
                    : 'تعليق الشركة يمنع جميع أعضائها من الدخول'}
                </div>
                <button onClick={handleSuspend} style={{
                  padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7,
                  background: company.is_suspended ? 'var(--emb)' : 'var(--goldb)',
                  color: company.is_suspended ? 'var(--em)' : 'var(--gold)',
                }}>
                  <i className={`ti ti-${company.is_suspended ? 'lock-open' : 'lock'}`} />
                  {company.is_suspended ? 'رفع التعليق' : 'تعليق الشركة'}
                </button>
              </div>

              {/* توثيق */}
              <div style={{ padding: '14px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
                  {company.is_verified ? 'الشركة موثّقة' : 'توثيق الشركة'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 12 }}>
                  التوثيق يُضيف شارة موثّقة ويمنح ثقة إضافية للمستخدمين
                </div>
                <button onClick={handleVerify} style={{
                  padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7,
                  background: company.is_verified ? 'var(--redb)' : 'var(--emb)',
                  color: company.is_verified ? 'var(--red)' : 'var(--em)',
                }}>
                  <i className={`ti ti-${company.is_verified ? 'rosette-discount-check-off' : 'rosette-discount-check'}`} />
                  {company.is_verified ? 'إلغاء التوثيق' : 'توثيق الشركة'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--b2)', flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'var(--bg3)' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--b3)', background: 'var(--bg4)', color: 'var(--t2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
            إغلاق
          </button>
          {tab !== 'danger' && (
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
              padding: '9px 22px', borderRadius: 10, border: 'none',
              background: form.name.trim() ? 'var(--em)' : 'var(--bg4)',
              color: form.name.trim() ? '#fff' : 'var(--t4)',
              fontSize: 13, fontWeight: 800, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: form.name.trim() ? 'var(--emglow)' : 'none',
            }}>
              {saving && <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} />}
              {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg0)', color: 'var(--t1)', padding: '9px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif', border: '1px solid var(--b2)', whiteSpace: 'nowrap', boxShadow: 'var(--shadow2)', zIndex: 1 }}>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

function DF({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>
        {label}{req && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CompanyRow
// ════════════════════════════════════════════════════════════
function CompanyRow({
  co, onEdit, onSuspend, onVerify, onDelete,
}: {
  co: Company;
  onEdit: () => void;
  onSuspend: () => void;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const si   = statusInfo(co);
  const meta = PLAN_META[co.plan] ?? PLAN_META.free;

  return (
    <div className="u-row" style={{
      display: 'grid',
      gridTemplateColumns: '2.4fr 1.4fr 1fr 1fr 130px',
      padding: '12px 18px',
      borderBottom: '1px solid var(--b1)',
      background: 'var(--bg2)', transition: '.13s',
      alignItems: 'center', direction: 'rtl',
    }}>
      {/* الشركة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CompanyAvatar name={co.name} id={co.id} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.name}</span>
            {co.is_verified && <i className="ti ti-rosette-discount-check" style={{ color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace', marginTop: 2 }}>
            {co.slug}
            {co.owner && <span style={{ marginRight: 8, fontFamily: 'Tajawal, sans-serif' }}>· {co.owner.name}</span>}
          </div>
        </div>
      </div>

      {/* البريد / الهاتف */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {co.email && <div style={{ fontSize: 11, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{co.email}</div>}
        {co.phone && <div style={{ fontSize: 10, color: 'var(--t4)', direction: 'ltr' }}>{co.phone}</div>}
        {!co.email && !co.phone && <div style={{ fontSize: 11, color: 'var(--t4)', opacity: .5 }}>—</div>}
      </div>

      {/* الخطة */}
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
      </div>

      {/* الحالة */}
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: si.color, background: si.bg }}>
          <i className={`ti ${si.icon}`} style={{ fontSize: 11 }} />
          {si.label}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} title="تعديل" style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className="ti ti-settings" style={{ fontSize: 13 }} />
        </button>
        <button onClick={onSuspend} title={co.is_suspended ? 'رفع التعليق' : 'تعليق'} style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--goldb)', 'var(--gold)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className={`ti ti-${co.is_suspended ? 'lock-open' : 'lock'}`} style={{ fontSize: 13 }} />
        </button>
        <button onClick={onVerify} title={co.is_verified ? 'إلغاء التوثيق' : 'توثيق'} style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className={`ti ti-${co.is_verified ? 'rosette-discount-check' : 'rosette'}`} style={{ fontSize: 13 }} />
        </button>
        <button onClick={onDelete} title="تعطيل/حذف" style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--redb)', 'var(--red)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className="ti ti-trash" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SuperAdminTab
// ════════════════════════════════════════════════════════════
function SuperAdminTab() {
  const [settings, setSettings] = useState({
    registrations: true, new_companies: true,
    notifications: true, debug: false, public_api: true,
    free_trial_days: 14, free_max_users: 3, starter_max_products: 2000,
  });
  const [saved, setSaved] = useState(false);
  const toggle = (k: keyof typeof settings) => setSettings(p => ({ ...p, [k]: !p[k] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideIn .2s ease' }}>
      <AlertBar variant="red">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} />
          هذه الإعدادات تؤثر على كامل النظام — تصرف بحذر
        </div>
      </AlertBar>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* ميزات النظام */}
        <Card title="ميزات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              { key: 'registrations', label: 'تسجيل مستخدمين جدد',  icon: 'ti-user-plus' },
              { key: 'new_companies', label: 'إنشاء شركات جديدة',    icon: 'ti-building-plus' },
              { key: 'notifications', label: 'نظام الإشعارات',       icon: 'ti-bell' },
              { key: 'debug',         label: 'وضع التصحيح (Debug)',  icon: 'ti-bug' },
              { key: 'public_api',    label: 'API العام',             icon: 'ti-api' },
            ] as { key: keyof typeof settings; label: string; icon: string }[]).map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--b1)' }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`ti ${item.icon}`} style={{ color: 'var(--em)', fontSize: 14 }} />
                  {item.label}
                </span>
                <Switch checked={settings[item.key] as boolean} onChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </Card>

        {/* الخطط الافتراضية */}
        <Card title="الخطط الافتراضية" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'free_trial_days',      label: 'مدة التجربة (أيام)',    min: 1,   max: 90 },
              { key: 'free_max_users',        label: 'حد المستخدمين — Free', min: 1,   max: 10 },
              { key: 'starter_max_products',  label: 'حد المنتجات — Starter', min: 100, max: 9999 },
            ].map(fi => (
              <div key={fi.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 5 }}>{fi.label}</label>
                <input type="number" min={fi.min} max={fi.max}
                  value={settings[fi.key as keyof typeof settings] as number}
                  onChange={e => setSettings(p => ({ ...p, [fi.key]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif', fontSize: 13, outline: 'none', direction: 'ltr' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </div>
            ))}
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} style={{
              padding: '9px', borderRadius: 10, border: 'none',
              background: saved ? 'var(--emb)' : 'var(--em)',
              color: saved ? 'var(--em)' : '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <i className={`ti ti-${saved ? 'check' : 'device-floppy'}`} />
              {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </Card>

        {/* عمليات النظام */}
        <Card title="عمليات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'مسح الكاش العام',          icon: 'ti-refresh',        color: 'var(--em)',   bg: 'var(--emb)',   action: () => alert('تم مسح الكاش') },
              { label: 'تشغيل المهام المجدولة',     icon: 'ti-clock-play',     color: 'var(--blue)', bg: 'var(--blueb)', action: () => alert('تم تشغيل المهام') },
              { label: 'تصدير ملفات اللوج',         icon: 'ti-download',       color: 'var(--blue)', bg: 'var(--blueb)', action: () => alert('جارٍ التصدير...') },
              { label: 'نسخ احتياطي فوري',          icon: 'ti-database-export',color: 'var(--gold)', bg: 'var(--goldb)', action: () => alert('النسخة تُنشأ...') },
              { label: 'إرسال إشعار للكل',          icon: 'ti-speakerphone',   color: 'var(--gold)', bg: 'var(--goldb)', action: () => alert('تم الإرسال') },
              { label: 'تفعيل وضع الصيانة',         icon: 'ti-alert-triangle', color: 'var(--red)',  bg: 'var(--redb)',  action: () => confirm('تفعيل وضع الصيانة؟') && alert('مفعّل') },
            ].map(op => (
              <button key={op.label} onClick={op.action} style={{
                padding: '10px 14px', borderRadius: 10, width: '100%',
                border: `1px solid ${op.bg}`, background: op.bg,
                color: op.color, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                display: 'flex', alignItems: 'center', gap: 9, transition: '.13s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                <i className={`ti ${op.icon}`} style={{ fontSize: 14, flexShrink: 0 }} />
                {op.label}
              </button>
            ))}
          </div>
        </Card>

        {/* إحصائيات */}
        <Card title="إحصائيات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'إجمالي المستخدمين',   icon: 'ti-users' },
              { label: 'إجمالي الفواتير',      icon: 'ti-file-invoice' },
              { label: 'إجمالي المنتجات',      icon: 'ti-package' },
              { label: 'محاولات الدخول اليوم', icon: 'ti-login' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--b1)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--em)', flexShrink: 0 }}>
                  <i className={`ti ${s.icon}`} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>—</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════════════════
export default function CompaniesPage() {
  const { user } = useAuth() as any;
  const qc = useQueryClient();

  const [tab, setTab]                   = useState<Tab>('companies');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch]             = useState('');
  const [editTarget, setEditTarget]     = useState<Company | null>(null);

  // ── Query ──────────────────────────────────────────────────
  const { data: companies = [], isLoading, isError, refetch } = useQuery<Company[]>({
    queryKey: ['admin-companies', statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '200', include: 'owner' };
      if (search)               params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      // super-admin يرى كل الشركات بدون فلتر الـ company context
      const res = await apiClient.get('/companies', { params });
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    staleTime: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────
  const suspend = useMutation({
    mutationFn: ({ slug, suspended }: { slug: string; suspended: boolean }) =>
      suspended
        ? apiClient.post(`/companies/${slug}/unsuspend`)
        : apiClient.post(`/companies/${slug}/suspend`, { reason: 'قرار إداري' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const verify = useMutation({
    mutationFn: ({ slug, verified }: { slug: string; verified: boolean }) =>
      verified
        ? apiClient.post(`/companies/${slug}/unverify`)
        : apiClient.post(`/companies/${slug}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const destroy = useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/companies/${slug}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  // ── KPIs ───────────────────────────────────────────────────
  const total     = companies.length;
  const active    = companies.filter(c => c.is_operational).length;
  const suspended = companies.filter(c => c.is_suspended).length;
  const onTrial   = companies.filter(c => c.is_on_trial).length;

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',         label: 'الكل' },
    { key: 'active',      label: 'نشطة' },
    { key: 'suspended',   label: 'معلّقة' },
    { key: 'deactivated', label: 'موقوفة' },
    { key: 'trial',       label: 'تجريبية' },
    { key: 'verified',    label: 'موثّقة' },
  ];

  return (
    <>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .u-row:hover { background: var(--bg3) !important; }
      `}</style>

      <div className="page on" style={{ animation: 'slideIn .25s ease' }}>

        {/* ── Header ── */}
        <PageHeader
          title="إدارة الشركات"
          subtitle={`${total} شركة · ${active} نشطة · ${suspended} معلّقة`}
          actions={
            tab === 'companies' ? (
              <Button variant="secondary" icon={<i className="ti ti-refresh" />} onClick={() => refetch()}>
                تحديث
              </Button>
            ) : undefined
          }
        />

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          <KpiCard label="إجمالي الشركات" value={total}     icon="ti-building"       color="var(--em)"   bg="var(--emb)" />
          <KpiCard label="نشطة"            value={active}    icon="ti-circle-check"   color="var(--blue)" bg="var(--blueb)" />
          <KpiCard label="معلّقة"           value={suspended} icon="ti-lock"           color="var(--red)"  bg="var(--redb)" />
          <KpiCard label="تجريبية"          value={onTrial}   icon="ti-clock"          color="var(--gold)" bg="var(--goldb)" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', marginBottom: 20, gap: 0, overflowX: 'auto' }}>
          {([
            { key: 'companies', label: 'الشركات',             icon: 'ti-building', count: total },
            { key: 'super',     label: 'إعدادات Super Admin', icon: 'ti-star',     count: null },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
              color: tab === t.key ? 'var(--em)' : 'var(--t4)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
              transition: '.13s', whiteSpace: 'nowrap',
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
              {t.label}
              {t.count !== null && (
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 800, background: tab === t.key ? 'var(--emb)' : 'var(--bg4)', color: tab === t.key ? 'var(--em)' : 'var(--t4)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TAB: COMPANIES ══ */}
        {tab === 'companies' && (
          <div style={{ animation: 'slideIn .2s ease' }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم، البريد، NIF..." />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                    background: statusFilter === f.key ? 'var(--em)' : 'var(--bg3)',
                    border: `1px solid ${statusFilter === f.key ? 'var(--em)' : 'var(--b2)'}`,
                    color: statusFilter === f.key ? '#fff' : 'var(--t3)',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {isError && (
              <AlertBar variant="red">
                فشل تحميل الشركات.{' '}
                <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  إعادة المحاولة
                </button>
              </AlertBar>
            )}

            {isLoading && (
              <div className="empty">
                <div className="empty-ic"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /></div>
                <div className="empty-tx">جارٍ تحميل الشركات...</div>
              </div>
            )}

            {!isLoading && companies.length === 0 && (
              <EmptyState icon="ti-building" text="لا توجد شركات" sub={search ? 'لا توجد نتائج للبحث' : 'لم تُسجَّل أي شركة بعد'} />
            )}

            {!isLoading && companies.length > 0 && (
              <Card padding={0}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 1fr 130px', padding: '10px 18px', borderBottom: '1px solid var(--b2)', background: 'var(--bg3)', direction: 'rtl' }}>
                  {['الشركة', 'التواصل', 'الخطة', 'الحالة', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>{h}</div>
                  ))}
                </div>

                {companies.map(co => (
                  <CompanyRow
                    key={co.id}
                    co={co}
                    onEdit={() => setEditTarget(co)}
                    onSuspend={() => suspend.mutate({ slug: co.slug, suspended: co.is_suspended })}
                    onVerify={() => verify.mutate({ slug: co.slug, verified: co.is_verified })}
                    onDelete={() => confirm(`تعطيل شركة "${co.name}"؟`) && destroy.mutate(co.slug)}
                  />
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ══ TAB: SUPER ADMIN ══ */}
        {tab === 'super' && <SuperAdminTab />}
      </div>

      {/* ── Drawer تعديل الشركة ── */}
      {editTarget && (
        <EditCompanyDrawer
          company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            qc.invalidateQueries({ queryKey: ['admin-companies'] });
            setEditTarget(null);
          }}
        />
      )}
    </>
  );
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

