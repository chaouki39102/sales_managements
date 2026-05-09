// ════════════════════════════════════════════════
// pages/admin/AdminUsersPage.tsx
// إدارة كل مستخدمي النظام بدون سياق شركة
// ════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useAdminUsers, useAdminUserMutations } from '@/hooks/useAdmin';
import { adminApi } from '@/lib/api/admin';
import type { AdminUser } from '@/lib/api/admin';

// ── User Drawer ──────────────────────────────────────────────────────
function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const muts = useAdminUserMutations();
  const [tab, setTab] = useState<'info' | 'password' | 'companies'>('info');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [userCompanies, setUserCompanies] = useState<any[]>([]);
  const [loadingCos, setLoadingCos] = useState(false);

  const loadCompanies = async () => {
    setLoadingCos(true);
    try {
      const data = await adminApi.getUserCompanies(user.id);
      setUserCompanies(Array.isArray(data) ? data : (data as any)?.data ?? []);
    } catch {}
    setLoadingCos(false);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
    borderBottom: active ? '2px solid var(--em)' : '2px solid transparent',
    background: 'transparent', color: active ? 'var(--em)' : 'var(--tx1)',
    fontWeight: active ? 600 : 400,
  });

  const handlePasswordReset = async () => {
    if (pwd.length < 8) return alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (pwd !== pwdConfirm) return alert('كلمتا المرور غير متطابقتين');
    await muts.resetPassword.mutateAsync({ id: user.id, password: pwd, password_confirmation: pwdConfirm });
    setPwd(''); setPwdConfirm('');
    alert('تم تغيير كلمة المرور وإلغاء جميع الجلسات');
  };

  const handleImpersonate = async () => {
    if (!confirm(`ستدخل النظام كـ "${user.name}". هل أنت متأكد؟`)) return;
    const res = await muts.impersonate.mutateAsync(user.id);
    // حفظ token الانتحال واستخدامه
    localStorage.setItem('auth_token', res.token);
    window.location.href = '/dashboard';
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.4)', direction: 'rtl' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 440, background: 'var(--bg1)', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,.15)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--em-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'var(--em)',
            }}>{user.name[0]}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx0)' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--tx2)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--bd0)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => { muts.toggleActive.mutate(user.id); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
              border: '1px solid', borderColor: user.active ? '#ef444433' : '#10b98133',
              background: user.active ? '#ef44440d' : '#10b9810d',
              color: user.active ? '#ef4444' : '#10b981', cursor: 'pointer', fontSize: 12,
            }}
          >
            <i className={`ti ${user.active ? 'ti-user-off' : 'ti-user-check'}`} style={{ fontSize: 14 }} />
            {user.active ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
          </button>

          <button
            onClick={handleImpersonate}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
              border: '1px solid #8b5cf633', background: '#8b5cf60d', color: '#8b5cf6',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            <i className="ti ti-user-search" style={{ fontSize: 14 }} />
            دخول كهذا المستخدم
          </button>

          <button
            onClick={() => { if (confirm('تأكيد حذف المستخدم؟')) { muts.deleteUser.mutate(user.id); onClose(); } }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
              border: '1px solid #ef444433', background: '#ef44440d', color: '#ef4444',
              cursor: 'pointer', fontSize: 12,
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 14 }} />
            حذف
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bd0)', padding: '0 12px' }}>
          <button style={tabStyle(tab === 'info')} onClick={() => setTab('info')}>المعلومات</button>
          <button style={tabStyle(tab === 'password')} onClick={() => setTab('password')}>كلمة المرور</button>
          <button style={tabStyle(tab === 'companies')} onClick={() => { setTab('companies'); loadCompanies(); }}>الشركات</button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

          {/* INFO */}
          {tab === 'info' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['الاسم', user.name],
                ['البريد الإلكتروني', user.email],
                ['الدور', user.role],
                ['الحالة', user.active ? '✓ نشط' : '✗ معطل'],
                ['الشركات', `${user.companies_count ?? 0} شركة`],
                ['تاريخ الإنشاء', new Date(user.created_at).toLocaleDateString('ar-DZ')],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--bd0)' }}>
                  <span style={{ width: 160, fontSize: 12, color: 'var(--tx2)', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--tx0)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* PASSWORD */}
          {tab === 'password' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f59e0b1a', fontSize: 12, color: '#f59e0b' }}>
                <i className="ti ti-alert-triangle" style={{ marginLeft: 6 }} />
                تغيير كلمة المرور سيُلغي جميع جلسات المستخدم الحالية
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6 }}>كلمة المرور الجديدة</label>
                <input
                  type="password" value={pwd} onChange={e => setPwd(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6 }}>تأكيد كلمة المرور</label>
                <input
                  type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={handlePasswordReset}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--em)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                تغيير كلمة المرور
              </button>
            </div>
          )}

          {/* COMPANIES */}
          {tab === 'companies' && (
            <div>
              {loadingCos ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : userCompanies.length > 0 ? userCompanies.map((co: any) => (
                <div key={co.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--bd0)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: 'var(--em-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--em)', flexShrink: 0,
                  }}>{co.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx0)' }}>{co.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{co.pivot?.role ?? 'member'}</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: 'var(--tx2)', fontSize: 13, paddingTop: 24 }}>
                  هذا المستخدم غير منتسب لأي شركة
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [search, setSearch]     = useState('');
  const [role,   setRole]       = useState('');
  const [active, setActive]     = useState('');
  const [page,   setPage]       = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const params = useMemo(() => ({
    search: search  || undefined,
    role:   role    || undefined,
    active: active  || undefined,
    page,
    per_page: 20,
  }), [search, role, active, page]);

  const { data, isLoading } = useAdminUsers(params);
  const users = data?.data ?? [];
  const meta  = data?.meta;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx0)', margin: 0 }}>المستخدمون</h1>
        <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>
          {meta?.total ?? 0} مستخدم في المنصة
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="بحث بالاسم أو البريد..."
          style={{ flex: '1 1 220px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}
        />
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}>
          <option value="">كل الأدوار</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="user">مستخدم عادي</option>
        </select>
        <select value={active} onChange={e => { setActive(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}>
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">معطل</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd0)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg0)' }}>
                {['المستخدم', 'الدور', 'الشركات', 'الحالة', 'تاريخ الإنشاء', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--tx2)', fontWeight: 500, borderBottom: '1px solid var(--bd0)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--bd0)', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg0)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--em-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'var(--em)', flexShrink: 0,
                      }}>{u.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--tx0)' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                      background: u.role === 'super_admin' ? '#ef44441a' : '#6366f11a',
                      color: u.role === 'super_admin' ? '#ef4444' : '#6366f1',
                    }}>
                      {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'مستخدم'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--tx1)' }}>{u.companies_count ?? 0}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 600,
                      background: u.active ? '#10b9811a' : '#6b72801a',
                      color: u.active ? '#10b981' : '#6b7280',
                    }}>{u.active ? 'نشط' : 'معطل'}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--tx2)', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString('ar-DZ')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => setSelected(u)}
                      style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--tx1)' }}
                    >
                      إدارة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {users.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)', fontSize: 14 }}>
            <i className="ti ti-users-off" style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: .4 }} />
            لا توجد نتائج
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', cursor: 'pointer', fontSize: 13, color: 'var(--tx1)' }}>←</button>
          <span style={{ padding: '6px 16px', fontSize: 13, color: 'var(--tx1)' }}>{page} / {meta.last_page}</span>
          <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', cursor: 'pointer', fontSize: 13, color: 'var(--tx1)' }}>→</button>
        </div>
      )}

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
