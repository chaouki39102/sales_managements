// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminCompaniesPage.tsx  ← النسخة النظيفة
//
// التغييرات:
//   • الصفحة نظيفة — تستخدم CompanyDrawer من components/admin/CompanyDrawer
//   • PLANS وPLAN_COLORS مُحدَّدة مرة واحدة هنا
//   • لا منطق أعمال مباشر في الصفحة
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useAdminCompanies } from '@/hooks/admin';
import { useDebounce }       from '@/hooks/useDebounce';
import CompanyDrawer         from '@/components/admin/CompanyDrawer';
import {
  Avatar, StatusBadge, EmptyState, Spinner, fmtDate,
} from '@/components/admin/shared';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Button      from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import type { AdminCompany, AdminCompaniesFilter } from '@/types/admin';

// ─── Plan display ─────────────────────────────────────────────────────────────

const PLANS: Record<string, string> = {
  free:         'مجاني',
  starter:      'مبتدئ',
  professional: 'احترافي',
  enterprise:   'مؤسسة',
  custom:       'مخصص',
};

const PLAN_COLORS: Record<string, string> = {
  free:         '#6b7280',
  starter:      '#6366f1',
  professional: '#0ea5e9',
  enterprise:   '#f59e0b',
  custom:       '#8b5cf6',
};

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({
  col,
  active,
  dir,
}: {
  col: string;
  active: string;
  dir: 'asc' | 'desc';
}) {
  if (col !== active) {
    return <i className="ti ti-selector" style={{ fontSize: 11, opacity: .3 }} />;
  }
  return (
    <i
      className={`ti ti-sort-${dir === 'asc' ? 'ascending' : 'descending'}`}
      style={{ fontSize: 11 }}
    />
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

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

  // ── جدول الأعمدة ──────────────────────────────────────────────────────────
  const columns = [
    { label: 'الشركة',     col: 'name'        as typeof sortBy | null },
    { label: 'الخطة',      col: null },
    { label: 'المستخدمون', col: 'users_count' as typeof sortBy | null },
    { label: 'الحالة',     col: null },
    { label: 'الإنشاء',    col: 'created_at'  as typeof sortBy | null },
    { label: '',           col: null },
  ];

  return (
    <div>
      <PageHeader
        title="الشركات"
        description={`${meta?.total ?? 0} شركة في المنصة`}
        actions={
          <Button
            variant="primary"
            icon={<i className="ti ti-refresh" />}
            onClick={() => refetch()}
          >
            تحديث
          </Button>
        }
      />

      {/* ── فلاتر ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو البريد..."
          style={{ flex: 1, minWidth: 200 }}
        />

        {(([
          { val: '',           label: 'كل الحالات' },
          { val: 'active',     label: 'نشطة' },
          { val: 'suspended',  label: 'موقوفة' },
          { val: 'inactive',   label: 'غير نشطة' },
          { val: 'verified',   label: 'موثّقة' },
          { val: 'unverified', label: 'غير موثقة' },
        ] as { val: typeof status; label: string }[])).map(opt => (
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
          >
            {opt.label}
          </button>
        ))}

        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          style={{
            padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--b2)', background: 'var(--bg3)',
            color: 'var(--t2)', fontSize: 12, fontFamily: 'Tajawal, sans-serif',
          }}
        >
          <option value="">كل الخطط</option>
          {Object.entries(PLANS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* ── الجدول ──────────────────────────────────────────────────────────── */}
      <Card padding={0}>
        {isError && (
          <div style={{
            padding: '12px 16px', background: '#ef44441a',
            color: '#ef4444', fontSize: 13,
          }}>
            تعذّر تحميل البيانات.{' '}
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

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
                {columns.map((th, i) => (
                  <th
                    key={i}
                    onClick={() => th.col && toggleSort(th.col)}
                    style={{
                      padding: '10px 14px', textAlign: 'right',
                      fontSize: 11, fontWeight: 800, color: 'var(--t4)',
                      letterSpacing: .4, textTransform: 'uppercase',
                      cursor: th.col ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {th.label}
                      {th.col && (
                        <SortIcon col={th.col} active={sortBy} dir={sortDir} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40 }}><Spinner /></td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40 }}>
                    <EmptyState icon="ti-building-off" text="لا توجد شركات" />
                  </td>
                </tr>
              ) : companies.map(co => (
                <tr
                  key={co.id}
                  onClick={() => setSelected(co)}
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
                  {/* الشركة */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar id={co.id} name={co.name} size={32} radius={9} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                          {co.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                          /{co.slug}
                          {co.owner && ` · ${co.owner.name}`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* الخطة */}
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 99,
                      background: (PLAN_COLORS[co.plan] || '#6b7280') + '22',
                      color: PLAN_COLORS[co.plan] || '#6b7280',
                    }}>
                      {PLANS[co.plan] ?? co.plan}
                    </span>
                  </td>

                  {/* المستخدمون */}
                  <td style={{
                    padding: '10px 14px', fontSize: 13,
                    color: 'var(--t2)', fontWeight: 600,
                  }}>
                    {co.users_count}
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>
                      / {co.max_users || '∞'}
                    </span>
                  </td>

                  {/* الحالة */}
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge active={co.active} suspended={co.is_suspended} />
                    {co.verified_at && (
                      <i
                        className="ti ti-shield-check"
                        style={{ marginRight: 6, fontSize: 13, color: '#10b981' }}
                        title="موثّق"
                      />
                    )}
                  </td>

                  {/* الإنشاء */}
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>
                    {fmtDate(co.created_at)}
                  </td>

                  {/* Chevron */}
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
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} شركة)
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
        <CompanyDrawer
          company={selected}
          onClose={refresh => {
            setSelected(null);
            if (refresh) refetch();
          }}
        />
      )}
    </div>
  );
}
