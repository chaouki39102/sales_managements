// pages/users/UsersPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader   from '@/components/ui/PageHeader';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import Avatar       from '@/components/ui/Avatar';
import apiClient    from '@/lib/api/client';
import type { User, Role } from '@/types';

const PERMISSIONS_MATRIX = [
  { label: 'POS — البيع',          roles: [true, false, true, true]  },
  { label: 'الفواتير',              roles: [true, true,  true, false] },
  { label: 'المنتجات والمخزون',    roles: [true, true,  false, false] },
  { label: 'الخزينة',              roles: [true, true,  false, false] },
  { label: 'TVA والجبايات',        roles: [true, true,  false, false] },
  { label: 'التقارير',             roles: [true, true,  false, false] },
  { label: 'إدارة المستخدمين',     roles: [true, false, false, false] },
  { label: 'الإعدادات',            roles: [true, false, false, false] },
];

const ROLE_LABELS = ['مدير النظام', 'محاسب', 'أمين الصندوق', 'بائع'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const modal = useModal();
  const qc    = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn:  () => apiClient.get<{ data: User[] }>('/users', { params: { search } }).then(r => r.data.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn:  () => apiClient.get<{ data: Role[] }>('/roles').then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const toggleActive = useMutation({
    mutationFn: (user: User) => apiClient.put(`/users/${user.id}`, { active: !user.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreate = () => { setEditing(null); modal.openModal(); };
  const openEdit   = (u: User) => { setEditing(u); modal.openModal(); };

  return (
    <div className="page on" id="p-users">
      <PageHeader
        title="المستخدمون"
        subtitle="إدارة الصلاحيات والوصول"
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus"/>} onClick={openCreate}>
            مستخدم جديد
          </Button>
        }
      />

      <div className="g2">
        {/* Users table */}
        <Card
          title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-users"/></span> المستخدمون</>}
        >
          <div className="filters" style={{ marginBottom: 12 }}>
            <div className="srch" style={{ display: 'flex', flex: 1 }}>
              <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
              <input type="text" placeholder="ابحث عن مستخدم..." style={{ width: 200 }} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الدور</th>
                <th>آخر دخول</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)' }}>جاري التحميل...</td></tr>
              ) : (users ?? []).map((u, i) => {
                const roleColor = ['purple', 'info', 'warning', 'teal'][i % 4] as Parameters<typeof Badge>[0]['variant'];
                return (
                  <tr key={u.id} onClick={() => openEdit(u)}>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Avatar initials={u.name[0]} color={((i % 7) + 1) as 1|2|3|4|5|6|7} size={30} />
                        <div>
                          <div className="s">{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge variant={roleColor}>{u.roles?.[0]?.display_name ?? u.role ?? '—'}</Badge></td>
                    <td style={{ fontSize: 12, color: 'var(--t4)' }}>—</td>
                    <td><Badge variant={u.active ? 'success' : 'danger'}>{u.active ? 'نشط' : 'موقوف'}</Badge></td>
                    <td onClick={e => e.stopPropagation()}>
                      <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(u)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Permissions matrix */}
        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-lock"/></span> مصفوفة الصلاحيات</>}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, color: 'var(--t4)', background: 'var(--bg3)', borderLeft: '1px solid var(--b2)', minWidth: 160 }}>
                    الوظيفة
                  </th>
                  {ROLE_LABELS.map(r => (
                    <th key={r} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, color: 'var(--t4)', background: 'var(--bg3)', borderLeft: '1px solid var(--b2)', whiteSpace: 'nowrap' }}>
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS_MATRIX.map(({ label, roles }, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--t2)', borderBottom: '1px solid var(--b1)', borderLeft: '1px solid var(--b2)' }}>
                      {label}
                    </td>
                    {roles.map((has, j) => (
                      <td key={j} className="pt-cell" style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '1px solid var(--b1)', borderLeft: '1px solid var(--b1)' }}>
                        {has ? (
                          <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                        ) : (
                          <span style={{ color: 'var(--t4)', fontSize: 13 }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <UserModal open={modal.open} user={editing} roles={roles ?? []} onClose={modal.closeModal} />
    </div>
  );
}

function UserModal({ open, user, roles, onClose }: {
  open: boolean; user: User | null; roles: Role[]; onClose: () => void;
}) {
  const isEdit = !!user;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name:     user?.name  ?? '',
    email:    user?.email ?? '',
    password: '',
    confirm:  '',
    role:     user?.roles?.[0]?.name ?? '',
    active:   user?.active ?? true,
  });

  const saveMut = useMutation({
    mutationFn: (data: typeof form) => isEdit
      ? apiClient.put(`/users/${user!.id}`, data)
      : apiClient.post('/auth/register', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });

  const passError = !isEdit && form.password !== form.confirm && form.confirm.length > 0;

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? `تعديل — ${user!.name}` : 'مستخدم جديد'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
            onClick={() => saveMut.mutate(form)}
            disabled={saveMut.isPending || !form.name || !form.email || passError}>
            {saveMut.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      <div className="fgrid">
        <div className="fg">
          <label className="req">الاسم الكامل</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="الاسم واللقب" />
        </div>
        <div className="fg">
          <label className="req">البريد الإلكتروني</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com" />
        </div>
        <div className="fg">
          <label className={!isEdit ? 'req' : ''}>كلمة المرور</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={isEdit ? 'اتركه فارغاً للإبقاء' : '••••••••'} />
        </div>
        <div className="fg">
          <label className={!isEdit ? 'req' : ''}>تأكيد المرور</label>
          <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••"
            style={passError ? { borderColor: 'var(--red)' } : {}} />
          {passError && <span style={{ fontSize: 11, color: 'var(--red)' }}>كلمتا المرور غير متطابقتين</span>}
        </div>
        <div className="fg">
          <label>الدور</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="">— اختر —</option>
            {roles.map(r => <option key={r.id} value={r.name}>{r.display_name ?? r.name}</option>)}
          </select>
        </div>
        <div className="fg" style={{ justifyContent: 'flex-end' }}>
          <label>الحالة</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div className={`sw ${form.active ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, active: !f.active }))} />
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>{form.active ? 'نشط' : 'موقوف'}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
