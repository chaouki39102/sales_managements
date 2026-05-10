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
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const params = useMemo(() => ({ search: search || undefined, role: role || undefined, active: active || undefined, page, per_page: 20 }), [search, role, active, page]);
  const { data, isLoading, refetch } = useAdminUsers(params);
  const users = data?.data ?? [];
  const meta = data?.meta;
  const muts = useAdminUserMutations();

  const handleResetPassword = async () => {
    if (pwd !== pwdConfirm) return alert('كلمتا المرور غير متطابقتين');
    if (!selected) return;
    await muts.resetPassword.mutateAsync({ id: selected.id, password: pwd, password_confirmation: pwdConfirm });
    setPwd('');
    setPwdConfirm('');
    alert('تم تغيير كلمة المرور');
  };

  const handleImpersonate = async () => {
    if (!selected) return;
    const res = await muts.impersonate.mutateAsync(selected.id);
    localStorage.setItem('auth_token', res.token);
    window.location.href = '/dashboard';
  };

  return (
    <div>
      <PageHeader title="المستخدمون" subtitle={`${meta?.total ?? 0} مستخدم في المنصة`} />
      <div className="filters">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو البريد" />
        <SelectInput options={[
          { label: 'كل الأدوار', value: '' },
          { label: 'Super Admin', value: 'super_admin' },
          { label: 'Admin', value: 'admin' },
          { label: 'مستخدم', value: 'user' },
        ]} value={role} onChange={setRole} />
        <SelectInput options={[{ label: 'كل الحالات', value: '' }, { label: 'نشط', value: '1' }, { label: 'معطل', value: '0' }]} value={active} onChange={setActive} />
        <Button onClick={() => setPage(1)}>تطبيق</Button>
      </div>

      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tw">
            <thead>
              <tr><th>المستخدم</th><th>الدور</th><th>الشركات</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong><br /><small>{u.email}</small></td>
                  <td><Badge variant={u.role === 'super_admin' ? 'danger' : u.role === 'admin' ? 'info' : 'gray'}>{u.role}</Badge></td>
                  <td>{u.companies_count ?? 0}</td>
                  <td><Badge variant={u.active ? 'success' : 'gray'}>{u.active ? 'نشط' : 'معطل'}</Badge></td>
                  <td><Button size="xs" onClick={() => { setSelected(u); setDetailOpen(true); }}>إدارة</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابقة</Button>
            <span>{page} / {meta.last_page}</span>
            <Button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
          </div>
        )}
      </Card>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.name ?? ''} size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Button variant="danger" onClick={() => muts.toggleActive.mutate(selected.id)}>
              {selected.active ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
            </Button>
            <Button variant="primary" onClick={handleImpersonate}>دخول كهذا المستخدم</Button>
            <div><label>كلمة مرور جديدة</label><input type="password" value={pwd} onChange={e => setPwd(e.target.value)} /></div>
            <div><label>تأكيد</label><input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} /></div>
            <Button onClick={handleResetPassword}>تغيير كلمة المرور</Button>
            <Button variant="danger" onClick={() => { if (confirm('حذف نهائي؟')) muts.deleteUser.mutate(selected.id); setDetailOpen(false); }}>حذف المستخدم</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
