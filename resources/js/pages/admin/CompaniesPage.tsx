// ════════════════════════════════════════════════════════════
// pages/admin/CompaniesPage.tsx
// إدارة الشركات — Super Admin
// يستخدم: Card, Badge, Button, PageHeader, AlertBar,
//          EmptyState, KpiCard, Switch, SearchInput
//          + CompanyFormDrawer (مكوّن جديد)
// ════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';

// ── UI Components (موجودة لديك) ──────────────────────────
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import PageHeader   from '@/components/ui/PageHeader';
import AlertBar     from '@/components/ui/AlertBar';
import EmptyState   from '@/components/ui/EmptyState';
import KpiCard      from '@/components/ui/KpiCard';
import SearchInput  from '@/components/ui/SearchInput';
import Switch       from '@/components/ui/Switch';

// ── Drawer جديد ───────────────────────────────────────────
import CompanyFormDrawer, { CompanyFormData } from '@/components/modals/CompanyFormDrawer';

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
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  is_active: boolean;
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
  created_at?: string;
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'deactivated' | 'trial' | 'verified';
type Tab = 'companies' | 'super';

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════
const AV_COLORS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#0d7a8c,#22d3ee)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];
const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];
const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'Starter',
  professional: 'Professional', enterprise: 'Enterprise',
};
const PLAN_COLORS: Record<string, { color: string; bg: string }> = {
  free:         { color: 'var(--t4)',     bg: 'var(--bg4)' },
  starter:      { color: 'var(--blue)',   bg: 'var(--blueb)' },
  professional: { color: 'var(--em)',     bg: 'var(--emb)' },
  enterprise:   { color: 'var(--gold)',   bg: 'var(--goldb)' },
};

function statusInfo(co: Company): { label: string; color: string; bg: string; dot?: boolean } {
  if (co.is_suspended)       return { label: 'معلّقة',  color: 'var(--red)',    bg: 'var(--redb)',  dot: true };
  if (!co.is_active)         return { label: 'موقوفة',  color: 'var(--t4)',     bg: 'var(--bg4)' };
  if (co.is_on_trial)        return { label: `تجريبية · ${co.trial_days_remaining ?? '?'} يوم`, color: 'var(--gold)', bg: 'var(--goldb)' };
  if (co.is_verified)        return { label: 'موثّقة',  color: 'var(--em)',     bg: 'var(--emb)',   dot: true };
  return                            { label: 'نشطة',    color: 'var(--blue)',   bg: 'var(--blueb)', dot: true };
}

function companyToForm(co: Company): CompanyFormData {
  return {
    id: co.id, slug: co.slug,
    name: co.name, commercial_name: co.commercial_name ?? '',
    email: co.email ?? '', phone: co.phone ?? '', mobile: co.mobile ?? '',
    address: co.address ?? '', activity: co.activity ?? '',
    nif: co.nif ?? '', nis: co.nis ?? '', rc: co.rc ?? '', ai: co.ai ?? '',
    plan: co.plan, max_users: co.max_users,
    max_products: co.max_products, max_warehouses: co.max_warehouses,
    notes: co.notes ?? '', is_active: co.is_active,
  };
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

/** Avatar الشركة */
function CompanyAvatar({ name, id, size = 44 }: { name: string; id: number; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: avColor(id), display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.35, fontWeight: 900,
      color: '#fff', letterSpacing: -1,
    }}>
      {initials(name)}
    </div>
  );
}

