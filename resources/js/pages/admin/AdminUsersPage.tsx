// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminUsersPage.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   • muts.deleteUser → غير موجود في useUserMutations
//     الصواب: muts.remove (المعرّف في hooks/admin/useAdminUsers.ts)
//   • ROLES كانت strings مكررة بدل استخدام constants/roles.ts
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useAdminUsers } from '@/hooks/admin';
import { useDebounce } from '@/hooks/useDebounce';
import UserDrawer from '@/components/admin/UserDrawer';
import {
  Avatar, StatusBadge, EmptyState, Spinner, fmtDate,
} from '@/components/admin/shared';
import PageHeader    from '@/components/ui/PageHeader';
import Card          from '@/components/ui/Card';
import Button        from '@/components/ui/Button';
import SearchInput   from '@/components/ui/SearchInput';
import type { AdminUser, AdminUsersFilter } from '@/types/admin';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '@/constants/roles';  // ✅ من constants/roles.ts

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return <span style={{ fontSize: 11, color: 'var(--t4)' }}>user</span>;

  const color = ROLE_COLORS[role as keyof typeof ROLE_COLORS] ?? '#6b7280';
  const label = ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: color + '22', color,
    }}>
      {label}
    </span>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

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
      <PageHeader
        title="المستخدمون"
        description={`${meta?.total ?? 0} مستخدم في المنصة`}
      />

      {/* ── فلاتر ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو البريد..."
          style={{ flex: 1, minWidth: 200 }}
        />

        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="">كل الأدوار</option>
          <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
          <option value={ROLES.ADMIN}>Admin</option>
          <option value={ROLES.MANAGER}>Manager</option>
          <option value={ROLES.CASHIER}>Cashier</option>
        </select>

        <select
          value={active}
          onChange={e => { setActive(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">معطل</option>
        </select>
      </div>

      {isError && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, borderRadius: 8,
          background: '#ef44441a', color: '#ef4444', fontSize: 13,
        }}>
          تعذّر التحميل.{' '}
          <button
            onClick={() => refetch()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'inherit', textDecoration: 'underline',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── الجدول ──────────────────────────────────────────────────────────── */}
      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
                {['المستخدم', 'الدور', 'الشركات', 'آخر دخول', 'الحالة', 'الإنشاء', ''].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px', textAlign: 'right',
                      fontSize: 11, fontWeight: 800, color: 'var(--t4)',
                      letterSpacing: .4, textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40 }}><Spinner /></td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40 }}>
                    <EmptyState icon="ti-users" text="لا يوجد مستخدمون" />
                  </td>
                </tr>
              ) : users.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  style={{
                    borderBottom: '1px solid var(--b1)',
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'
                  }
                  onMouseLeave={e =>
                    (e.currentTarget as HTMLElement).style.background = ''
                  }
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar id={u.id} name={u.name} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>
                    {u.companies_count ?? 0}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>
                    {fmtDate(u.last_login_at)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge active={u.active} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>
                    {fmtDate(u.created_at)}
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
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
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

      {/* ── Drawer ──────────────────────────────────────────────────────────── */}
      {selected && (
        <UserDrawer
          user={selected}
          onClose={refresh => {
            setSelected(null);
            if (refresh) refetch();
          }}
        />
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid var(--b2)',
  background: 'var(--bg3)', color: 'var(--t2)',
  fontSize: 12, fontFamily: 'Tajawal, sans-serif',
  cursor: 'pointer',
};
