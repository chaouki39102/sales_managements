

# =========================================
# 🧠 pages.admin
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
// ════════════════════════════════════════════════
// pages/admin/AdminCompaniesPage.tsx — النسخة الكاملة
// ════════════════════════════════════════════════
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { useAdminCompanies, useAdminCompanyAction, useUpdateCompanyNotes, useChangePlan } from '@/lib/api/endpoints/companies';
import type { AdminCompany, AdminUser } from '@/types/admin';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SearchInput from '@/components/ui/SearchInput';
import SelectInput from '@/components/forms/SelectInput';
import Modal from '@/components/ui/Modal';
import AlertBar from '@/components/ui/AlertBar';
import { useDebounce } from '@/hooks/useDebounce';

// ── Constants ─────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي',
  enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9',
  enterprise: '#f59e0b', custom: '#8b5cf6',
};
const PLANS = ['free', 'starter', 'professional', 'enterprise', 'custom'];
const AV_GRAD = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];

const avGrad = (id: number) => AV_GRAD[id % AV_GRAD.length];
const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

// ── Status ────────────────────────────────────────────────────
type StatusInfo = { label: string; color: string; bg: string; variant: 'success'|'danger'|'gray'|'warning' };
function statusOf(co: AdminCompany): StatusInfo {
  if (co.is_suspended)  return { label: 'معلّقة',   color: '#ef4444', bg: '#ef44441a', variant: 'danger'  };
  if (!co.active)       return { label: 'غير نشطة', color: '#6b7280', bg: '#6b72801a', variant: 'gray'    };
  if (co.verified_at)   return { label: 'موثّقة',   color: '#10b981', bg: '#10b9811a', variant: 'success' };
  return                       { label: 'نشطة',     color: '#10b981', bg: '#10b9811a', variant: 'success' };
}

// ── Drawer Tab ────────────────────────────────────────────────
type DTab = 'info' | 'plan' | 'users' | 'notes' | 'actions';