/** صف شركة في الجدول */
function CompanyRow({
  co, onEdit, onSuspend, onVerify, onDelete, loading,
}: {
  co: Company;
  onEdit: () => void;
  onSuspend: () => void;
  onVerify: () => void;
  onDelete: () => void;
  loading?: boolean;
}) {
  const si = statusInfo(co);
  const pc = PLAN_COLORS[co.plan] ?? PLAN_COLORS.free;

  return (
    <div
      className="u-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 140px',
        padding: '13px 18px',
        borderBottom: '1px solid var(--b1)',
        background: 'var(--bg2)',
        transition: '.13s',
        alignItems: 'center',
        direction: 'rtl',
      }}
    >
      {/* الشركة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <CompanyAvatar name={co.name} id={co.id} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            {co.name}
            {co.is_verified && (
              <i className="ti ti-rosette-discount-check" style={{ color: 'var(--em)', fontSize: 14 }} />
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace', marginTop: 1 }}>
            {co.slug}
            {co.owner && <span style={{ marginRight: 8 }}>· {co.owner.name}</span>}
          </div>
        </div>
      </div>

      {/* البريد / الهاتف */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {co.email && (
          <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {co.email}
          </div>
        )}
        {co.phone && (
          <div style={{ fontSize: 10, color: 'var(--t4)', direction: 'ltr' }}>{co.phone}</div>
        )}
      </div>

      {/* الخطة */}
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          color: pc.color, background: pc.bg,
        }}>
          {PLAN_LABELS[co.plan] ?? co.plan}
        </span>
      </div>

      {/* الحالة */}
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          color: si.color, background: si.bg,
        }}>
          {si.dot && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: si.color, display: 'inline-block' }} />
          )}
          {si.label}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        {/* تعديل */}
        <button
          onClick={onEdit}
          title="تعديل"
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className="ti ti-pencil" style={{ fontSize: 13 }} />
        </button>

        {/* تعليق / رفع */}
        <button
          onClick={onSuspend}
          title={co.is_suspended ? 'رفع التعليق' : 'تعليق مؤقت'}
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--goldb)', 'var(--gold)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className={`ti ti-${co.is_suspended ? 'lock-open' : 'lock'}`} style={{ fontSize: 13 }} />
        </button>

        {/* توثيق */}
        <button
          onClick={onVerify}
          title={co.is_verified ? 'إلغاء التوثيق' : 'توثيق'}
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className={`ti ti-${co.is_verified ? 'rosette-discount-check' : 'rosette'}`} style={{ fontSize: 13 }} />
        </button>

        {/* حذف */}
        <button
          onClick={onDelete}
          title="تعطيل"
          disabled={loading}
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--redb)', 'var(--red)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className="ti ti-trash" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}

// style helpers
const actionBtn = (): React.CSSProperties => ({
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--t3)', transition: '.13s',
  flexShrink: 0,
});
const hoverBtn = (e: React.MouseEvent, bg: string, color: string) => {
  (e.currentTarget as HTMLButtonElement).style.background = bg;
  (e.currentTarget as HTMLButtonElement).style.color = color;
};

