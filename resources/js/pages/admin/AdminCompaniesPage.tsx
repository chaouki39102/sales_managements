// ════════════════════════════════════════════════
// pages/admin/AdminCompaniesPage.tsx — النسخة الكاملة
// ════════════════════════════════════════════════
import { useState, useMemo, useCallback } from 'react';
import { useAdminCompanies, useAdminCompanyMutations, useAdminCompanyUsers } from '@/hooks/useAdmin';
import { adminApi } from '@/lib/api/admin';
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
  const muts = useAdminCompanyMutations();
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

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } =
    useAdminCompanyUsers(co.id, tab === 'users');

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