// ── CompanyDrawer ─────────────────────────────────────────────
function CompanyDrawer({
  co, onClose,
}: {
  co: AdminCompany;
  onClose: (refresh?: boolean) => void;
}) {
  const companyAction = useAdminCompanyAction();
  const updateNotes  = useUpdateCompanyNotes();
  const changePlan   = useChangePlan();
  const muts = {
    suspend:    { mutateAsync: (p: { slug: string; payload?: any }) => companyAction.mutateAsync({ action: 'suspend',    ...p }), isPending: companyAction.isPending },
    unsuspend:  { mutateAsync: (p: { slug: string })               => companyAction.mutateAsync({ action: 'unsuspend',  ...p }), isPending: companyAction.isPending },
    verify:     { mutateAsync: (p: { slug: string })               => companyAction.mutateAsync({ action: 'verify',     ...p }), isPending: companyAction.isPending },
    unverify:   { mutateAsync: (p: { slug: string })               => companyAction.mutateAsync({ action: 'unverify',   ...p }), isPending: companyAction.isPending },
    activate:   { mutateAsync: (p: { slug: string })               => companyAction.mutateAsync({ action: 'activate',   ...p }), isPending: companyAction.isPending },
    deactivate: { mutateAsync: (p: { slug: string })               => companyAction.mutateAsync({ action: 'deactivate', ...p }), isPending: companyAction.isPending },
    updateNotes,
    changePlan,
  };
  const [tab, setTab]   = useState<DTab>('info');
  const [notes, setNotes] = useState(co.notes ?? '');
  const [planForm, setPlanForm] = useState({
    plan: co.plan,
    max_users:      co.max_users      ?? 0,
    max_products:   co.max_products   ?? 0,
    max_warehouses: co.max_warehouses ?? 0,
  });
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend, setShowSuspend]   = useState(false);
  const [addEmail, setAddEmail]         = useState('');
  const [addRole, setAddRole]           = useState('member');
  const [busy, setBusy]                 = useState<string | null>(null);
  const [flash, setFlash]               = useState<{ ok: boolean; msg: string } | null>(null);

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'companies', co.id, 'users'],
    queryFn:  () => apiClient.get(`/admin/companies/${co.id}/users`).then(r => (r.data as any)?.data ?? r.data),
    enabled:  tab === 'users',
    staleTime: 60_000,
  });

  const st = statusOf(co);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    setFlash(null);
    try {
      await fn();
      setFlash({ ok: true, msg });
      onClose(true);
    } catch (e: any) {
      setFlash({ ok: false, msg: e?.message ?? 'حدث خطأ' });
    } finally {
      setBusy(null);
    }
  };

  const TAB_DEF: { key: DTab; label: string; icon: string }[] = [
    { key: 'info',    label: 'المعلومات', icon: 'ti-info-circle'   },
    { key: 'plan',    label: 'الخطة',     icon: 'ti-credit-card'   },
    { key: 'users',   label: 'المستخدمون',icon: 'ti-users'         },
    { key: 'notes',   label: 'ملاحظات',   icon: 'ti-notes'         },
    { key: 'actions', label: 'إجراءات',   icon: 'ti-bolt'          },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.45)', direction: 'rtl' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 500, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 28px rgba(0,0,0,.18)', maxHeight: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: avGrad(co.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
            {initials(co.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug} · {co.email ?? '—'}</div>
          </div>
          <Badge variant={st.variant}>{st.label}</Badge>
          <button onClick={() => onClose()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--t4)', lineHeight: 1, padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Flash */}
        {flash && (
          <div style={{ padding: '8px 20px', background: flash.ok ? '#10b9811a' : '#ef44441a', color: flash.ok ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
            {flash.ok ? '✓' : '✗'} {flash.msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 14px', flexShrink: 0, overflowX: 'auto' }}>
          {TAB_DEF.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 12px', border: 'none', background: 'none',
              borderBottom: tab === t.key ? '2px solid #dc2626' : '2px solid transparent',
              color: tab === t.key ? '#dc2626' : 'var(--t3)',
              fontWeight: tab === t.key ? 700 : 500, fontSize: 11.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap', fontFamily: "'Tajawal', sans-serif",
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div style={{ display: 'grid', gap: 0 }}>
              {[
                ['المالك',        co.owner?.name ?? '—'],
                ['البريد',        co.email ?? '—'],
                ['الهاتف',        co.phone ?? '—'],
                ['العنوان',       co.address ?? '—'],
                ['الخطة',         PLAN_LABELS[co.plan] ?? co.plan],
                ['المستخدمون',    `${co.users_count} / ${co.max_users}`],
                ['المنتجات (حد)', co.max_products === 0 ? 'غير محدود' : co.max_products],
                ['المخازن (حد)',  co.max_warehouses === 0 ? 'غير محدود' : co.max_warehouses],
                ['التوثيق',       co.verified_at ? `✓ موثّق — ${new Date(co.verified_at).toLocaleDateString('ar-DZ')}` : 'غير موثّق'],
                ['تاريخ الإنشاء', new Date(co.created_at).toLocaleDateString('ar-DZ')],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--b2)' }}>
                  <span style={{ width: 120, fontSize: 12, color: 'var(--t4)', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {co.is_suspended && co.suspended_reason && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#ef44441a', borderRadius: 8, border: '1px solid #ef44441a' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>سبب التعليق</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>{co.suspended_reason}</div>
                </div>
              )}
            </div>
          )}

          {/* ── PLAN ── */}
          {tab === 'plan' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>الخطة</label>
                <select
                  value={planForm.plan}
                  onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13 }}
                >
                  {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                </select>
              </div>
              {[
                { key: 'max_users',      label: 'حد المستخدمين (0 = غير محدود)' },
                { key: 'max_products',   label: 'حد المنتجات' },
                { key: 'max_warehouses', label: 'حد المخازن' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input
                    type="number" min={0}
                    value={(planForm as any)[key]}
                    onChange={e => setPlanForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <Button
                variant="primary"
                loading={busy === 'plan'}
                onClick={() => run('plan', () => muts.changePlan.mutateAsync({ id: co.id, ...planForm }), 'تم تحديث الخطة')}
              >
                حفظ تغييرات الخطة
              </Button>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div>
              {/* إضافة مستخدم */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--t4)', display: 'block', marginBottom: 4 }}>بريد المستخدم أو ID</label>
                  <input
                    value={addEmail} onChange={e => setAddEmail(e.target.value)}
                    placeholder="user@example.com أو رقم"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--t4)', display: 'block', marginBottom: 4 }}>الدور</label>
                  <select value={addRole} onChange={e => setAddRole(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13 }}>
                    <option value="member">عضو</option>
                    <option value="admin">مسؤول</option>
                    <option value="owner">مالك</option>
                  </select>
                </div>
                <Button size="sm" variant="primary" loading={busy === 'addUser'}
                  onClick={async () => {
                    if (!addEmail) return;
                    setBusy('addUser');
                    try {
                      // البحث عن المستخدم بالبريد أو ID
                      const userId = parseInt(addEmail) || 0;
                      await adminApi.addCompanyUser(co.id, userId, addRole);
                      setAddEmail('');
                      refetchUsers();
                      setFlash({ ok: true, msg: 'تم إضافة المستخدم' });
                    } catch (e: any) {
                      setFlash({ ok: false, msg: e?.message ?? 'فشل الإضافة' });
                    } finally {
                      setBusy(null);
                    }
                  }}
                >إضافة</Button>
              </div>

              {usersLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <div>
                  {(usersData?.data ?? []).map((u: AdminUser) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--b2)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avGrad(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {initials(u.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
                      </div>
                      <Badge variant={u.active ? 'success' : 'gray'}>{u.active ? 'نشط' : 'معطل'}</Badge>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          title={u.active ? 'تعطيل' : 'تفعيل'}
                          onClick={() => muts.toggleUser.mutate({ companyId: co.id, userId: u.id })}
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--b2)', background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <i className={`ti ${u.active ? 'ti-user-off' : 'ti-user-check'}`} />
                        </button>
                        <button
                          title="إزالة من الشركة"
                          onClick={() => { if (confirm(`إزالة ${u.name} من الشركة؟`)) muts.removeUser.mutate({ companyId: co.id, userId: u.id }); }}
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #ef444433', background: '#ef44440d', cursor: 'pointer', color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <i className="ti ti-user-minus" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!usersData?.data || usersData.data.length === 0) && (
                    <div style={{ textAlign: 'center', color: 'var(--t4)', fontSize: 13, paddingTop: 24 }}>
                      <i className="ti ti-users" style={{ fontSize: 28, display: 'block', opacity: .3, marginBottom: 8 }} />
                      لا يوجد مستخدمون في هذه الشركة
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === 'notes' && (
            <div>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={10} placeholder="ملاحظات خاصة بهذه الشركة..."
                style={{ width: '100%', borderRadius: 8, border: '1px solid var(--b2)', padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg3)', color: 'var(--t1)', fontFamily: "'Tajawal', sans-serif" }}
              />
              <Button
                variant="primary" style={{ marginTop: 10 }}
                loading={busy === 'notes'}
                onClick={() => run('notes', () => muts.updateNotes.mutateAsync({ id: co.id, notes }), 'تم حفظ الملاحظات')}
              >
                حفظ الملاحظات
              </Button>
            </div>
          )}

          {/* ── ACTIONS ── */}
          {tab === 'actions' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {/* التعليق */}
              {!co.is_suspended ? (
                <div style={{ border: '1px solid var(--b2)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
                    <i className="ti ti-ban" style={{ color: '#ef4444', marginLeft: 6 }} />تعليق الشركة
                  </div>
                  <textarea
                    value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                    rows={2} placeholder="سبب التعليق (مطلوب)"
                    style={{ width: '100%', borderRadius: 8, border: '1px solid var(--b2)', padding: '8px 10px', fontSize: 12, resize: 'none', boxSizing: 'border-box', background: 'var(--bg3)', color: 'var(--t1)', fontFamily: "'Tajawal', sans-serif" }}
                  />
                  <Button
                    variant="danger" size="sm" style={{ marginTop: 8 }}
                    loading={busy === 'suspend'}
                    disabled={!suspendReason.trim()}
                    onClick={() => run('suspend', () => muts.suspend.mutateAsync({ id: co.id, reason: suspendReason }), 'تم تعليق الشركة')}
                  >
                    تعليق الشركة
                  </Button>
                </div>
              ) : (
                <ActionRow
                  icon="ti-player-play" label="رفع التعليق" color="#10b981"
                  desc="إعادة تفعيل الشركة وإلغاء التعليق"
                  loading={busy === 'unsuspend'}
                  onClick={() => run('unsuspend', () => muts.unsuspend.mutateAsync(co.id), 'تم رفع التعليق')}
                />
              )}

              {/* تفعيل / إيقاف */}
              <ActionRow
                icon={co.active ? 'ti-toggle-left' : 'ti-toggle-right'}
                label={co.active ? 'إيقاف الشركة' : 'تفعيل الشركة'}
                color={co.active ? '#f59e0b' : '#10b981'}
                desc={co.active ? 'إيقاف نشاط الشركة مؤقتاً' : 'إعادة تفعيل الشركة'}
                loading={busy === 'toggle'}
                onClick={() => run('toggle',
                  () => co.active
                    ? muts.deactivate.mutateAsync(co.id)
                    : muts.activate.mutateAsync(co.id),
                  co.active ? 'تم إيقاف الشركة' : 'تم تفعيل الشركة'
                )}
              />

              {/* التوثيق */}
              <ActionRow
                icon={co.verified_at ? 'ti-shield-x' : 'ti-shield-check'}
                label={co.verified_at ? 'إلغاء التوثيق' : 'توثيق الشركة'}
                color={co.verified_at ? '#6b7280' : '#0ea5e9'}
                desc={co.verified_at ? 'إلغاء الشارة الموثّقة' : 'منح الشركة شارة التوثيق'}
                loading={busy === 'verify'}
                onClick={() => run('verify',
                  () => co.verified_at
                    ? muts.unverify.mutateAsync(co.id)
                    : muts.verify.mutateAsync(co.id),
                  co.verified_at ? 'تم إلغاء التوثيق' : 'تم التوثيق'
                )}
              />

              {/* حذف */}
              <div style={{ border: '1px solid #ef444433', borderRadius: 10, padding: 14, background: '#ef44440a' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
                  <i className="ti ti-trash" style={{ marginLeft: 6 }} />منطقة الخطر
                </div>
                <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 10 }}>
                  حذف الشركة نهائياً مع جميع بياناتها. لا يمكن التراجع.
                </div>
                <Button
                  variant="danger" size="sm"
                  loading={busy === 'delete'}
                  onClick={() => {
                    if (confirm(`حذف شركة "${co.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                      run('delete', () => muts.deleteCompany.mutateAsync(co.id), 'تم حذف الشركة');
                    }
                  }}
                >
                  حذف الشركة نهائياً
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ActionRow helper ──────────────────────────────────────────
function ActionRow({ icon, label, desc, color, loading, onClick }: {
  icon: string; label: string; desc: string; color: string; loading?: boolean; onClick: () => void;
}) {
  return (
    <div style={{ border: '1px solid var(--b2)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 17, color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{desc}</div>
      </div>
      <Button size="sm" loading={loading} onClick={onClick}
        style={{ borderColor: color + '40', color, background: color + '0d' }}>
        تنفيذ
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminCompaniesPage() {
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 350);
  const [status, setStatus] = useState('');
  const [plan,   setPlan]   = useState('');
  const [page,   setPage]   = useState(1);
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  const params = useMemo(() => ({
    search: search || undefined,
    status: (status || undefined) as AdminCompaniesParams['status'],
    plan:   plan   || undefined,
    page, per_page: 20,
  }), [search, status, plan, page]);

  const { data, isLoading, isError, refetch } = useAdminCompanies(params);
  const companies = data?.data ?? [];
  const meta      = data?.meta;

  const closeDrawer = useCallback((refresh?: boolean) => {
    setSelected(null);
    if (refresh) refetch();
  }, [refetch]);

  return (
    <div>
      <PageHeader
        title="الشركات"
        subtitle={`${meta?.total ?? 0} شركة مسجّلة في المنصة`}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم، slug، بريد..."
        />
        <SelectInput
          options={[
            { label: 'كل الحالات',  value: '' },
            { label: 'نشطة',        value: 'active' },
            { label: 'موقوفة',      value: 'suspended' },
            { label: 'غير نشطة',   value: 'inactive' },
            { label: 'موثّقة',      value: 'verified' },
            { label: 'غير موثّقة', value: 'unverified' },
          ]}
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
        />
        <SelectInput
          options={[
            { label: 'كل الخطط', value: '' },
            ...PLANS.map(p => ({ label: PLAN_LABELS[p], value: p })),
          ]}
          value={plan}
          onChange={v => { setPlan(v); setPage(1); }}
        />
      </div>

      {isError && (
        <AlertBar variant="red" style={{ marginBottom: 12 }}>
          تعذّر تحميل البيانات.{' '}
          <button onClick={() => refetch()} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            إعادة المحاولة
          </button>
        </AlertBar>
      )}

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tw" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>الشركة</th>
                <th>المالك</th>
                <th>الخطة</th>
                <th>المستخدمون</th>
                <th>الحالة</th>
                <th>التوثيق</th>
                <th>الإنشاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center' }}>
                  <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
                </td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-building-off" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: .3 }} />
                  لا توجد شركات مطابقة
                </td></tr>
              ) : companies.map(co => {
                const st = statusOf(co);
                return (
                  <tr key={co.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: avGrad(co.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {initials(co.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 13 }}>{co.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>/{co.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{co.owner?.name ?? '—'}</td>
                    <td>
                      <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: (PLAN_COLORS[co.plan] ?? '#6b7280') + '1a', color: PLAN_COLORS[co.plan] ?? '#6b7280' }}>
                        {PLAN_LABELS[co.plan] ?? co.plan}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{co.users_count} / {co.max_users}</td>
                    <td><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td>
                      {co.verified_at
                        ? <span style={{ color: '#10b981', fontSize: 12 }}><i className="ti ti-shield-check" style={{ marginLeft: 4 }} />موثّق</span>
                        : <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--t4)' }}>{new Date(co.created_at).toLocaleDateString('ar-DZ')}</td>
                    <td>
                      <Button size="xs" onClick={() => setSelected(co)}>إدارة</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} شركة)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابقة</Button>
              <Button size="sm" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && <CompanyDrawer co={selected} onClose={closeDrawer} />}
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
// ════════════════════════════════════════════════
// pages/admin/AdminSettingsPage.tsx
// صفحة إعدادات النظام – تستخدم hooks و API
// ════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';

import type { SystemSettings } from '@/types/admin';

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SystemSettings>({
    queryKey: ['admin-settings'],
    queryFn: () => apiClient.get('/admin/settings').then(r => (r.data as any)?.data ?? r.data),
  });
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SystemSettings>) => apiClient.put('/admin/settings', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const maintenanceMutation = useMutation({
    mutationFn: (action: 'enable' | 'disable') =>
      apiClient.post(`/admin/maintenance/${action}`),
  });

  const cacheMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/maintenance/cache-clear'),
  });

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading || !settings) return <div style={{ padding: 40, textAlign: 'center' }}>جار التحميل...</div>;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <PageHeader title="إعدادات النظام" description="إدارة التكوين العام للمنصة" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title="الإعدادات العامة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sr">
              <div className="sr-l">تسجيل مستخدمين جدد</div>
              <Switch checked={settings.allow_registration} onChange={val => handleChange('allow_registration', val)} />
            </div>
            <div className="sr">
              <div className="sr-l">إنشاء شركات جديدة (عبر واجهة المستخدم)</div>
              <Switch checked={settings.allow_new_companies} onChange={val => handleChange('allow_new_companies', val)} />
            </div>
            <div className="sr">
              <div className="sr-l">وضع التصحيح (Debug)</div>
              <Switch checked={settings.debug_mode} onChange={val => handleChange('debug_mode', val)} />
            </div>
            <div className="sr">
              <div className="sr-l">API العام (غير مصادق)</div>
              <Switch checked={settings.public_api} onChange={val => handleChange('public_api', val)} />
            </div>
          </div>
        </Card>

        <Card title="الحدود الافتراضية للخطط">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="fg">
              <label>مدة التجربة (أيام)</label>
              <input type="number" value={settings.free_trial_days} onChange={e => handleChange('free_trial_days', Number(e.target.value))} min={1} max={90} />
            </div>
            <div className="fg">
              <label>حد المستخدمين – خطة مجانية</label>
              <input type="number" value={settings.free_max_users} onChange={e => handleChange('free_max_users', Number(e.target.value))} min={1} />
            </div>
            <div className="fg">
              <label>حد المنتجات – خطة Starter</label>
              <input type="number" value={settings.starter_max_products} onChange={e => handleChange('starter_max_products', Number(e.target.value))} min={100} />
            </div>
          </div>
        </Card>

        <Card title="وضع الصيانة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Switch
              checked={settings.maintenance_mode}
              onChange={val => {
                handleChange('maintenance_mode', val);
                maintenanceMutation.mutate(val ? 'enable' : 'disable');
              }}
              label="تفعيل وضع الصيانة (جميع المستخدمين العاديين سيرون صفحة الصيانة)"
            />
            {settings.maintenance_mode && (
              <div className="fg">
                <label>رسالة الصيانة (اختياري)</label>
                <textarea
                  value={settings.maintenance_message}
                  onChange={e => handleChange('maintenance_message', e.target.value)}
                  rows={2}
                  placeholder="سيتم العرض للمستخدمين..."
                />
              </div>
            )}
          </div>
        </Card>

        <Card title="منطقة الخطر">
          <AlertBar variant="red">
            هذه الإجراءات لا يمكن التراجع عنها. يُنصح بأخذ نسخة احتياطية أولاً.
          </AlertBar>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <Button variant="danger" onClick={() => { if (confirm('مسح كامل الكاش؟')) cacheMutation.mutate(); }} loading={cacheMutation.isPending}>مسح الكاش</Button>
            <Button variant="danger" onClick={() => { if (confirm('إعادة تشغيل المهام المجدولة؟')) adminApi.runScheduler(); }}>تشغيل المهام</Button>
            <Button variant="danger" onClick={() => { if (confirm('تصدير آخر نسخة احتياطية؟')) adminApi.exportBackup(); }}>نسخ احتياطي</Button>
          </div>
        </Card>

        {updateMutation.isPending && <div style={{ textAlign: 'center', padding: 8 }}>جاري الحفظ...</div>}
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/admin/AdminUsersPage.tsx
```
// pages/admin/AdminUsersPage.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import type { AdminUser } from '@/types/admin';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import SelectInput from '@/components/forms/SelectInput';

export default function AdminUsersPage() {
  const [search, setSearch]       = useState('');
  const [role, setRole]           = useState('');
  const [active, setActive]       = useState('');
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState<AdminUser | null>(null);
  const [pwd, setPwd]             = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const params = useMemo(() => ({
    search:   search   || undefined,
    role:     role     || undefined,
    active:   active   || undefined,
    page,
    per_page: 20,
  }), [search, role, active, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn:  () => apiClient.get('/admin/users', { params }).then(r => (r.data as any)?.data ?? r.data),
    staleTime: 60_000,
  });

  // ✅ client.ts → extractData يُرجع { data: [...], meta: {...} } مباشرة
  // AdminUserController::index يُرجع LengthAwarePaginator داخل successResponse
  // Laravel يُحوّله إلى { data:[...], meta:{...}, links:{...} }
  // بعد extractData في client تصبح: { data:[...], meta:{...} }
  const users = data?.data ?? [];
  const meta  = data?.meta;

  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const muts = {
    resetPassword: useMutation({
      mutationFn: ({ id, password, password_confirmation }: { id: number; password: string; password_confirmation: string }) =>
        apiClient.post(`/admin/users/${id}/reset-password`, { password, password_confirmation }),
    }),
    toggleActive: useMutation({
      mutationFn: (id: number) => apiClient.post(`/admin/users/${id}/toggle-active`),
      onSuccess: inv,
    }),
    impersonate: useMutation({
      mutationFn: (id: number) => apiClient.post(`/admin/impersonate/${id}`).then(r => r.data),
    }),
    create: useMutation({
      mutationFn: (data: Partial<AdminUser>) => apiClient.post('/admin/users', data),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: number) => apiClient.delete(`/admin/users/${id}`),
      onSuccess: inv,
    }),
  };

  const handleResetPassword = async () => {
    if (!selected) return;
    if (pwd !== pwdConfirm) { alert('كلمتا المرور غير متطابقتين'); return; }
    if (pwd.length < 8)     { alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    await muts.resetPassword.mutateAsync({ id: selected.id, password: pwd, password_confirmation: pwdConfirm });
    setPwd('');
    setPwdConfirm('');
    alert('تم تغيير كلمة المرور وإلغاء جميع الجلسات');
  };

  const handleImpersonate = async () => {
    if (!selected) return;
    const res = await muts.impersonate.mutateAsync(selected.id) as any;
    // ✅ token يأتي من res.token (بعد extractData يُرجع data مباشرة)
    const token = res?.token ?? res?.data?.token;
    if (token) {
      localStorage.setItem('auth_token', token);
      window.location.href = '/dashboard';
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--t2)' }}>
      <i className="ti ti-wifi-off" style={{ fontSize: 36, display: 'block', marginBottom: 12, opacity: .4 }} />
      <p style={{ fontSize: 14, margin: '0 0 12px' }}>تعذّر تحميل المستخدمين</p>
      <Button onClick={() => refetch()}>إعادة المحاولة</Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        subtitle={`${meta?.total ?? 0} مستخدم في المنصة`}
      />

      {/* ── فلاتر ──────────────────────────────────────────────────────────── */}
      <div className="filters" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو البريد"
        />
        <SelectInput
          options={[
            { label: 'كل الأدوار',   value: '' },
            { label: 'Super Admin',  value: 'super_admin' },
            { label: 'Admin',        value: 'admin' },
            { label: 'مستخدم',       value: 'user' },
          ]}
          value={role}
          onChange={(v) => { setRole(v); setPage(1); }}
        />
        <SelectInput
          options={[
            { label: 'كل الحالات', value: '' },
            { label: 'نشط',        value: '1' },
            { label: 'معطل',       value: '0' },
          ]}
          value={active}
          onChange={(v) => { setActive(v); setPage(1); }}
        />
      </div>

      {/* ── الجدول ────────────────────────────────────────────────────────── */}
      <Card padding={0}>
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)' }}>
            <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: .3 }} />
            <p style={{ margin: 0, fontSize: 13 }}>لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tw" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الدور</th>
                  <th>الشركات</th>
                  <th>الحالة</th>
                  <th>تاريخ الإنشاء</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong style={{ display: 'block', fontSize: 13 }}>{u.name}</strong>
                      <small style={{ color: 'var(--t3)', fontSize: 11 }}>{u.email}</small>
                    </td>
                    <td>
                      <Badge variant={
                        u.role === 'super_admin' ? 'danger' :
                        u.role === 'admin'       ? 'info'   : 'gray'
                      }>
                        {u.role}
                      </Badge>
                    </td>
                    <td>{u.companies_count ?? 0}</td>
                    <td>
                      <Badge variant={u.active ? 'success' : 'gray'}>
                        {u.active ? 'نشط' : 'معطل'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--t3)' }}>
                      {new Date(u.created_at).toLocaleDateString('ar-DZ')}
                    </td>
                    <td>
                      <Button
                        size="xs"
                        onClick={() => { setSelected(u); setDetailOpen(true); }}
                      >
                        إدارة
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {meta && meta.last_page > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10,
          }}>
            <Button
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              السابقة
            </Button>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>
              {page} / {meta.last_page}
              <span style={{ fontSize: 11, color: 'var(--t3)', marginRight: 6 }}>
                ({meta.total} مستخدم)
              </span>
            </span>
            <Button
              size="sm"
              disabled={page === meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              التالية
            </Button>
          </div>
        )}
      </Card>

      {/* ── Drawer تفاصيل المستخدم ────────────────────────────────────────── */}
      <Modal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); }}
        title={selected?.name ?? ''}
        size="md"
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* معلومات */}
            <div style={{
              background: 'var(--bg1)', borderRadius: 10, padding: '12px 16px',
              fontSize: 13, display: 'grid', gap: 6,
            }}>
              <div><span style={{ color: 'var(--t3)' }}>البريد: </span>{selected.email}</div>
              <div><span style={{ color: 'var(--t3)' }}>الدور: </span>{selected.role}</div>
              <div><span style={{ color: 'var(--t3)' }}>الشركات: </span>{selected.companies_count ?? 0}</div>
              <div>
                <span style={{ color: 'var(--t3)' }}>الحالة: </span>
                <Badge variant={selected.active ? 'success' : 'gray'}>
                  {selected.active ? 'نشط' : 'معطل'}
                </Badge>
              </div>
            </div>

            {/* إجراءات */}
            <Button
              variant={selected.active ? 'danger' : 'primary'}
              onClick={() => muts.toggleActive.mutate(selected.id)}
              disabled={muts.toggleActive.isPending}
            >
              {selected.active ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
            </Button>

            <Button
              variant="secondary"
              onClick={handleImpersonate}
              disabled={muts.impersonate.isPending}
            >
              دخول كهذا المستخدم
            </Button>

            {/* إعادة تعيين كلمة المرور */}
            <div style={{ borderTop: '1px solid var(--b2)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--t2)' }}>
                إعادة تعيين كلمة المرور
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--b2)', fontSize: 13 }}
                />
                <input
                  type="password"
                  placeholder="تأكيد كلمة المرور"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--b2)', fontSize: 13 }}
                />
                <Button
                  onClick={handleResetPassword}
                  disabled={!pwd || muts.resetPassword.isPending}
                >
                  تغيير كلمة المرور
                </Button>
              </div>
            </div>

            {/* حذف */}
            <div style={{ borderTop: '1px solid var(--b2)', paddingTop: 12 }}>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`هل تريد حذف المستخدم "${selected.name}" نهائياً؟`)) {
                    muts.deleteUser.mutate(selected.id);
                    setDetailOpen(false);
                  }
                }}
                disabled={muts.deleteUser.isPending}
              >
                حذف المستخدم نهائياً
              </Button>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
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