// ════════════════════════════════════════════════════════════
// Super Admin Tab — إعدادات حرجة
// ════════════════════════════════════════════════════════════
function SuperAdminTab() {
  const [settings, setSettings] = useState({
    registrations: true,
    new_companies: true,
    notifications: true,
    debug: false,
    public_api: true,
    free_trial_days: 14,
    free_max_users: 3,
    starter_max_products: 2000,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (k: keyof typeof settings) =>
    setSettings(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSave = () => {
    // TODO: apiClient.post('/admin/settings', settings)
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideIn .2s ease' }}>

      {/* تحذير */}
      <AlertBar variant="red">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} />
          <span>هذه الإعدادات تؤثر على كامل النظام — تصرف بحذر</span>
        </div>
      </AlertBar>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* إدارة النظام */}
        <Card title="إدارة النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              { key: 'registrations',  label: 'تسجيل مستخدمين جدد',   icon: 'ti-user-plus' },
              { key: 'new_companies',  label: 'إنشاء شركات جديدة',     icon: 'ti-building-plus' },
              { key: 'notifications',  label: 'نظام الإشعارات',        icon: 'ti-bell' },
              { key: 'debug',          label: 'وضع التصحيح (Debug)',    icon: 'ti-bug' },
              { key: 'public_api',     label: 'API العام',              icon: 'ti-api' },
            ] as { key: keyof typeof settings; label: string; icon: string }[]).map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 0', borderBottom: '1px solid var(--b1)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`ti ${item.icon}`} style={{ color: 'var(--em)', fontSize: 14 }} />
                  {item.label}
                </span>
                <Switch
                  checked={settings[item.key] as boolean}
                  onChange={() => toggle(item.key)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* إعدادات الخطط */}
        <Card title="الخطط الافتراضية" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'free_trial_days',       label: 'مدة التجربة المجانية (أيام)', min: 1, max: 90 },
              { key: 'free_max_users',         label: 'حد المستخدمين — Free',        min: 1, max: 10 },
              { key: 'starter_max_products',   label: 'حد المنتجات — Starter',       min: 100, max: 9999 },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 5 }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={settings[f.key as keyof typeof settings] as number}
                  onChange={e => setSettings(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: '1px solid var(--b3)', background: 'var(--bg3)',
                    color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif', fontSize: 13,
                    outline: 'none', direction: 'ltr',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              style={{
                padding: '9px', borderRadius: 10, border: 'none',
                background: saved ? 'var(--emb)' : 'var(--em)',
                color: saved ? 'var(--em)' : '#fff',
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif', transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <i className={`ti ti-${saved ? 'check' : 'device-floppy'}`} />
              {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </Card>

        {/* عمليات النظام */}
        <Card title="عمليات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'مسح الكاش العام',           icon: 'ti-refresh',        color: 'var(--em)',   bg: 'var(--emb)',    action: () => alert('تم مسح الكاش') },
              { label: 'تشغيل المهام المجدولة',      icon: 'ti-clock-play',     color: 'var(--blue)', bg: 'var(--blueb)',  action: () => alert('تم تشغيل المهام') },
              { label: 'تصدير ملفات اللوج',          icon: 'ti-download',       color: 'var(--blue)', bg: 'var(--blueb)',  action: () => alert('جارٍ التصدير...') },
              { label: 'نسخ احتياطي فوري',           icon: 'ti-database-export',color: 'var(--gold)', bg: 'var(--goldb)',  action: () => alert('النسخة تُنشأ...') },
              { label: 'إرسال إشعار لكل المستخدمين', icon: 'ti-speakerphone',   color: 'var(--gold)', bg: 'var(--goldb)',  action: () => alert('تم الإرسال') },
              { label: 'تفعيل وضع الصيانة',          icon: 'ti-alert-triangle', color: 'var(--red)',  bg: 'var(--redb)',   action: () => confirm('تفعيل وضع الصيانة؟') && alert('وضع الصيانة مفعّل') },
            ].map(op => (
              <button
                key={op.label}
                onClick={op.action}
                style={{
                  padding: '10px 14px', borderRadius: 10, width: '100%',
                  border: `1px solid ${op.bg}`, background: op.bg,
                  color: op.color, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 9,
                  transition: '.13s', textAlign: 'right',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <i className={`ti ${op.icon}`} style={{ fontSize: 15, flexShrink: 0 }} />
                {op.label}
              </button>
            ))}
          </div>
        </Card>

        {/* إحصائيات النظام */}
        <Card title="إحصائيات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'إجمالي المستخدمين',   value: '—', icon: 'ti-users' },
              { label: 'إجمالي الفواتير',      value: '—', icon: 'ti-file-invoice' },
              { label: 'إجمالي المنتجات',      value: '—', icon: 'ti-package' },
              { label: 'محاولات الدخول اليوم', value: '—', icon: 'ti-login' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg3)', border: '1px solid var(--b1)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'var(--emb)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: 'var(--em)', flexShrink: 0,
                }}>
                  <i className={`ti ${s.icon}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{s.value}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center', marginTop: 4 }}>
              للإحصائيات الحية — اربط endpoint <code>/admin/stats</code>
            </div>
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
  const isSuperAdmin: boolean = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  const [tab, setTab]                   = useState<Tab>('companies');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch]             = useState('');
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<CompanyFormData | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const { data: companies = [], isLoading, isError, refetch } = useQuery<Company[]>({
    queryKey: ['companies', statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '100', include: 'owner' };
      if (search)             params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  const verify = useMutation({
    mutationFn: ({ slug, verified }: { slug: string; verified: boolean }) =>
      verified
        ? apiClient.post(`/companies/${slug}/unverify`)
        : apiClient.post(`/companies/${slug}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  const destroy = useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/companies/${slug}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  // ── Open drawer ────────────────────────────────────────────
  const openAdd  = () => { setEditTarget(null);              setDrawerOpen(true); };
  const openEdit = useCallback((co: Company) => { setEditTarget(companyToForm(co)); setDrawerOpen(true); }, []);

  // ── KPIs ───────────────────────────────────────────────────
  const total      = companies.length;
  const active     = companies.filter(c => c.is_operational).length;
  const suspended  = companies.filter(c => c.is_suspended).length;
  const onTrial    = companies.filter(c => c.is_on_trial).length;

  // ── Status filter buttons ──────────────────────────────────
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
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .u-row:hover { background: var(--bg3) !important; }
      `}</style>

      <div className="page on" style={{ animation: 'slideIn .25s ease' }}>

        {/* ── Header ── */}
        <PageHeader
          title="إدارة الشركات"
          subtitle={`${total} شركة · ${active} نشطة · ${suspended} معلّقة`}
          actions={
            tab === 'companies' ? (
              <Button
                variant="primary"
                icon={<i className="ti ti-building-plus" />}
                onClick={openAdd}
              >
                شركة جديدة
              </Button>
            ) : undefined
          }
        />

        {/* ── KPIs ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 10, marginBottom: 22,
        }}>
          <KpiCard
            label="إجمالي الشركات"
            value={total}
            icon="ti-building"
            color="var(--em)"
            bg="var(--emb)"
          />
          <KpiCard
            label="نشطة"
            value={active}
            icon="ti-check"
            color="var(--blue)"
            bg="var(--blueb)"
          />
          <KpiCard
            label="معلّقة"
            value={suspended}
            icon="ti-lock"
            color="var(--red)"
            bg="var(--redb)"
          />
          <KpiCard
            label="تجريبية"
            value={onTrial}
            icon="ti-clock"
            color="var(--gold)"
            bg="var(--goldb)"
          />
        </div>

        {/* ── Main Tabs ── */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--b2)',
          marginBottom: 20, gap: 0, overflowX: 'auto',
        }}>
          {([
            { key: 'companies', label: 'الشركات',             icon: 'ti-building',  count: total },
            { key: 'super',     label: 'إعدادات Super Admin', icon: 'ti-star',      count: null },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
                color: tab === t.key ? 'var(--em)' : 'var(--t4)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                whiteSpace: 'nowrap',
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
              {t.label}
              {t.count !== null && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 800,
                  background: tab === t.key ? 'var(--emb)' : 'var(--bg4)',
                  color: tab === t.key ? 'var(--em)' : 'var(--t4)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: COMPANIES ══════════ */}
        {tab === 'companies' && (
          <div style={{ animation: 'slideIn .2s ease' }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="بحث بالاسم، البريد، NIF..."
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                      background: statusFilter === f.key ? 'var(--em)' : 'var(--bg3)',
                      border: `1px solid ${statusFilter === f.key ? 'var(--em)' : 'var(--b2)'}`,
                      color: statusFilter === f.key ? '#fff' : 'var(--t3)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {isError && (
              <AlertBar variant="red">
                فشل تحميل الشركات.{' '}
                <button
                  onClick={() => refetch()}
                  style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                >
                  إعادة المحاولة
                </button>
              </AlertBar>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="empty">
                <div className="empty-ic"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /></div>
                <div className="empty-tx">جارٍ تحميل الشركات...</div>
              </div>
            )}

            {/* Empty */}
            {!isLoading && companies.length === 0 && (
              <EmptyState icon="ti-building" text="لا توجد شركات" sub="أضف شركتك الأولى" />
            )}

            {/* Table */}
            {!isLoading && companies.length > 0 && (
              <Card padding={0}>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 140px',
                  padding: '10px 18px', borderBottom: '1px solid var(--b2)',
                  background: 'var(--bg3)', direction: 'rtl',
                }}>
                  {['الشركة', 'التواصل', 'الخطة', 'الحالة', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>
                      {h}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {companies.map((co, i) => (
                  <CompanyRow
                    key={co.id}
                    co={co}
                    onEdit={() => openEdit(co)}
                    onSuspend={() => suspend.mutate({ slug: co.slug, suspended: co.is_suspended })}
                    onVerify={() => verify.mutate({ slug: co.slug, verified: co.is_verified })}
                    onDelete={() => {
                      if (confirm(`تعطيل شركة "${co.name}"؟`)) destroy.mutate(co.slug);
                    }}
                    loading={destroy.isPending}
                  />
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ══════════ TAB: SUPER ADMIN ══════════ */}
        {tab === 'super' && <SuperAdminTab />}

      </div>

      {/* ── Drawer ── */}
      <CompanyFormDrawer
        open={drawerOpen}
        company={editTarget}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['companies'] })}
      />
    </>
  );
}
