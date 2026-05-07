// ════════════════════════════════════════════════
// pages/admin/AdminCompaniesPage.tsx
// إدارة كاملة للشركات — بدون سياق slug
// ════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useAdminCompanies, useAdminCompanyMutations, useAdminCompanyUsers } from '@/hooks/useAdmin';
import type { AdminCompany, AdminUser } from '@/lib/api/admin';
import { adminApi } from '@/lib/api/admin';

// ── helpers ───────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};
const PLANS = ['starter', 'professional', 'enterprise', 'custom'];

function statusBadge(co: AdminCompany) {
  if (co.is_suspended) return { label: 'موقوف', color: '#ef4444', bg: '#ef44441a' };
  if (!co.is_active)   return { label: 'غير نشط', color: '#6b7280', bg: '#6b72801a' };
  return                      { label: 'نشط',     color: '#10b981', bg: '#10b9811a' };
}

// ── Company Detail Drawer ─────────────────────────────────────────────
function CompanyDrawer({ company, onClose }: { company: AdminCompany; onClose: () => void }) {
  const muts = useAdminCompanyMutations();
  const { data: usersData } = useAdminCompanyUsers(company.id);
  const [tab, setTab] = useState<'info' | 'users' | 'plan' | 'notes'>('info');
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [notes, setNotes] = useState(company.notes ?? '');
  const [planForm, setPlanForm] = useState({ plan: company.plan, max_users: company.max_users, max_products: company.max_products, max_warehouses: company.max_warehouses });

  const st = statusBadge(company);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    await muts.suspend.mutateAsync({ id: company.id, reason: suspendReason });
    setShowSuspendForm(false);
    onClose();
  };

  const handlePlanSave = async () => {
    await muts.changePlan.mutateAsync({ id: company.id, ...planForm });
  };

  const handleNotesSave = async () => {
    await muts.updateNotes.mutateAsync({ id: company.id, notes });
  };

  const drawerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', justifyContent: 'flex-end',
    background: 'rgba(0,0,0,.4)',
    direction: 'rtl',
  };
  const panelStyle: React.CSSProperties = {
    width: 480, background: 'var(--bg1)', display: 'flex', flexDirection: 'column',
    boxShadow: '-4px 0 20px rgba(0,0,0,.15)',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
    borderBottom: active ? '2px solid var(--em)' : '2px solid transparent',
    background: 'transparent', color: active ? 'var(--em)' : 'var(--tx1)',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={drawerStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panelStyle}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx0)' }}>{company.name}</div>
            <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>/{company.slug}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--tx2)', lineHeight: 1 }}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--bd0)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {company.is_suspended ? (
            <Btn icon="ti-player-play" label="رفع التعليق" color="#10b981"
              onClick={() => { muts.unsuspend.mutate(company.id); onClose(); }} />
          ) : (
            <Btn icon="ti-ban" label="تعليق" color="#ef4444"
              onClick={() => setShowSuspendForm(v => !v)} />
          )}
          {company.is_active
            ? <Btn icon="ti-toggle-left" label="إيقاف" color="#f59e0b" onClick={() => { muts.deactivate.mutate(company.id); onClose(); }} />
            : <Btn icon="ti-toggle-right" label="تفعيل" color="#10b981" onClick={() => { muts.activate.mutate(company.id); onClose(); }} />
          }
          {company.verified_at
            ? <Btn icon="ti-shield-x" label="إلغاء التوثيق" color="#6b7280" onClick={() => { muts.unverify.mutate(company.id); onClose(); }} />
            : <Btn icon="ti-shield-check" label="توثيق" color="#0ea5e9" onClick={() => { muts.verify.mutate(company.id); onClose(); }} />
          }
          <Btn icon="ti-trash" label="حذف" color="#ef4444"
            onClick={() => { if (confirm('تأكيد حذف الشركة؟')) { muts.deleteCompany.mutate(company.id); onClose(); } }} />
        </div>

        {/* Suspend form */}
        {showSuspendForm && (
          <div style={{ padding: '12px 20px', background: '#ef44440d', borderBottom: '1px solid var(--bd0)' }}>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="سبب التعليق (مطلوب)"
              rows={2}
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--bd0)', padding: '8px 10px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg1)', color: 'var(--tx0)' }}
            />
            <button
              onClick={handleSuspend}
              style={{ marginTop: 8, padding: '6px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              تأكيد التعليق
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bd0)', padding: '0 12px' }}>
          {(['info', 'users', 'plan', 'notes'] as const).map(t => (
            <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
              {t === 'info' ? 'المعلومات' : t === 'users' ? 'المستخدمون' : t === 'plan' ? 'الخطة' : 'ملاحظات'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

          {/* INFO */}
          {tab === 'info' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['المالك', company.owner?.name ?? '—'],
                ['البريد', company.email],
                ['الهاتف', company.phone ?? '—'],
                ['العنوان', company.address ?? '—'],
                ['الخطة', PLAN_LABELS[company.plan] ?? company.plan],
                ['الحد الأقصى للمستخدمين', `${company.users_count} / ${company.max_users}`],
                ['الحد الأقصى للمنتجات', company.max_products],
                ['الحد الأقصى للمخازن', company.max_warehouses],
                ['التوثيق', company.verified_at ? `✓ موثق` : 'غير موثق'],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--bd0)' }}>
                  <span style={{ width: 140, fontSize: 12, color: 'var(--tx2)', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--tx0)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>
                {usersData?.data?.length ?? 0} مستخدم في هذه الشركة
              </div>
              {usersData?.data?.map((u: AdminUser) => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--bd0)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--em-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--em)', flexShrink: 0,
                  }}>{u.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--tx0)', fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{u.email}</div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: u.is_active ? '#10b9811a' : '#ef44441a',
                    color: u.is_active ? '#10b981' : '#ef4444',
                  }}>{u.is_active ? 'نشط' : 'معطل'}</span>
                </div>
              ))}
              {(!usersData?.data || usersData.data.length === 0) && (
                <div style={{ textAlign: 'center', color: 'var(--tx2)', fontSize: 13, paddingTop: 24 }}>
                  لا يوجد مستخدمون
                </div>
              )}
            </div>
          )}

          {/* PLAN */}
          {tab === 'plan' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6 }}>الخطة</label>
                <select
                  value={planForm.plan}
                  onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}
                >
                  {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                </select>
              </div>
              {[
                { key: 'max_users',      label: 'الحد الأقصى للمستخدمين' },
                { key: 'max_products',   label: 'الحد الأقصى للمنتجات' },
                { key: 'max_warehouses', label: 'الحد الأقصى للمخازن' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--tx2)', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input
                    type="number" min={1}
                    value={(planForm as any)[key]}
                    onChange={e => setPlanForm(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <button
                onClick={handlePlanSave}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--em)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                حفظ التغييرات
              </button>
            </div>
          )}

          {/* NOTES */}
          {tab === 'notes' && (
            <div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={8}
                placeholder="ملاحظات خاصة بهذه الشركة..."
                style={{ width: '100%', borderRadius: 8, border: '1px solid var(--bd0)', padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg1)', color: 'var(--tx0)' }}
              />
              <button
                onClick={handleNotesSave}
                style={{ marginTop: 10, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--em)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                حفظ الملاحظات
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// small reusable button
function Btn({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
        border: `1px solid ${color}33`, background: `${color}0d`, color, cursor: 'pointer', fontSize: 12,
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
      {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function AdminCompaniesPage() {
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [plan, setPlan]         = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  const params = useMemo(() => ({
    search: search || undefined,
    status: status || undefined,
    plan:   plan   || undefined,
    page,
    per_page: 20,
  }), [search, status, plan, page]);

  const { data, isLoading, isFetching } = useAdminCompanies(params);
  const companies = data?.data ?? [];
  const meta      = data?.meta;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx0)', margin: 0 }}>الشركات</h1>
          <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>
            {meta?.total ?? 0} شركة في المنصة
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="بحث باسم الشركة أو البريد..."
          style={{ flex: '1 1 220px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}
        >
          <option value="">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="suspended">موقوفة</option>
          <option value="inactive">غير نشطة</option>
          <option value="verified">موثقة</option>
        </select>
        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', color: 'var(--tx0)', fontSize: 13 }}
        >
          <option value="">كل الخطط</option>
          {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
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
                {['الشركة', 'المالك', 'الخطة', 'المستخدمون', 'الحالة', 'التوثيق', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--tx2)', fontWeight: 500, borderBottom: '1px solid var(--bd0)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(co => {
                const st = statusBadge(co);
                return (
                  <tr key={co.id} style={{ borderBottom: '1px solid var(--bd0)', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg0)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: 'var(--em-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'var(--em)', flexShrink: 0,
                        }}>{co.name[0]}</div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--tx0)' }}>{co.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>/{co.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--tx1)' }}>{co.owner?.name ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: (PLAN_COLORS[co.plan] ?? '#6b7280') + '1a', color: PLAN_COLORS[co.plan] ?? '#6b7280' }}>
                        {PLAN_LABELS[co.plan] ?? co.plan}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--tx1)' }}>{co.users_count} / {co.max_users}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {co.verified_at
                        ? <span style={{ color: '#10b981', fontSize: 12 }}><i className="ti ti-shield-check" /> موثق</span>
                        : <span style={{ color: 'var(--tx2)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => setSelected(co)}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--tx1)' }}
                      >
                        إدارة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {companies.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)', fontSize: 14 }}>
            <i className="ti ti-building-off" style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: .4 }} />
            لا توجد شركات مطابقة
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', cursor: 'pointer', fontSize: 13, color: 'var(--tx1)' }}>
            ←
          </button>
          <span style={{ padding: '6px 16px', fontSize: 13, color: 'var(--tx1)' }}>
            {page} / {meta.last_page}
          </span>
          <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--bd0)', background: 'var(--bg1)', cursor: 'pointer', fontSize: 13, color: 'var(--tx1)' }}>
            →
          </button>
        </div>
      )}

      {/* Company Detail Drawer */}
      {selected && <CompanyDrawer company={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
