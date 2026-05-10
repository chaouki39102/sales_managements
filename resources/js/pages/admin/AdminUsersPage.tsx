// pages/admin/AdminUsersPage.tsx
import { useState, useMemo } from 'react';
import { useAdminUsers, useAdminUserMutations } from '@/hooks/useAdmin';
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

  const { data, isLoading, isError, refetch } = useAdminUsers(params);

  // ✅ client.ts → extractData يُرجع { data: [...], meta: {...} } مباشرة
  // AdminUserController::index يُرجع LengthAwarePaginator داخل successResponse
  // Laravel يُحوّله إلى { data:[...], meta:{...}, links:{...} }
  // بعد extractData في client تصبح: { data:[...], meta:{...} }
  const users = data?.data ?? [];
  const meta  = data?.meta;

  const muts = useAdminUserMutations();

  const handleResetPassword = async () => {
    if (!selected) return;
    if (pwd !== pwdConfirm) { alert('كلمتا المرور غير متطابقتين'); return; }
    if (pwd.length < 8)     { alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    await muts.resetPassword.mutateAsync({
      id: selected.id,
      password: pwd,
      password_confirmation: pwdConfirm,
    });
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
